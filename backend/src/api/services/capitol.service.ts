/**
 * Capitol — one read model for the rebuilt Politics screens.
 *
 * GET /politics/capitol returns everything the new UI shows (nation,
 * parliament, government, cabinet, polls, laws, bills, districts, news and the
 * player's own career) in one request, so the page needs no fan-out of calls.
 * Read-only: it never writes, except that the current election cycle row is
 * created lazily by getOrCreateCurrentCycle, as every other politics endpoint does.
 */
import { LADDER as WORLD_LADDER, CareerRung } from '../constants/worldStage';
import { careerRung } from './worldStage.rules';
import { latestWorldRank } from './agency.service';
import { BACKGROUNDS_BY_KEY } from '../constants/characterCreation';
import { db } from '../../config/database';
import { POLICY_CATALOG, MECHANISM_BASE_ROLLOUT } from '../constants/macroEconomy';
import {
  POL_CAMPAIGN_WINDOW_MONTHS, POL_FILING_WINDOW_MONTHS, getMajorityForState, getSeatsForState, AP_MONTHLY_GRANT, AP_BANK_CAP,
} from '../constants/politics';
import { CABINET_POSTS, POLL_HISTORY_MONTHS, portfolioPostFor, PRIVATE_BILL_AP_EXTRA, headOfGovernmentTitle, nationRules } from '../constants/nations';
import { AP_COST_BILL_MODERATE } from '../constants/politics';
import { getCurrentWorldArc, getOrCreateCurrentCycle } from './politics.service';
import {
  billTitle, liveApproval, getGovernment, getLawsInForce, nationFor, parsePlatform,
  projectElection, optionAlignment, pollParties,
} from './statecraft.service';
import { getNationalPolicyMultipliers, readNationalStatsFromRow } from './nationalEconomy.service';
import { safeParseJSON } from '../../utils/json';
import { billVotePlan, loadVoteShared } from './floor.service';
import { currentPolStateCode } from './playerNation';

const LADDER = WORLD_LADDER.map(r => r.key);
type Rung = CareerRung;

