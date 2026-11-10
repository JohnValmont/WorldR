/**
 * Capitol — one read model for the rebuilt Politics screens.
 *
 * GET /politics/capitol returns everything the new UI shows (nation,
 * parliament, government, cabinet, polls, laws, bills, districts, news and the
 * player's own career) in one request, so the page needs no fan-out of calls.
 * Read-only: it never writes, except that the current election cycle row is
 * created lazily by getOrCreateCurrentCycle, as every other politics endpoint does.
 */
import { db } from '../../config/database';
import { POLICY_CATALOG, MECHANISM_BASE_ROLLOUT } from '../constants/macroEconomy';
import {
  POL_CAMPAIGN_WINDOW_MONTHS, POL_FILING_WINDOW_MONTHS, getMajorityForState, getSeatsForState, AP_MONTHLY_GRANT,
} from '../constants/politics';
import { CABINET_POSTS, POLL_HISTORY_MONTHS, portfolioPostFor, PRIVATE_BILL_AP_EXTRA } from '../constants/nations';
import { AP_COST_BILL_MODERATE } from '../constants/politics';
import { getCurrentWorldArc, getOrCreateCurrentCycle } from './politics.service';
import {
  billTitle, computeApproval, getGovernment, getLawsInForce, nationFor, parsePlatform,
  projectElection, projectPartyVotes, optionAlignment, pollParties,
} from './statecraft.service';
import { getNationalPolicyMultipliers, readNationalStatsFromRow } from './nationalEconomy.service';
import { safeParseJSON } from '../../utils/json';

const LADDER = ['citizen', 'member', 'candidate', 'mp', 'minister', 'premier'] as const;
type Rung = typeof LADDER[number];

