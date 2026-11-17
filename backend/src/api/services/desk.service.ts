/**
 * Desk — the one read model for the politics screens (docs/POLITICS_FLOOR.md).
 *
 * GET /politics/desk = everything in the Capitol read model, plus the player's
 * monthly hand of decisions, support with each voter group, deals and favours,
 * and the last election's district results.
 * It deals the month's hand on first load (idempotent, like the lazily created
 * election cycle); it changes nothing else.
 */
import { db } from '../../config/database';
import { PARTY_FOUNDING_COST, SEGMENTS } from '../constants/politics';
import {
  AD_AP, AD_COST, FUNDRAISE_AP, LEADERSHIP_AP, LEADERSHIP_MIN_TENURE_MONTHS, PACT_AP, PACT_CASH_PER_POINT, PACT_MAX_CASH,
  PARTY_SWITCH_COOLDOWN_MONTHS, RALLY_AP, SEGMENT_SHORT, SegmentKey,
} from '../constants/floor';
import { SITUATION_BY_KEY } from '../constants/situations';
import { safeParseJSON } from '../../utils/json';
import { getCapitol } from './capitol.service';
import {
  effectiveCost, ensureHand, forecastPact, getEnergy, playerPolitics, switchCooldownLeft,
} from './floor.service';
import {
  adGain, fundraiseTake, leadershipDecision, outcomeChances, rallyGain, renderText, SEGMENT_KEYS, supportTarget,
} from './floor.rules';
import { getSupportMap } from './support.store';
import { getGovernment, getLawsInForce, parsePlatform } from './statecraft.service';

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export async function getDesk(userId: string | null, stateCodeOrId?: string) {
  const cap: any = await getCapitol(userId, stateCodeOrId);
  if (!cap) return null;
  const stateId: string = cap.state.id;
  const arc: number = cap.calendar.arc;
  const partyRows = await db('pol_parties').where({ state_id: stateId });
  const gov = await getGovernment(db, stateId);
  const laws = await getLawsInForce(db, stateId);

  // ── Support with every voter group, for every party ──
  const supportMap = await getSupportMap(db, partyRows);
  const segments = SEGMENTS.map(s => ({ key: s.key, label: s.label, short: SEGMENT_SHORT[s.key as SegmentKey] ?? s.label, size: s.size }));
  const targets: Record<string, Record<string, number>> = {};
  for (const p of partyRows) {
    targets[p.id] = {};
    for (const k of SEGMENT_KEYS) targets[p.id][k] = Number(supportTarget(parsePlatform(p.platform), k).toFixed(1));
  }

  // ── Last election: district results for the replay ──
  let election: any = null;
  if (gov.sittingCycleId) {
    const cycle = await db('pol_cycles').where({ id: gov.sittingCycleId }).first();
    const rows = await db('pol_results')
      .join('pol_candidates', 'pol_candidates.id', 'pol_results.candidate_id')
      .where('pol_results.cycle_id', gov.sittingCycleId)
      .select('pol_candidates.constituency_id', 'pol_candidates.party_id')
      .sum({ votes: 'pol_results.votes' })
      .groupBy('pol_candidates.constituency_id', 'pol_candidates.party_id');
    const votesBy: Record<string, Record<string, number>> = {};
    for (const r of rows as any[]) (votesBy[r.constituency_id] ??= {})[r.party_id] = num(r.votes);
    const prev = await db('pol_cycles').where({ state_id: stateId }).where('cycle_number', '<', cycle.cycle_number).orderBy('cycle_number', 'desc').first();
    const prevSeats: Record<string, number> = {};
    if (prev) {
      const ps = await db('pol_council_seats').where({ cycle_id: prev.id }).select('party_id').count('* as n').groupBy('party_id');
      for (const r of ps as any[]) prevSeats[r.party_id] = num(r.n);
    }
    election = {
      cycleId: cycle.id,
      arc: cycle.polling_arc,
      hasResults: rows.length > 0,
      districts: cap.districts.map((d: any) => ({ id: d.id, name: d.name, region: d.region, seats: d.seats, votes: votesBy[d.id] ?? {}, won: d.sitting })),
      previousSeats: prevSeats,
    };
  }

  const rules = {
    partyFoundingCost: PARTY_FOUNDING_COST,
    rallyAp: RALLY_AP, adAp: AD_AP, adCost: AD_COST, fundraiseAp: FUNDRAISE_AP,
    pactAp: PACT_AP, pactMaxCash: PACT_MAX_CASH, pactCashPerPoint: PACT_CASH_PER_POINT,
    leadershipAp: LEADERSHIP_AP, switchCooldownMonths: PARTY_SWITCH_COOLDOWN_MONTHS,
  };

  const desk: any = {
    segments,
    support: supportMap,
    supportTargets: targets,
    election,
    rules,
    hand: [],
    actions: null,
    deals: null,
    partyRoom: null,
    log: [],
  };

  const character = userId ? await db('characters').where({ user_id: userId, status: 'active' }).first() : null;
  if (!character) return { ...cap, desk };

  const me = await playerPolitics(db, stateId, character, gov);
  const energy = await getEnergy(db, character.id, arc);
  cap.me.ap = energy;

  // ── This month's hand ──
  const openBill = cap.bills.find((b: any) => b.status === 'proposed');
  await db.transaction(trx => ensureHand(trx, me, {
    stateId, arc, phase: cap.calendar.phase, stats: cap.stats, approval: num(cap.approval.live, 50),
    monthsToElection: cap.calendar.monthsToElection, openBillTitle: openBill?.title ?? null,
    premierName: cap.premier?.name ?? null,
    districts: cap.districts.map((d: any) => ({ id: d.id, name: d.name })),
    parties: cap.parties.map((p: any) => ({ id: p.id, name: p.name, seats: p.seats })),
  }));
  const handRows = await db('pol_situations').where({ character_id: character.id, arc }).orderBy('slot');
  desk.hand = handRows.map((r: any) => {
    const card = SITUATION_BY_KEY[r.card_key];
    if (!card) return null;
    const vars = typeof r.vars === 'string' ? safeParseJSON(r.vars) : (r.vars ?? {});
    return {
      id: r.id,
      key: card.key,
      kicker: card.kicker,
      title: renderText(card.title, vars),
      body: renderText(card.body, vars),
      status: r.status,
      chosen: r.option_index,
      result: typeof r.outcome === 'string' ? safeParseJSON(r.outcome) : r.outcome,
      options: card.options.map(o => {
        const chances = outcomeChances(o);
        return {
          label: renderText(o.label, vars),
          cost: effectiveCost(me, o.cost),
          outcomes: o.outcomes.map((oc, i) => ({ chance: chances[i], tone: oc.tone, effects: oc.effects })),
        };
      }),
    };
  }).filter(Boolean);

  // ── Desk actions: what each would do right now ──
  if (me.party) {
    const counts = await db('pol_action_log').where({ character_id: character.id, arc }).select('kind', 'target').count('* as n').groupBy('kind', 'target');
    const countOf = (kind: string, target?: string) => (counts as any[])
      .filter(c => c.kind === kind && (target === undefined || c.target === target)).reduce((a, c) => a + num(c.n), 0);
    const mySupport = supportMap[me.party.id] ?? {};
    const avg = SEGMENT_KEYS.reduce((a, k) => a + num(mySupport[k], 50), 0) / SEGMENT_KEYS.length;
    const charisma = num(character.charisma);
    const fr = countOf('fundraise');
    desk.actions = {
      rally: {
        ap: RALLY_AP,
        gain: Object.fromEntries(SEGMENT_KEYS.map(k => [k, Number(rallyGain(charisma, countOf('rally', k), cap.calendar.phase).toFixed(1))])),
      },
      ad: { ap: AD_AP, cost: AD_COST, paidBy: me.isLeader ? 'party' : 'you', gain: Number(adGain(countOf('ad')).toFixed(1)) },
      fundraise: { ap: FUNDRAISE_AP, low: fundraiseTake(avg, charisma, fr, 0), high: fundraiseTake(avg, charisma, fr, 1) },
    };
  }

  // ── Deals: promises on bills and the favours they create ──
  if (me.party) {
    const partyName = new Map<string, string>(partyRows.map((p: any) => [p.id, p.name]));
    const billTitleBy = new Map<string, string>(cap.bills.map((b: any) => [b.id, b.title]));
    const pacts = await db('pol_pacts').where({ state_id: stateId })
      .where(function (this: any) { this.where({ from_party_id: me.party.id }).orWhere({ to_party_id: me.party.id }); })
      .orderBy('created_at', 'desc').limit(20);
    const favours = await db('pol_favours').where({ state_id: stateId })
      .where(function (this: any) { this.where({ holder_party_id: me.party.id }).orWhere({ debtor_party_id: me.party.id }); })
      .whereIn('status', ['pending', 'open', 'called', 'kept', 'broken'])
      .orderBy('created_arc', 'desc').limit(30);
    const seated = (gov.seatsByParty[me.party.id] || 0) > 0;
    const canDeal = me.isLeader && seated;
    const wordBrokenLeft = Math.max(0, num(me.party.word_broken_until_arc) - arc);

    // For each bill before Parliament: would each computer-run party take a deal?
    const forecasts: Record<string, Record<string, any>> = {};
    if (canDeal) {
      const openBills = await db('pol_bills').where({ state_id: stateId, status: 'proposed' });
      for (const bill of openBills) {
        forecasts[bill.id] = {};
        for (const p of partyRows) {
          if (p.id === me.party.id || !gov.seatsByParty[p.id]) continue;
          const live = pacts.find((x: any) => x.bill_id === bill.id && x.to_party_id === p.id && ['offered', 'accepted'].includes(x.status));
          const committed = await db('pol_pacts').where({ bill_id: bill.id, to_party_id: p.id, status: 'accepted' }).first()
            ?? await db('pol_favours').where({ called_bill_id: bill.id, debtor_party_id: p.id, status: 'called' }).first();
          const row: any = { human: !!p.leader_character_id, live: live?.status ?? null, committed: !!committed };
          if (!p.leader_character_id) {
            for (const v of ['yea', 'nay'] as const) {
              const d = await forecastPact(db, bill, me.party, p, v, 0, num(character.credibility), gov, laws, arc);
              row[v] = { accept: d.accept, score: Number(d.score.toFixed(3)), reason: d.reason };
            }
          }
          forecasts[bill.id][p.id] = row;
        }
      }
    }

    desk.deals = {
      canDeal,
      whyNot: canDeal ? null : !me.isLeader ? 'Only a party leader can promise the party\'s favours.' : 'Your party needs seats before its favours are worth anything.',
      wordBrokenLeft,
      forecasts,
      incoming: pacts.filter((x: any) => x.to_party_id === me.party.id && x.status === 'offered').map((x: any) => ({
        id: x.id, billId: x.bill_id, billTitle: billTitleBy.get(x.bill_id) ?? 'a bill', fromPartyId: x.from_party_id,
        fromName: partyName.get(x.from_party_id), askedVote: x.asked_vote, cash: num(x.cash),
      })),
      pacts: pacts.map((x: any) => ({
        id: x.id, billId: x.bill_id, billTitle: billTitleBy.get(x.bill_id) ?? 'a bill', fromPartyId: x.from_party_id, toPartyId: x.to_party_id,
        askedVote: x.asked_vote, cash: num(x.cash), status: x.status, arc: x.created_arc, mine: x.from_party_id === me.party.id,
      })),
      favoursHeld: favours.filter((f: any) => f.holder_party_id === me.party.id).map((f: any) => ({
        id: f.id, partyId: f.debtor_party_id, status: f.status, billId: f.called_bill_id, billTitle: f.called_bill_id ? billTitleBy.get(f.called_bill_id) ?? null : null,
        vote: f.called_vote, arc: f.created_arc,
      })),
      favoursOwed: favours.filter((f: any) => f.debtor_party_id === me.party.id).map((f: any) => ({
        id: f.id, partyId: f.holder_party_id, status: f.status, billId: f.called_bill_id, billTitle: f.called_bill_id ? billTitleBy.get(f.called_bill_id) ?? null : null,
        vote: f.called_vote, arc: f.created_arc,
      })),
    };
  }

  // ── Party room ──
  const cooldownLeft = await switchCooldownLeft(db, character.id, arc);
  if (me.party) {
    const members = await db('pol_party_members')
      .join('characters', 'characters.id', 'pol_party_members.character_id')
      .where('pol_party_members.party_id', me.party.id)
      .select('characters.id', 'characters.name', 'characters.credibility', 'characters.influence', 'pol_party_members.role');
    const seatIds = new Set<string>(gov.sittingCycleId
      ? (await db('pol_council_seats').where({ cycle_id: gov.sittingCycleId, party_id: me.party.id }).whereNotNull('character_id').select('character_id')).map((r: any) => r.character_id)
      : []);
    const leader = members.find((m: any) => m.id === me.party.leader_character_id) ?? null;
    const challenge = leadershipDecision(num(character.influence), !!leader, num(leader?.influence));
    const openCycle = await db('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
    const taken = openCycle
      ? (await db('pol_candidates').where({ cycle_id: openCycle.id, party_id: me.party.id }).whereNotNull('character_id').select('constituency_id')).map((r: any) => r.constituency_id)
      : [];
    desk.partyRoom = {
      cooldownLeft,
      leaderIsHuman: !!leader,
      leaderName: leader?.name ?? null,
      canChallenge: !me.isLeader,
      challengeWaitMonths: Math.max(0, LEADERSHIP_MIN_TENURE_MONTHS - (arc - num(me.membership?.joined_arc, arc))),
      challengeNeed: challenge.need,
      challengeWouldWin: challenge.win,
      funds: num(me.party.treasury),
      members: members.map((m: any) => ({
        id: m.id, name: m.name, role: m.role, trust: num(m.credibility), clout: num(m.influence), hasSeat: seatIds.has(m.id), isMe: m.id === character.id,
      })),
      districtsTaken: taken,
      canStand: !cap.me.candidacyDistrict && !['polling', 'formation'].includes(cap.calendar.phase),
    };
  } else {
    desk.partyRoom = { cooldownLeft };
  }

  desk.log = await db('pol_action_log').where({ character_id: character.id }).orderBy('created_at', 'desc').limit(12).select('arc', 'kind', 'summary');
  return { ...cap, desk };
}