function num(v: any, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

export async function getCapitol(userId: string | null, stateCodeOrId?: string) {
  const state = stateCodeOrId
    ? await db('pol_states').where({ code: stateCodeOrId }).orWhereRaw('id::text = ?', [stateCodeOrId]).first()
    : await db('pol_states').where({ code: currentPolStateCode() }).first() ?? await db('pol_states').where({ is_active: true }).first();
  if (!state) return null;

  const nation = nationFor(state);
  const stats = readNationalStatsFromRow(state);
  const seatsTotal = nation?.legislature.seats ?? getSeatsForState(state.code);
  const majority = nation?.legislature.majority ?? getMajorityForState(state.code);

  // Independent lookups load side by side (each is a round trip to the database).
  const [arc, cycle, partyRows, gov, laws, premierRow, postRows, live, activeRows, billRows, myChar, districtRows, news] = await Promise.all([
    getCurrentWorldArc(),
    getOrCreateCurrentCycle(state.id),
    db('pol_parties').where({ state_id: state.id }),
    getGovernment(db, state.id),
    getLawsInForce(db, state.id),
    db('pol_offices').where({ state_id: state.id, office: 'premier' }).orderBy('since_arc', 'desc').first(),
    db('pol_cabinet_posts').where({ state_id: state.id }),
    liveApproval(db, state),
    db('pol_active_policies').where({ state_id: state.id, is_active: true }),
    db('pol_bills').where({ state_id: state.id }).orderBy('proposed_arc', 'desc').orderBy('id').limit(30),
    userId ? db('characters').where({ user_id: userId, status: 'active' }).first() : Promise.resolve(null),
    db('pol_constituencies').where({ state_id: state.id, is_active: true }).orderBy('name'),
    db('pol_ledger_events').where({ state_id: state.id }).orderBy('arc', 'desc').limit(15).select('id', 'arc', 'kind', 'headline', 'body'),
  ]);
  const govSet = new Set(gov.memberPartyIds);

  // ── Parties ──
  const partyIds = partyRows.map((p: any) => p.id);
  const leaderIds = partyRows.map((p: any) => p.leader_character_id).filter(Boolean);
  const ministerIds = postRows.map((r: any) => r.holder_character_id).filter(Boolean);
  const [identities, memberCounts, leaders, holder, ministerChars, historyRows, seatRows, voteShared] = await Promise.all([
    partyIds.length ? db('pol_party_identities').whereIn('party_id', partyIds) : Promise.resolve([]),
    partyIds.length ? db('pol_party_members').whereIn('party_id', partyIds).select('party_id').count('* as n').groupBy('party_id') : Promise.resolve([]),
    leaderIds.length ? db('characters').whereIn('id', leaderIds).select('id', 'name', 'credibility') : Promise.resolve([]),
    premierRow?.holder_character_id ? db('characters').where({ id: premierRow.holder_character_id }).first() : Promise.resolve(null),
    ministerIds.length ? db('characters').whereIn('id', ministerIds).select('id', 'name') : Promise.resolve([]),
    db('pol_poll_snapshots').where({ state_id: state.id }).where('arc', '>', arc - POLL_HISTORY_MONTHS).orderBy('arc', 'asc'),
    gov.sittingCycleId
      ? db('pol_council_seats').where({ cycle_id: gov.sittingCycleId }).select('constituency_id', 'party_id').count('* as n').groupBy('constituency_id', 'party_id')
      : Promise.resolve([]),
    loadVoteShared(db, state.id, gov, laws, partyRows),
  ]);
  const idBy = new Map<string, any>(identities.map((i: any) => [i.party_id, i]));
  const membersBy = new Map<string, number>((memberCounts as any[]).map((r: any) => [r.party_id, num(r.n)]));
  const leaderBy = new Map<string, any>(leaders.map((c: any) => [c.id, c]));

  const parties = partyRows.map((p: any) => {
    const ident = idBy.get(p.id);
    const platform = parsePlatform(p.platform);
    const leader = p.leader_character_id ? leaderBy.get(p.leader_character_id) : null;
    return {
      id: p.id,
      name: p.name,
      abbreviation: p.abbreviation || ident?.monogram || p.name.slice(0, 3).toUpperCase(),
      color: ident?.color || p.color_hex || '#7A8594',
      motto: ident?.motto || p.slogan || null,
      blurb: ident?.blurb || null,
      leaderName: leader?.name || ident?.leader || null,
      isNpc: !!p.is_npc,
      platform,
      // Left-right position for seating in the chamber: high labour / low tax = left.
      lean: Math.round(((100 - platform.taxation) + platform.labour + platform.investment - platform.trade) / 4),
      seats: gov.seatsByParty[p.id] || 0,
      members: membersBy.get(p.id) || 0,
      inGovernment: govSet.has(p.id),
      leadsGovernment: gov.leadPartyId === p.id,
      treasury: num(p.treasury),
    };
  }).sort((a: any, b: any) => b.lean - a.lean);

  const partyById = new Map<string, any>(parties.map((p: any) => [p.id, p]));

  // ── Executive ──
  let premier: any = null;
  if (premierRow) {
    const party = partyById.get(premierRow.party_id);
    premier = {
      name: holder?.name || party?.leaderName || 'Acting Premier',
      characterId: holder?.id || null,
      isPlayer: !!holder,
      partyId: premierRow.party_id,
      since: premierRow.since_arc,
    };
  }

  const postBy = new Map<string, any>(postRows.map((r: any) => [r.post_key, r]));
  const ministerBy = new Map<string, any>(ministerChars.map((c: any) => [c.id, c]));
  const cabinet = CABINET_POSTS.map(post => {
    const row = postBy.get(post.key);
    const ch = row?.holder_character_id ? ministerBy.get(row.holder_character_id) : null;
    return {
      key: post.key,
      title: post.title,
      short: post.short,
      blurb: post.blurb,
      portfolio: post.portfolio.map(id => ({ id, name: POLICY_CATALOG.find(c => c.id === id)?.name ?? id })),
      holderName: row ? (ch?.name || row.npc_name || 'Vacant') : null,
      characterId: ch?.id || null,
      isPlayer: !!ch,
      partyId: row?.party_id || null,
      since: row?.appointed_arc ?? null,
    };
  });

  // ── Polls & approval ──
  const approvalNow = live.approval;
  type PollPoint = { arc: number; shares: Record<string, number>; seats: Record<string, number>; approval: number | null };
  const historyByArc = new Map<number, PollPoint>();
  for (const r of historyRows as any[]) {
    const h: PollPoint = historyByArc.get(r.arc) ?? { arc: r.arc, shares: {}, seats: {}, approval: null };
    if (r.party_id) { h.shares[r.party_id] = num(r.vote_share); h.seats[r.party_id] = num(r.projected_seats); }
    else h.approval = r.approval == null ? null : num(r.approval);
    historyByArc.set(r.arc, h);
  }
  const history = [...historyByArc.values()].sort((a, b) => a.arc - b.arc);
  let latest = history.length ? history[history.length - 1] : null;
  let pollIsLive = false;
  if (!latest || Object.keys(latest.shares).length === 0) {
    // No poll recorded yet (new world): run one now so the page is never empty.
    const districts = await db('pol_constituencies').where({ state_id: state.id, is_active: true });
    if (districts.length && partyRows.length) {
      const proj = projectElection(await pollParties(db, state.id, partyRows), districts, stats, govSet, approvalNow);
      latest = { arc, shares: proj.shares, seats: proj.seats, approval: approvalNow };
      pollIsLive = true;
    }
  }

  // ── Laws ──
  const activeBy = new Map<string, any>(activeRows.map((r: any) => [r.category, r]));
  const lawBook = POLICY_CATALOG.map(cat => {
    const currentId = laws[cat.id];
    const active = activeBy.get(cat.id);
    const post = portfolioPostFor(cat.id);
    return {
      id: cat.id,
      name: cat.name,
      mechanism: cat.mechanism,
      rolloutMonths: MECHANISM_BASE_ROLLOUT[cat.mechanism],
      ministry: post ? { key: post.key, short: post.short } : null,
      currentOptionId: currentId,
      enactedArc: active?.enacted_month ?? null,
      options: cat.options.map(o => ({
        id: o.id,
        name: o.name,
        tags: o.tags,
        effects: o.effects,
        // Which parties would favour this option over the current law (for the "who backs it" hint).
        supporters: o.id === currentId ? [] : parties
          .filter((p: any) => p.seats > 0)
          .filter((p: any) => optionAlignment(p.platform, o) - (findCurrent(cat.id, currentId) ? optionAlignment(p.platform, findCurrent(cat.id, currentId)!) : 0) > 0)
          .map((p: any) => p.id),
      })),
    };
  });
  let businessEffects = null;
  try { businessEffects = await getNationalPolicyMultipliers(db, state.country_id); } catch { /* optional */ }

  // ── Bills ──
  const leaderParty = new Map<string, string>(partyRows.filter((p: any) => p.leader_character_id).map((p: any) => [p.leader_character_id, p.id]));
  let me: any = null;

  const rules = nationRules(state.code);
  // Bills are independent of each other: build them side by side (order kept).
  const bills = await Promise.all(billRows.map(async (b: any) => {
    const params = typeof b.params === 'string' ? safeParseJSON(b.params) : (b.params ?? {});
    const votes = await db('pol_bill_votes').where({ bill_id: b.id });
    const tally = { yea: 0, nay: 0 };
    let partyVotes: Record<string, string | undefined> = {};
    let lineSource: Record<string, string> = {};
    let byParty: Record<string, { yea: number; nay: number; rebels: number }> = {};
    let rebels = num(b.rebel_count);
    if (b.status === 'proposed') {
      // The same rule the monthly tick uses to count the real vote.
      const plan = await billVotePlan(db, b, voteShared);
      partyVotes = plan.partyLine;
      lineSource = plan.lineSource;
      byParty = plan.tally.byParty;
      tally.yea = plan.tally.yea;
      tally.nay = plan.tally.nay;
      rebels = plan.tally.rebels;
    } else {
      for (const v of votes) {
        const pid = leaderParty.get(v.character_id);
        if (pid) partyVotes[pid] = v.vote;
      }
      tally.yea = num(b.yea_seats);
      tally.nay = num(b.nay_seats);
    }
    const proposer = partyById.get(b.proposed_by_party_id);
    return {
      id: b.id,
      title: params?.category ? billTitle(params.category, params.option) : String(b.type).replace(/_/g, ' '),
      category: params?.category ?? null,
      option: params?.option ?? null,
      currentOptionId: params?.category ? laws[params.category] : null,
      status: b.status,
      proposedArc: b.proposed_arc,
      resolvedArc: b.resolved_arc ?? null,
      proposer: proposer ? { id: proposer.id, name: proposer.name, color: proposer.color, abbreviation: proposer.abbreviation } : null,
      fromGovernment: govSet.has(b.proposed_by_party_id),
      partyVotes,
      lineSource,
      byParty,
      rebels,
      tally,
      projectedPass: tally.yea - tally.nay >= rules.passMargin,
      myVote: myChar ? votes.find((v: any) => v.character_id === myChar.id)?.vote ?? null : null,
    };
  }));

  // ── Districts ──
  const seatsByDistrict = new Map<string, Record<string, number>>();
  for (const r of seatRows as any[]) {
    const key = String(r.constituency_id);
    const m = seatsByDistrict.get(key) ?? {};
    m[String(r.party_id)] = num(r.n);
    seatsByDistrict.set(key, m);
  }
  const districts = districtRows.map((d: any) => ({
    id: d.id,
    name: d.name,
    region: d.region,
    seats: num(d.seats, 1),
    voters: num(d.registered_voters),
    sitting: seatsByDistrict.get(d.id) ?? {},
  }));

  // ── Me ──
  if (myChar) {
    const [membership, mySeat, myCandidacy, apRow, fin, worldRank] = await Promise.all([
      db('pol_party_members').where({ character_id: myChar.id }).first(),
      gov.sittingCycleId ? db('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: myChar.id }).first() : Promise.resolve(null),
      db('pol_candidates').where({ cycle_id: cycle.id, character_id: myChar.id }).first(),
      db('pol_character_ap').where({ character_id: myChar.id }).first(),
      db('character_finances').where({ character_id: myChar.id }).first(),
      latestWorldRank(db, myChar.id),
    ]);
    const myParty = membership ? partyById.get(membership.party_id) : null;
    const myPost = cabinet.find(c => c.characterId === myChar.id) ?? null;
    const isPremier = premier?.characterId === myChar.id;

    const inGov = !!myParty && govSet.has(myParty.id);
    const partySeated = !!myParty && (gov.seatsByParty[myParty.id] || 0) > 0;
    const rung: Rung = careerRung({
      hasParty: !!membership, isCandidate: !!myCandidacy, hasSeat: !!mySeat,
      leadsSeatedParty: membership?.role === 'leader' && partySeated, isMinister: !!myPost, isHead: isPremier,
      worldRank: worldRank?.rank ?? null,
    });
    me = {
      characterId: myChar.id,
      name: myChar.name,
      credibility: num(myChar.credibility),
      influence: num(myChar.influence),
      charisma: num(myChar.charisma),
      background: BACKGROUNDS_BY_KEY[myChar.background]
        ? { key: myChar.background, label: BACKGROUNDS_BY_KEY[myChar.background].label, edge: BACKGROUNDS_BY_KEY[myChar.background].edge, homeGroup: BACKGROUNDS_BY_KEY[myChar.background].homeGroup }
        : null,
      convictions: myChar.convictions ? (typeof myChar.convictions === 'string' ? JSON.parse(myChar.convictions) : myChar.convictions) : null,
      cash: fin ? num(fin.cash_in_hand) : null,
      ap: apRow ? { current: num(apRow.current_ap), cap: num(apRow.ap_cap) } : { current: AP_MONTHLY_GRANT, cap: AP_BANK_CAP },
      party: myParty ? { id: myParty.id, name: myParty.name, color: myParty.color, role: membership.role, seats: myParty.seats, inGovernment: inGov } : null,
      seatDistrict: mySeat?.constituency_id ? districts.find((d: any) => d.id === mySeat.constituency_id)?.name ?? null : null,
      candidacyDistrict: myCandidacy?.constituency_id ? districts.find((d: any) => d.id === myCandidacy.constituency_id)?.name ?? null : null,
      office: isPremier ? headOfGovernmentTitle(state.code) : myPost?.title ?? null,
      rung,
      ladder: LADDER,
      worldRank,
      canTableBill: partySeated && !!gov.leadPartyId,
      hasSeat: !!mySeat,
      voteMode: (membership?.role === 'leader' && partySeated) ? 'line' : (mySeat ? 'seat' : null),
      tableBillApCost: AP_COST_BILL_MODERATE + (inGov ? 0 : PRIVATE_BILL_AP_EXTRA),
      isPartyLeader: membership?.role === 'leader',
      // Human members of governing parties the Premier can appoint (only sent to the Premier).
      eligibleMinisters: isPremier && gov.memberPartyIds.length
        ? (await db('pol_party_members')
            .join('characters', 'characters.id', 'pol_party_members.character_id')
            .whereIn('pol_party_members.party_id', gov.memberPartyIds)
            .whereNot('characters.id', myChar.id)
            .select('characters.id', 'characters.name', 'characters.credibility', 'pol_party_members.party_id'))
            .map((c: any) => ({ id: c.id, name: c.name, credibility: num(c.credibility), partyId: c.party_id }))
        : [],
      nextGoal: nextGoal(rung, cycle.phase, cycle.polling_arc - arc, inGov),
    };
  }

  const filingArc = cycle.polling_arc - POL_CAMPAIGN_WINDOW_MONTHS - POL_FILING_WINDOW_MONTHS;
  const campaignArc = cycle.polling_arc - POL_CAMPAIGN_WINDOW_MONTHS;

  return {
    nation: nation ? {
      officialName: nation.officialName, shortName: nation.shortName, demonym: nation.demonym,
      government: nation.government, capital: nation.capital, motto: nation.motto, currency: nation.currency,
      flag: nation.flag, headOfState: nation.headOfState, headOfGovernment: nation.headOfGovernment,
      legislature: nation.legislature, constitution: nation.constitution, regions: nation.regions,
      culture: nation.culture ?? null, traits: nation.traits ?? [], rules: nationRules(state.code),
    } : { officialName: state.name, shortName: state.name, legislature: { name: state.name, seats: seatsTotal, majority } },
    state: {
      id: state.id, code: state.code,
      // From the districts when the nation has a constitution (the pol_states columns are old defaults).
      population: districtRows.length ? districtRows.reduce((a: number, d: any) => a + num(d.population), 0) : num(state.raw_population || state.population),
      registeredVoters: districtRows.length ? districtRows.reduce((a: number, d: any) => a + num(d.registered_voters), 0) : num(state.registered_voters),
    },
    stats,
    approval: { current: latest?.approval ?? approvalNow, live: approvalNow, fromStats: live.fromStats, economy: live.economy },
    calendar: {
      arc,
      phase: cycle.phase,
      cycleNumber: cycle.cycle_number,
      electionArc: cycle.polling_arc,
      filingArc,
      campaignArc,
      formationEndArc: cycle.formation_end_arc,
      monthsToElection: Math.max(0, cycle.polling_arc - arc),
    },
    parliament: {
      name: nation?.legislature.name ?? state.name,
      seats: seatsTotal,
      majority,
      filled: Object.values(gov.seatsByParty).reduce((a, b) => a + b, 0),
      government: gov.leadPartyId ? {
        type: gov.coalitionStatus === 'minority' ? 'minority' : (gov.memberPartyIds.length > 1 ? 'coalition' : 'majority'),
        leadPartyId: gov.leadPartyId,
        memberPartyIds: gov.memberPartyIds,
        seats: gov.memberPartyIds.reduce((a, id) => a + (gov.seatsByParty[id] || 0), 0),
      } : null,
    },
    parties,
    premier,
    cabinet,
    polls: { latest, history, live: pollIsLive },
    laws: lawBook,
    businessEffects,
    bills,
    districts,
    news,
    me,
  };
}

function findCurrent(categoryId: string, optionId: string) {
  return POLICY_CATALOG.find(c => c.id === categoryId)?.options.find(o => o.id === optionId);
}

function nextGoal(rung: Rung, phase: string, monthsToElection: number, inGov: boolean): string {
  switch (rung) {
    case 'citizen': return 'Join a party, or found your own, to enter politics.';
    case 'member':
      if (phase === 'filing' || phase === 'campaign') return 'Candidates are being filed: stand for a district to win a seat.';
      return `The next election is in ${monthsToElection} month${monthsToElection === 1 ? '' : 's'}. Build credibility and funds, then stand for a district when filing opens.`;
    case 'candidate': return 'Campaign in your district. Seats are shared by vote share, so even 10-15% there can win one.';
    case 'mp': return inGov
      ? 'You sit on the government benches. Vote with your party and build credibility to be named a minister.'
      : 'Table bills from the opposition benches and win over voters before the next election.';
    case 'leader': return inGov
      ? 'Your party governs: your vote sets its line. Keep your partners happy and your word good.'
      : 'Your vote sets your party\'s line. Make deals, win seats, and make your party the one a government needs.';
    case 'minister': return 'Steer laws in your portfolio: you table them cheaper and government parties back them more readily.';
    case 'premier': return 'Lead the government: appoint your cabinet, pass your programme and keep approval up before polling day.';
    case 'statesman': return 'You are among the three most influential politicians in the world. Hold your place in the Meridian Wire\'s Index.';
  }
}