function num(v: any, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

export async function getCapitol(userId: string | null, stateCodeOrId?: string) {
  const state = stateCodeOrId
    ? await db('pol_states').where({ code: stateCodeOrId }).orWhereRaw('id::text = ?', [stateCodeOrId]).first()
    : await db('pol_states').where({ code: 'national' }).first() ?? await db('pol_states').where({ is_active: true }).first();
  if (!state) return null;

  const nation = nationFor(state);
  const arc = await getCurrentWorldArc();
  const cycle = await getOrCreateCurrentCycle(state.id);
  const stats = readNationalStatsFromRow(state);
  const seatsTotal = nation?.legislature.seats ?? getSeatsForState(state.code);
  const majority = nation?.legislature.majority ?? getMajorityForState(state.code);

  // ── Parties ──
  const partyRows = await db('pol_parties').where({ state_id: state.id });
  const identities = partyRows.length
    ? await db('pol_party_identities').whereIn('party_id', partyRows.map((p: any) => p.id))
    : [];
  const idBy = new Map<string, any>(identities.map((i: any) => [i.party_id, i]));
  const memberCounts = partyRows.length
    ? await db('pol_party_members').whereIn('party_id', partyRows.map((p: any) => p.id)).select('party_id').count('* as n').groupBy('party_id')
    : [];
  const membersBy = new Map<string, number>(memberCounts.map((r: any) => [r.party_id, num(r.n)]));
  const leaderIds = partyRows.map((p: any) => p.leader_character_id).filter(Boolean);
  const leaders = leaderIds.length ? await db('characters').whereIn('id', leaderIds).select('id', 'name', 'credibility') : [];
  const leaderBy = new Map<string, any>(leaders.map((c: any) => [c.id, c]));

  const gov = await getGovernment(db, state.id);
  const govSet = new Set(gov.memberPartyIds);

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
  const premierRow = await db('pol_offices').where({ state_id: state.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
  let premier: any = null;
  if (premierRow) {
    const holder = premierRow.holder_character_id ? await db('characters').where({ id: premierRow.holder_character_id }).first() : null;
    const party = partyById.get(premierRow.party_id);
    premier = {
      name: holder?.name || party?.leaderName || 'Acting Premier',
      characterId: holder?.id || null,
      isPlayer: !!holder,
      partyId: premierRow.party_id,
      since: premierRow.since_arc,
    };
  }

  const postRows = await db('pol_cabinet_posts').where({ state_id: state.id });
  const postBy = new Map<string, any>(postRows.map((r: any) => [r.post_key, r]));
  const ministerIds = postRows.map((r: any) => r.holder_character_id).filter(Boolean);
  const ministerChars = ministerIds.length ? await db('characters').whereIn('id', ministerIds).select('id', 'name') : [];
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
  const approvalNow = computeApproval(stats);
  const historyRows = await db('pol_poll_snapshots')
    .where({ state_id: state.id })
    .where('arc', '>', arc - POLL_HISTORY_MONTHS)
    .orderBy('arc', 'asc');
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
  const laws = await getLawsInForce(db, state.id);
  const activeRows = await db('pol_active_policies').where({ state_id: state.id, is_active: true });
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
  const billRows = await db('pol_bills').where({ state_id: state.id }).orderBy('proposed_arc', 'desc').orderBy('id').limit(30);
  const leaderParty = new Map<string, string>(partyRows.filter((p: any) => p.leader_character_id).map((p: any) => [p.leader_character_id, p.id]));
  let me: any = null;
  let myChar: any = null;
  if (userId) myChar = await db('characters').where({ user_id: userId, status: 'active' }).first();

  const bills = [];
  for (const b of billRows) {
    const params = typeof b.params === 'string' ? safeParseJSON(b.params) : (b.params ?? {});
    const votes = await db('pol_bill_votes').where({ bill_id: b.id });
    const voted = new Set<string>();
    const tally = { yea: 0, nay: 0 };
    const partyVotes: Record<string, string> = {};
    for (const v of votes) {
      const pid = leaderParty.get(v.character_id);
      if (!pid) continue;
      voted.add(pid);
      partyVotes[pid] = v.vote;
    }
    if (b.status === 'proposed') {
      const auto = await projectPartyVotes(db, b, partyRows, gov, laws, voted);
      Object.assign(partyVotes, auto);
    }
    if (b.status !== 'proposed' && b.yea_seats != null) {
      tally.yea = num(b.yea_seats);
      tally.nay = num(b.nay_seats);
    } else {
      for (const [pid, v] of Object.entries(partyVotes)) {
        const n = gov.seatsByParty[pid] || 0;
        if (v === 'yea') tally.yea += n; else if (v === 'nay') tally.nay += n;
      }
    }
    const proposer = partyById.get(b.proposed_by_party_id);
    bills.push({
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
      tally,
      projectedPass: tally.yea > tally.nay,
      myVote: myChar ? votes.find((v: any) => v.character_id === myChar.id)?.vote ?? null : null,
    });
  }

  // ── Districts ──
  const districtRows = await db('pol_constituencies').where({ state_id: state.id, is_active: true }).orderBy('name');
  const seatRows = gov.sittingCycleId
    ? await db('pol_council_seats').where({ cycle_id: gov.sittingCycleId }).select('constituency_id', 'party_id').count('* as n').groupBy('constituency_id', 'party_id')
    : [];
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

  // ── News ──
  const news = await db('pol_ledger_events').where({ state_id: state.id }).orderBy('arc', 'desc').limit(15)
    .select('id', 'arc', 'kind', 'headline', 'body');

  // ── Me ──
  if (myChar) {
    const membership = await db('pol_party_members').where({ character_id: myChar.id }).first();
    const myParty = membership ? partyById.get(membership.party_id) : null;
    const mySeat = gov.sittingCycleId
      ? await db('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: myChar.id }).first()
      : null;
    const myCandidacy = await db('pol_candidates').where({ cycle_id: cycle.id, character_id: myChar.id }).first();
    const myPost = cabinet.find(c => c.characterId === myChar.id) ?? null;
    const isPremier = premier?.characterId === myChar.id;
    const apRow = await db('pol_character_ap').where({ character_id: myChar.id }).first();
    const fin = await db('character_finances').where({ character_id: myChar.id }).first();

    let rung: Rung = 'citizen';
    if (membership) rung = 'member';
    if (myCandidacy) rung = 'candidate';
    if (mySeat) rung = 'mp';
    if (myPost) rung = 'minister';
    if (isPremier) rung = 'premier';

    const inGov = !!myParty && govSet.has(myParty.id);
    const partySeated = !!myParty && (gov.seatsByParty[myParty.id] || 0) > 0;
    me = {
      characterId: myChar.id,
      name: myChar.name,
      credibility: num(myChar.credibility),
      influence: num(myChar.influence),
      cash: fin ? num(fin.cash_in_hand) : null,
      ap: apRow ? { current: num(apRow.current_ap), cap: num(apRow.ap_cap) } : { current: AP_MONTHLY_GRANT, cap: AP_MONTHLY_GRANT },
      party: myParty ? { id: myParty.id, name: myParty.name, color: myParty.color, role: membership.role, seats: myParty.seats, inGovernment: inGov } : null,
      seatDistrict: mySeat?.constituency_id ? districts.find((d: any) => d.id === mySeat.constituency_id)?.name ?? null : null,
      candidacyDistrict: myCandidacy?.constituency_id ? districts.find((d: any) => d.id === myCandidacy.constituency_id)?.name ?? null : null,
      office: isPremier ? 'Premier' : myPost?.title ?? null,
      rung,
      ladder: LADDER,
      canTableBill: partySeated && !!gov.leadPartyId,
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
    } : { officialName: state.name, shortName: state.name, legislature: { name: state.name, seats: seatsTotal, majority } },
    state: {
      id: state.id, code: state.code,
      // From the districts when the nation has a constitution (the pol_states columns are old defaults).
      population: districtRows.length ? districtRows.reduce((a: number, d: any) => a + num(d.population), 0) : num(state.raw_population || state.population),
      registeredVoters: districtRows.length ? districtRows.reduce((a: number, d: any) => a + num(d.registered_voters), 0) : num(state.registered_voters),
    },
    stats,
    approval: { current: latest?.approval ?? approvalNow, live: approvalNow },
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
    case 'minister': return 'Steer laws in your portfolio: you table them cheaper and government parties back them more readily.';
    case 'premier': return 'Lead the government: appoint your cabinet, pass your programme and keep approval up before polling day.';
  }
}
