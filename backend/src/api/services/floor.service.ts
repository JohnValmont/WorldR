/**
 * The Floor — database side of the politics redesign (docs/POLITICS_FLOOR.md).
 *
 * Rules live in floor.rules.ts (pure, unit-tested). This file reads and writes
 * the database. Every function takes a knex transaction (`trx`) and never uses
 * the global connection, so it is safe inside the monthly politics tick.
 * It must NOT import politics.service.ts (which imports this file).
 */
import { homeGroupOf } from './character.rules';
import { AppError } from '../../utils/errors';
import { safeParseJSON } from '../../utils/json';
import { AP_BANK_CAP, AP_MONTHLY_GRANT, SEGMENTS } from '../constants/politics';
import {
  AD_AP, AD_COST, FUNDRAISE_AP, HAND_REPEAT_COOLDOWN_MONTHS, HAND_SIZE, LAW_FAILED_PROPOSER_SHARE, LAW_OPPONENT_SHARE,
  FAVOUR_CALL_MIN_LEAN, LEADERSHIP_AP, LEADERSHIP_FAIL_CLOUT, LEADERSHIP_MIN_TENURE_MONTHS, PACT_AP, PACT_MAX_CASH, PARTY_SWITCH_COOLDOWN_MONTHS, RALLY_AP,
  REBEL_CLOUT, REBEL_TRUST, SHOCK_MONTHS, WORD_BROKEN_MONTHS, WORD_BROKEN_SUPPORT, WORD_BROKEN_TRUST,
  WORD_KEPT_CLOUT, WORD_KEPT_TRUST, HANDSHAKE_AP, HANDSHAKE_BROKEN_CLOUT, HANDSHAKE_BROKEN_TRUST, HANDSHAKE_KEPT_TRUST,
  HANDSHAKE_MAX_CASH, HANDSHAKE_MAX_OPEN, HANDSHAKE_NOTE_MAX, LEADERSHIP_MIN_CLOUT, LEADERSHIP_MARGIN,
  CONTEST_MONTHS, CONTEST_BALLOT_WEIGHT, CONTEST_MP_BALLOT_MULT, CONTEST_DEPOSED_CLOUT,
} from '../constants/floor';
import { DEFAULT_LAWS, getNationForPolState, headOfGovernmentTitle, localisePlaces, nationRules } from '../constants/nations';
import { DECREE_AP, DECREE_BY_KEY } from '../constants/decrees';
import { CardCost, Effects, Role, SITUATION_BY_KEY } from '../constants/situations';
import {
  adGain, dealHand, DealContext, driftSupport, fundraiseTake, lawSupportDeltas, leadershipDecision,
  pactDecision, PactDecision, pickOutcome, rallyGain, renderText, SEGMENT_KEYS, supportTarget,
  tallyBill, TallyResult, Vote, countedVoteOf, judgePromise,
} from './floor.rules';
import { addSupport, ensureSupport, getSupportMap } from './support.store';
import { notify, notifyMany } from './notices.service';
import { contestResult } from './worldStage.rules';
import {
  billTitle, changeDesirability, GovernmentInfo, parsePlatform, partyVoteScore, projectPartyVotes, seededUnit,
} from './statecraft.service';

/** The pol_states.code for a state id (to look up that nation's rules). */
async function codeOf(trx: any, stateId: string): Promise<string | null> {
  return (await trx('pol_states').where({ id: stateId }).select('code').first())?.code ?? null;
}

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const parseParams = (b: any) => (typeof b?.params === 'string' ? safeParseJSON(b.params) : (b?.params ?? {})) || {};

// ═══════════════════════════════ ENERGY (AP) ═══════════════════════════════

/** The player's energy row, created on first use and refreshed if the month has moved on. */
export async function getEnergy(trx: any, characterId: string, arc: number): Promise<{ current: number; cap: number }> {
  let row = await trx('pol_character_ap').where({ character_id: characterId }).first();
  if (!row) {
    [row] = await trx('pol_character_ap')
      .insert({ character_id: characterId, current_ap: AP_MONTHLY_GRANT, ap_cap: AP_BANK_CAP, last_regen_arc: arc })
      .onConflict('character_id').ignore()
      .returning('*');
    if (!row) row = await trx('pol_character_ap').where({ character_id: characterId }).first();
  }
  return { current: num(row.current_ap), cap: Math.max(num(row.ap_cap), AP_BANK_CAP) };
}

export async function spendEnergy(trx: any, characterId: string, cost: number, arc: number): Promise<void> {
  if (cost <= 0) return;
  const e = await getEnergy(trx, characterId, arc);
  if (e.current < cost) throw new AppError(`Not enough energy: this needs ${cost}, you have ${e.current}. Each month adds 12 more.`, 400, 'INSUFFICIENT_AP');
  await trx('pol_character_ap').where({ character_id: characterId }).decrement('current_ap', cost);
}

// ═══════════════════════════════ SUPPORT ═══════════════════════════════

async function driftSupportForState(trx: any, stateId: string, arc: number): Promise<void> {
  const parties = await trx('pol_parties').where({ state_id: stateId }).select('id', 'platform');
  const rows = parties.length ? await trx('pol_support').whereIn('party_id', parties.map((p: any) => p.id)) : [];
  const platformBy = new Map<string, any>(parties.map((p: any) => [p.id, parsePlatform(p.platform)]));
  for (const r of rows) {
    const target = supportTarget(platformBy.get(r.party_id), r.segment_key);
    const next = Number(driftSupport(num(r.score, 50), target).toFixed(2));
    if (next !== num(r.score)) {
      await trx('pol_support').where({ party_id: r.party_id, segment_key: r.segment_key }).update({ score: next });
    }
  }
}

// ═══════════════════════════════ VOTES ═══════════════════════════════

export type LineSource = 'leader' | 'pact' | 'favour' | 'pressure' | 'ideology';
export interface BillVotePlan {
  partyLine: Record<string, Vote | undefined>;
  lineSource: Record<string, LineSource>;
  personal: { characterId: string; partyId: string; vote: Vote }[];
  tally: TallyResult;
}
export interface VoteShared {
  parties: any[];
  gov: GovernmentInfo;
  laws: Record<string, string>;
  /** Seats in the sitting parliament held by human players. */
  humanSeats: { character_id: string; party_id: string }[];
}

export async function loadVoteShared(trx: any, stateId: string, gov: GovernmentInfo, laws: Record<string, string>, parties?: any[]): Promise<VoteShared> {
  const allParties = parties ?? await trx('pol_parties').where({ state_id: stateId });
  const humanSeats = gov.sittingCycleId
    ? await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId }).whereNotNull('character_id').select('character_id', 'party_id')
    : [];
  return { parties: allParties, gov, laws, humanSeats };
}

/**
 * How Parliament would vote on a bill right now. Used both to count the real
 * vote (monthly tick) and to show the whip count beforehand, so the screen
 * always predicts what will actually happen.
 *
 * A party's line is, in order: its human leader's vote; a promise it made on
 * this bill (pact, or a favour called in); otherwise its ideology.
 * MPs who hold a seat and are not the leader may cast their own vote.
 */
export async function billVotePlan(trx: any, bill: any, shared: VoteShared): Promise<BillVotePlan> {
  const votes = await trx('pol_bill_votes').where({ bill_id: bill.id });
  const voteBy = new Map<string, Vote>(votes.map((v: any) => [v.character_id, v.vote]));
  const pressured = new Set<string>();
  const overrides: Record<string, Vote> = typeof bill.coercion_vote_overrides === 'string'
    ? (safeParseJSON(bill.coercion_vote_overrides) ?? {})
    : (bill.coercion_vote_overrides ?? {});
  for (const [charId, v] of Object.entries(overrides)) {
    if (!voteBy.has(charId)) { voteBy.set(charId, v); pressured.add(charId); }
  }

  const pacts = await trx('pol_pacts').where({ bill_id: bill.id, status: 'accepted' });
  const favours = await trx('pol_favours').where({ called_bill_id: bill.id, status: 'called' });

  const partyLine: Record<string, Vote | undefined> = {};
  const lineSource: Record<string, LineSource> = {};
  const leaderOf = new Map<string, string>();
  for (const p of shared.parties) {
    if (p.leader_character_id) leaderOf.set(p.id, p.leader_character_id);
    if (!shared.gov.seatsByParty[p.id]) continue;
    const leaderVote = p.leader_character_id ? voteBy.get(p.leader_character_id) : undefined;
    if (leaderVote) {
      partyLine[p.id] = leaderVote;
      lineSource[p.id] = pressured.has(p.leader_character_id) ? 'pressure' : 'leader';
      continue;
    }
    const pact = pacts.find((x: any) => x.to_party_id === p.id);
    if (pact) { partyLine[p.id] = pact.asked_vote; lineSource[p.id] = 'pact'; continue; }
    const fav = favours.find((x: any) => x.debtor_party_id === p.id);
    if (fav) { partyLine[p.id] = fav.called_vote; lineSource[p.id] = 'favour'; continue; }
  }
  const auto = await projectPartyVotes(trx, bill, shared.parties, shared.gov, shared.laws, new Set(Object.keys(partyLine)));
  for (const [pid, v] of Object.entries(auto)) { partyLine[pid] = v; lineSource[pid] = 'ideology'; }

  const personal: BillVotePlan['personal'] = [];
  for (const s of shared.humanSeats) {
    if (leaderOf.get(s.party_id) === s.character_id) continue;
    const v = voteBy.get(s.character_id);
    if (v) personal.push({ characterId: s.character_id, partyId: s.party_id, vote: v });
  }
  const tally = tallyBill({ seatsByParty: shared.gov.seatsByParty, partyLine, personalVotes: personal });
  return { partyLine, lineSource, personal, tally };
}

async function bumpCharacter(trx: any, characterId: string | null | undefined, delta: { trust?: number; clout?: number }): Promise<void> {
  if (!characterId) return;
  const upd: any = {};
  if (delta.trust) upd.credibility = trx.raw('GREATEST(0, LEAST(100, credibility + ?))', [Math.round(delta.trust)]);
  if (delta.clout) upd.influence = trx.raw('GREATEST(0, LEAST(100, influence + ?))', [Math.round(delta.clout)]);
  if (Object.keys(upd).length) await trx('characters').where({ id: characterId }).update(upd);
}

async function breakWord(trx: any, stateId: string, party: any, toName: string, title: string, arc: number): Promise<void> {
  await bumpCharacter(trx, party.leader_character_id, { trust: WORD_BROKEN_TRUST });
  await addSupport(trx, party.id, { all: WORD_BROKEN_SUPPORT }, arc);
  await trx('pol_parties').where({ id: party.id }).update({ word_broken_until_arc: arc + WORD_BROKEN_MONTHS });
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'word_broken',
    headline: `${party.name} breaks its word to ${toName}`,
    body: `${party.name} promised its votes on "${title}" and did not deliver. Other parties will be slow to trust it again.`,
  });
}

/**
 * Everything that follows from a vote besides the law itself: rebels are
 * noted, promises are marked kept or broken, and voters react to the result.
 * `laws` must be the law book as it stood BEFORE this bill took effect.
 */
export async function settleBillPolitics(trx: any, bill: any, plan: BillVotePlan, passed: boolean, arc: number, shared: VoteShared): Promise<void> {
  const params = parseParams(bill);
  const title = params?.category ? billTitle(params.category, params.option) : String(bill.type).replace(/_/g, ' ');
  const partyById = new Map<string, any>(shared.parties.map((p: any) => [p.id, p]));

  // 1. Rebels: MPs who voted against their own party's line.
  let rebels = 0;
  for (const v of plan.personal) {
    const line = plan.partyLine[v.partyId];
    if (!line || v.vote === line) continue;
    rebels++;
    await bumpCharacter(trx, v.characterId, { trust: REBEL_TRUST, clout: REBEL_CLOUT });
    const ch = await trx('characters').where({ id: v.characterId }).select('name').first();
    await trx('pol_ledger_events').insert({
      state_id: bill.state_id, arc, kind: 'rebel_vote',
      headline: `${ch?.name ?? 'An MP'} defies the ${partyById.get(v.partyId)?.name ?? 'party'} whip`,
      body: `${ch?.name ?? 'An MP'} voted ${v.vote === 'yea' ? 'for' : 'against'} "${title}" against the party line.`,
    });
  }
  if (rebels) await trx('pol_bills').where({ id: bill.id }).update({ rebel_count: rebels });

  // 2. Pacts on this bill.
  await trx('pol_pacts').where({ bill_id: bill.id, status: 'offered' }).update({ status: 'expired', resolved_arc: arc });
  const pacts = await trx('pol_pacts').where({ bill_id: bill.id, status: 'accepted' });
  for (const pact of pacts) {
    const promiser = partyById.get(pact.to_party_id);
    const asker = partyById.get(pact.from_party_id);
    const kept = plan.partyLine[pact.to_party_id] === pact.asked_vote;
    await trx('pol_pacts').where({ id: pact.id }).update({ status: kept ? 'kept' : 'broken', resolved_arc: arc });
    await trx('pol_favours').where({ origin_pact_id: pact.id, status: 'pending' }).update({ status: kept ? 'open' : 'void' });
    if (kept) {
      await bumpCharacter(trx, promiser?.leader_character_id, { trust: WORD_KEPT_TRUST, clout: WORD_KEPT_CLOUT });
      await bumpCharacter(trx, asker?.leader_character_id, { clout: WORD_KEPT_CLOUT });
    } else if (promiser) {
      await breakWord(trx, bill.state_id, promiser, asker?.name ?? 'its partner', title, arc);
    }
  }

  // 3. Favours called in on this bill.
  const favours = await trx('pol_favours').where({ called_bill_id: bill.id, status: 'called' });
  for (const fav of favours) {
    const debtor = partyById.get(fav.debtor_party_id);
    const holder = partyById.get(fav.holder_party_id);
    const kept = plan.partyLine[fav.debtor_party_id] === fav.called_vote;
    await trx('pol_favours').where({ id: fav.id }).update({ status: kept ? 'kept' : 'broken', resolved_arc: arc });
    if (kept) {
      await bumpCharacter(trx, debtor?.leader_character_id, { trust: WORD_KEPT_TRUST });
      if (debtor && holder) {
        await trx('pol_ledger_events').insert({
          state_id: bill.state_id, arc, kind: 'favour_repaid',
          headline: `${debtor.name} repays its debt to ${holder.name}`,
          body: `${debtor.name} voted as ${holder.name} asked on "${title}". The favour is settled.`,
        });
      }
    } else if (debtor) {
      await breakWord(trx, bill.state_id, debtor, holder?.name ?? 'its creditor', title, arc);
    }
  }

  // 4. Personal handshakes that turned on this bill.
  await settleHandshakes(trx, bill, plan, shared, title, arc);

  // 5. Voters react to the law.
  if (bill.type === 'policy_change' && params?.category && params?.option) {
    const current = shared.laws[params.category] ?? DEFAULT_LAWS[params.category];
    const deltas = lawSupportDeltas(params.category, current, params.option);
    if (passed) {
      for (const [partyId, row] of Object.entries(plan.tally.byParty)) {
        const seats = row.yea + row.nay;
        if (seats <= 0) continue;
        const net = (row.yea - row.nay) / seats;
        const factor = net >= 0 ? net : net * LAW_OPPONENT_SHARE;
        if (!factor) continue;
        const scaled: Record<string, number> = {};
        for (const [seg, d] of Object.entries(deltas)) scaled[seg] = d * factor;
        await addSupport(trx, partyId, scaled, arc);
      }
    } else if (bill.proposed_by_party_id) {
      const scaled: Record<string, number> = {};
      for (const [seg, d] of Object.entries(deltas)) scaled[seg] = Math.max(0, d) * LAW_FAILED_PROPOSER_SHARE;
      await addSupport(trx, bill.proposed_by_party_id, scaled, arc);
    }
  }
}

/** Is this party already bound by a promise on this bill? */
async function partyObligation(trx: any, billId: string, partyId: string): Promise<{ vote: Vote; kind: 'pact' | 'favour' } | null> {
  const pact = await trx('pol_pacts').where({ bill_id: billId, to_party_id: partyId, status: 'accepted' }).first();
  if (pact) return { vote: pact.asked_vote, kind: 'pact' };
  const fav = await trx('pol_favours').where({ called_bill_id: billId, debtor_party_id: partyId, status: 'called' }).first();
  if (fav) return { vote: fav.called_vote, kind: 'favour' };
  return null;
}

/**
 * Computer-run parties call in the favours they are owed. On any bill before
 * Parliament that such a party cares about (its own, or one it strongly likes
 * or dislikes), it demands the votes of a party that owes it a favour and is
 * set to vote the other way. Nobody can be made to vote down their own bill.
 */
export async function npcCallFavours(trx: any, stateId: string, arc: number, gov: GovernmentInfo, laws: Record<string, string>): Promise<number> {
  const open = await trx('pol_favours').where({ state_id: stateId, status: 'open' }).where('created_arc', '<', arc);
  if (!open.length) return 0;
  const shared = await loadVoteShared(trx, stateId, gov, laws);
  const partyById = new Map<string, any>(shared.parties.map((p: any) => [p.id, p]));
  const bills = await trx('pol_bills').where({ state_id: stateId, status: 'proposed' });
  let called = 0;
  for (const bill of bills) {
    const params = parseParams(bill);
    if (!params?.category || !params?.option) continue;
    const plan = await billVotePlan(trx, bill, shared);
    const busy = new Set<string>();
    for (const fav of open) {
      if (fav.status !== 'open') continue;
      const holder = partyById.get(fav.holder_party_id);
      const debtor = partyById.get(fav.debtor_party_id);
      if (!holder || !debtor || holder.leader_character_id) continue; // human leaders call their own favours
      if (busy.has(debtor.id) || !gov.seatsByParty[debtor.id]) continue;
      const lean = partyVoteScore({
        desirability: changeDesirability(parsePlatform(holder.platform), params.category, laws[params.category] ?? DEFAULT_LAWS[params.category], params.option),
        voterInGovernment: gov.memberPartyIds.includes(holder.id),
        billFromGovernment: gov.memberPartyIds.includes(bill.proposed_by_party_id),
        ownBill: bill.proposed_by_party_id === holder.id,
      });
      if (Math.abs(lean) < FAVOUR_CALL_MIN_LEAN) continue;
      const want: Vote = lean > 0 ? 'yea' : 'nay';
      if (plan.partyLine[debtor.id] === want) continue;
      if (want === 'nay' && bill.proposed_by_party_id === debtor.id) continue;
      if (await partyObligation(trx, bill.id, debtor.id)) continue;
      await trx('pol_favours').where({ id: fav.id }).update({ status: 'called', called_bill_id: bill.id, called_vote: want, called_arc: arc });
      fav.status = 'called';
      busy.add(debtor.id);
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc, kind: 'favour_called',
        headline: `${holder.name} calls in a favour from ${debtor.name}`,
        body: `${holder.name} expects ${debtor.name} to vote ${want === 'yea' ? 'for' : 'against'} "${billTitle(params.category, params.option)}". Refusing would mean breaking their word.`,
      });
      called++;
    }
  }
  return called;
}

// ═══════════════════════════════ MONTHLY TICK ═══════════════════════════════

/** Runs once a month inside the politics transaction, before the monthly poll is taken. */
export async function runFloorMonth(trx: any, stateId: string, arc: number): Promise<void> {
  await ensureSupport(trx, stateId, arc);
  await driftSupportForState(trx, stateId, arc);
  await trx('pol_situations').where({ state_id: stateId, status: 'open' }).where('arc', '<', arc).update({ status: 'expired' });
  await trx('pol_stat_shocks').where({ state_id: stateId }).where('expires_arc', '<=', arc).del();
  await resolveContests(trx, stateId, arc);
}

// ═══════════════════════════════ WHO IS THE PLAYER ═══════════════════════════════

export interface PlayerPolitics {
  character: any;
  membership: any | null;
  party: any | null;
  isLeader: boolean;
  seat: any | null;
  post: any | null;
  isPremier: boolean;
  inGovernment: boolean;
  inOpposition: boolean;
  roles: Role[];
}

export async function playerPolitics(trx: any, stateId: string, character: any, gov: GovernmentInfo): Promise<PlayerPolitics> {
  const membership = await trx('pol_party_members')
    .join('pol_parties', 'pol_parties.id', 'pol_party_members.party_id')
    .where({ 'pol_party_members.character_id': character.id, 'pol_parties.state_id': stateId })
    .select('pol_party_members.*')
    .first() ?? null;
  const party = membership ? await trx('pol_parties').where({ id: membership.party_id }).first() : null;
  const isLeader = !!party && party.leader_character_id === character.id;
  const seat = gov.sittingCycleId
    ? (await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: character.id }).first()) ?? null
    : null;
  const post = (await trx('pol_cabinet_posts').where({ state_id: stateId, holder_character_id: character.id }).first()) ?? null;
  const premierRow = await trx('pol_offices').where({ state_id: stateId, office: 'premier' }).orderBy('since_arc', 'desc').first();
  const isPremier = !!premierRow && premierRow.holder_character_id === character.id;
  const inGovernment = !!party && gov.memberPartyIds.includes(party.id);
  const inOpposition = !!party && !!gov.leadPartyId && !inGovernment;
  const roles: Role[] = [];
  if (!party) roles.push('citizen');
  else {
    roles.push('member');
    if (seat) roles.push('mp');
    if (isLeader) roles.push('leader');
    if (post) roles.push('minister');
    if (isPremier) roles.push('premier');
  }
  return { character, membership, party, isLeader, seat, post, isPremier, inGovernment, inOpposition, roles };
}

async function logAction(trx: any, stateId: string, me: PlayerPolitics, arc: number, kind: string, target: string | null, summary: string): Promise<void> {
  await trx('pol_action_log').insert({
    state_id: stateId, character_id: me.character.id, party_id: me.party?.id ?? null, arc, kind, target, summary,
  });
}

async function countActions(trx: any, characterId: string, arc: number, kind: string, target?: string): Promise<number> {
  const q = trx('pol_action_log').where({ character_id: characterId, arc, kind });
  if (target) q.where({ target });
  return num((await q.count('* as n').first())?.n);
}

/**
 * Pay a money cost. Party leaders pay party costs from party funds; everyone
 * else pays out of their own pocket, so a member can never drain a party.
 */
async function payMoney(trx: any, me: PlayerPolitics, cost: { cash?: number; funds?: number }): Promise<void> {
  let fromCash = num(cost.cash);
  let fromFunds = 0;
  if (cost.funds) { if (me.isLeader && me.party) fromFunds = num(cost.funds); else fromCash += num(cost.funds); }
  if (fromFunds > 0) {
    const p = await trx('pol_parties').where({ id: me.party.id }).forUpdate().first();
    if (num(p.treasury) < fromFunds) throw new AppError(`Your party funds are short: this needs $${fromFunds.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
    await trx('pol_parties').where({ id: me.party.id }).decrement('treasury', fromFunds);
  }
  if (fromCash > 0) {
    const f = await trx('character_finances').where({ character_id: me.character.id }).forUpdate().first();
    if (!f || num(f.cash_in_hand) < fromCash) throw new AppError(`You cannot afford this: it needs $${fromCash.toLocaleString()} of your own money.`, 400, 'INSUFFICIENT_FUNDS');
    await trx('character_finances').where({ character_id: me.character.id }).decrement('cash_in_hand', fromCash).decrement('net_worth', fromCash);
  }
}

/** What a money cost means for THIS player (for the screen). */
export function effectiveCost(me: { isLeader: boolean; party: any | null }, cost: CardCost | undefined): { ap: number; cash: number; funds: number } {
  const c = { ap: num(cost?.ap), cash: num(cost?.cash), funds: 0 };
  if (cost?.funds) { if (me.isLeader && me.party) c.funds = num(cost.funds); else c.cash += num(cost.funds); }
  return c;
}

// ═══════════════════════════════ SITUATIONS ═══════════════════════════════

export interface WorldForCards {
  stateId: string;
  arc: number;
  phase: string;
  stats: Record<string, number>;
  approval: number;
  monthsToElection: number;
  openBillTitle: string | null;
  premierName: string | null;
  districts: { id: string; name: string }[];
  /** Parties with their seat counts, to name a rival. */
  parties: { id: string; name: string; seats: number }[];
}

/** Deal this month's hand if it has not been dealt yet. Safe to call on every page load. */
export async function ensureHand(trx: any, me: PlayerPolitics, world: WorldForCards): Promise<void> {
  // Deal only the slots that are empty: normally all of them at the start of a
  // month, or the ones cleared when the player's role changed (joined a party).
  const existing = await trx('pol_situations').where({ character_id: me.character.id, arc: world.arc }).select('slot', 'card_key');
  if (existing.length >= HAND_SIZE) return;
  const usedSlots = new Set<number>(existing.map((r: any) => Number(r.slot)));
  const recent = await trx('pol_situations')
    .where({ character_id: me.character.id })
    .where('arc', '>', world.arc - HAND_REPEAT_COOLDOWN_MONTHS)
    .select('card_key');
  const ctx: DealContext = {
    roles: me.roles, inGovernment: me.inGovernment, inOpposition: me.inOpposition, phase: world.phase,
    stats: world.stats, approval: world.approval, hasOpenBill: !!world.openBillTitle, monthsToElection: world.monthsToElection,
  };
  const seed = `${me.character.id}|${world.arc}`;
  const freeSlots = Array.from({ length: HAND_SIZE }, (_, i) => i).filter(i => !usedSlots.has(i));
  const cards = dealHand(ctx, `${seed}|${existing.length}`, new Set(recent.map((r: any) => r.card_key))).slice(0, freeSlots.length);
  if (!cards.length) return;

  const others = world.parties.filter(p => p.id !== me.party?.id).sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name));
  const rival = others[0] ?? null;
  const seatDistrict = me.seat?.constituency_id ? world.districts.find(d => d.id === me.seat.constituency_id) : null;
  const home = seatDistrict ?? world.districts[Math.floor(seededUnit(`${me.character.id}|home`) * world.districts.length)] ?? null;
  const vars = {
    me: me.character.name,
    party: me.party?.name ?? 'your party',
    rival: rival?.name ?? 'the other side',
    rivalId: rival?.id ?? '',
    premier: world.premierName ? `Premier ${world.premierName}` : 'the Premier',
    bill: world.openBillTitle ?? 'the bill',
    district: home?.name ?? 'your district',
  };
  const rows = cards.map((c, i) => ({
    state_id: world.stateId, character_id: me.character.id, arc: world.arc, slot: freeSlots[i], card_key: c.key, vars: JSON.stringify(vars),
  }));
  await trx('pol_situations').insert(rows).onConflict(['character_id', 'arc', 'slot']).ignore();
}

async function applyEffects(trx: any, stateId: string, me: PlayerPolitics, effects: Effects, vars: any, arc: number, reason: string): Promise<void> {
  await bumpCharacter(trx, me.character.id, { trust: effects.trust, clout: effects.clout });
  if (effects.cash) {
    await trx('character_finances').where({ character_id: me.character.id }).update({
      cash_in_hand: trx.raw('GREATEST(0, cash_in_hand + ?)', [effects.cash]),
      net_worth: trx.raw('GREATEST(0, net_worth + ?)', [effects.cash]),
    });
  }
  if (effects.funds && me.party) {
    await trx('pol_parties').where({ id: me.party.id }).update({ treasury: trx.raw('GREATEST(0, treasury + ?)', [effects.funds]) });
  }
  if (effects.support && me.party) await addSupport(trx, me.party.id, effects.support as Record<string, number>, arc);
  if (effects.rival && vars?.rivalId) await addSupport(trx, vars.rivalId, { all: effects.rival }, arc);
  if (effects.stat && (me.isPremier || me.post)) {
    for (const [stat, delta] of Object.entries(effects.stat)) {
      if (!delta) continue;
      await trx('pol_stat_shocks').insert({ state_id: stateId, stat, delta, reason, created_arc: arc, expires_arc: arc + SHOCK_MONTHS });
    }
  }
}

export async function chooseSituation(trx: any, stateId: string, me: PlayerPolitics, situationId: string, optionIndex: number, arc: number) {
  const row = await trx('pol_situations').where({ id: situationId, character_id: me.character.id }).forUpdate().first();
  if (!row) throw new AppError('That decision is not on your desk.', 404, 'NOT_FOUND');
  if (row.status !== 'open' || num(row.arc) !== arc) throw new AppError('That decision has already been made or has expired.', 409, 'CONFLICT');
  const card = SITUATION_BY_KEY[row.card_key];
  const option = card?.options[optionIndex];
  if (!card || !option) throw new AppError('Unknown choice.', 400, 'BAD_REQUEST');
  const vars = typeof row.vars === 'string' ? safeParseJSON(row.vars) : (row.vars ?? {});

  if (option.cost?.ap) await spendEnergy(trx, me.character.id, option.cost.ap, arc);
  if (option.cost?.cash || option.cost?.funds) await payMoney(trx, me, option.cost);

  const idx = pickOutcome(option, `${row.id}|${optionIndex}`);
  const outcome = option.outcomes[idx];
  await applyEffects(trx, stateId, me, outcome.effects, vars, arc, card.title);
  const polStateCode = (await trx('pol_states').where({ id: stateId }).select('code').first())?.code;
  const result = { index: idx, tone: outcome.tone, text: localisePlaces(renderText(outcome.text, vars), polStateCode), effects: outcome.effects };
  await trx('pol_situations').where({ id: row.id }).update({
    status: 'resolved', option_index: optionIndex, outcome: JSON.stringify(result), resolved_at: trx.fn.now(),
  });
  await logAction(trx, stateId, me, arc, 'situation', card.key, `${card.title}: ${option.label}`);
  return result;
}

// ═══════════════════════════════ DESK ACTIONS ═══════════════════════════════

function needParty(me: PlayerPolitics): asserts me is PlayerPolitics & { party: any } {
  if (!me.party) throw new AppError('Join or found a party first.', 403, 'FORBIDDEN');
}

export async function rally(trx: any, stateId: string, me: PlayerPolitics, segment: string, phase: string, arc: number) {
  needParty(me);
  if (!SEGMENT_KEYS.includes(segment as any)) throw new AppError('Unknown voter group.', 400, 'BAD_REQUEST');
  await spendEnergy(trx, me.character.id, RALLY_AP, arc);
  const repeats = await countActions(trx, me.character.id, arc, 'rally', segment);
  const gain = Number(rallyGain(num(me.character.charisma), repeats, phase, homeGroupOf(me.character.background) === segment).toFixed(2));
  await addSupport(trx, me.party.id, { [segment]: gain }, arc);
  const label = SEGMENTS.find(s => s.key === segment)?.label ?? segment;
  await logAction(trx, stateId, me, arc, 'rally', segment, `Rally: ${label} +${gain.toFixed(1)}`);
  return { gain, segment };
}

export async function runAd(trx: any, stateId: string, me: PlayerPolitics, arc: number) {
  needParty(me);
  await spendEnergy(trx, me.character.id, AD_AP, arc);
  await payMoney(trx, me, { funds: AD_COST });
  const repeats = await countActions(trx, me.character.id, arc, 'ad');
  const gain = Number(adGain(repeats).toFixed(2));
  await addSupport(trx, me.party.id, { all: gain }, arc);
  await logAction(trx, stateId, me, arc, 'ad', null, `Ad campaign: all groups +${gain.toFixed(1)}`);
  return { gain };
}

export async function fundraise(trx: any, stateId: string, me: PlayerPolitics, arc: number) {
  needParty(me);
  await spendEnergy(trx, me.character.id, FUNDRAISE_AP, arc);
  const repeats = await countActions(trx, me.character.id, arc, 'fundraise');
  const support = (await getSupportMap(trx, [me.party]))[me.party.id];
  const avg = SEGMENT_KEYS.reduce((a, k) => a + support[k], 0) / SEGMENT_KEYS.length;
  const roll = seededUnit(`${me.character.id}|${arc}|fundraise|${repeats}`);
  const take = Math.round(fundraiseTake(avg, num(me.character.charisma), repeats, roll) * nationRules(await codeOf(trx, stateId)).fundraiseMult / 100) * 100;
  await trx('pol_parties').where({ id: me.party.id }).increment('treasury', take);
  await logAction(trx, stateId, me, arc, 'fundraise', null, `Fundraiser: $${take.toLocaleString()}`);
  return { take, mood: roll > 0.75 ? 'great' : roll < 0.25 ? 'poor' : 'fair' };
}

// ═══════════════════════════════ VOTING ═══════════════════════════════

export async function castVote(trx: any, me: PlayerPolitics, billId: string, vote: Vote, gov: GovernmentInfo) {
  const bill = await trx('pol_bills').where({ id: billId, status: 'proposed' }).first();
  if (!bill) throw new AppError('That bill is no longer before Parliament.', 404, 'NOT_FOUND');
  const leadsSeatedParty = me.isLeader && me.party && (gov.seatsByParty[me.party.id] || 0) > 0;
  if (!leadsSeatedParty && !me.seat) {
    throw new AppError('You need a seat in Parliament to vote. Join a party with seats, or win one at the next election.', 403, 'FORBIDDEN');
  }
  await trx('pol_bill_votes').insert({ bill_id: billId, character_id: me.character.id, vote }).onConflict(['bill_id', 'character_id']).merge();
  return { success: true, vote, mode: leadsSeatedParty ? 'line' : 'seat' };
}

// ═══════════════════════════════ PACTS & FAVOURS ═══════════════════════════════

/** Would this computer-run party take the deal? Shared by the forecast on screen and the real offer. */
export async function forecastPact(
  trx: any, bill: any, fromParty: any, toParty: any, askedVote: Vote, cash: number, askerTrust: number,
  gov: GovernmentInfo, laws: Record<string, string>, arc: number,
): Promise<PactDecision> {
  const params = parseParams(bill);
  const desirability = params?.category && params?.option
    ? changeDesirability(parsePlatform(toParty.platform), params.category, laws[params.category] ?? DEFAULT_LAWS[params.category], params.option)
    : 0;
  const owed = num((await trx('pol_favours')
    .where({ holder_party_id: toParty.id, debtor_party_id: fromParty.id })
    .whereIn('status', ['pending', 'open', 'called']).count('* as n').first())?.n);
  return pactDecision({
    desirability,
    askedVote,
    targetProposedBill: bill.proposed_by_party_id === toParty.id,
    targetInGovernment: gov.memberPartyIds.includes(toParty.id),
    billFromGovernment: gov.memberPartyIds.includes(bill.proposed_by_party_id),
    // A donation counts for more where money talks (Westmark), less where it is frowned on (Eryndor).
    cash: cash * nationRules(await codeOf(trx, bill.state_id)).donationMult,
    askerTrust,
    alreadyOwed: owed,
    askerWordBroken: num(fromParty.word_broken_until_arc) > arc,
  });
}

export async function offerPact(
  trx: any, stateId: string, me: PlayerPolitics, input: { billId: string; toPartyId: string; askedVote: Vote; cash: number },
  gov: GovernmentInfo, laws: Record<string, string>, arc: number,
) {
  needParty(me);
  if (!me.isLeader) throw new AppError('Only a party leader can promise the party\'s favours.', 403, 'FORBIDDEN');
  if (!gov.seatsByParty[me.party.id]) throw new AppError('Your party needs seats in Parliament before its favours are worth anything.', 403, 'FORBIDDEN');
  const bill = await trx('pol_bills').where({ id: input.billId, state_id: stateId, status: 'proposed' }).first();
  if (!bill) throw new AppError('That bill is no longer before Parliament.', 404, 'NOT_FOUND');
  const toParty = await trx('pol_parties').where({ id: input.toPartyId, state_id: stateId }).first();
  if (!toParty || toParty.id === me.party.id) throw new AppError('Choose another party.', 400, 'BAD_REQUEST');
  if (!gov.seatsByParty[toParty.id]) throw new AppError('That party has no seats to vote with.', 400, 'BAD_REQUEST');
  const cash = Math.round(Math.max(0, Math.min(PACT_MAX_CASH, num(input.cash))));
  if (cash > num(me.party.treasury)) throw new AppError('Your party funds cannot cover that donation.', 400, 'INSUFFICIENT_FUNDS');
  const live = await trx('pol_pacts').where({ bill_id: bill.id, from_party_id: me.party.id, to_party_id: toParty.id }).whereIn('status', ['offered', 'accepted']).first();
  if (live) throw new AppError('You already have a deal with them on this bill.', 409, 'CONFLICT');
  if (await partyObligation(trx, bill.id, toParty.id)) throw new AppError('They are already committed on this bill.', 409, 'CONFLICT');

  const base = {
    state_id: stateId, bill_id: bill.id, from_party_id: me.party.id, to_party_id: toParty.id,
    asked_vote: input.askedVote, cash, created_by_character_id: me.character.id, created_arc: arc,
  };
  const title = billTitle(parseParams(bill).category, parseParams(bill).option);

  if (toParty.leader_character_id) {
    // A human leads that party: the offer waits on their desk.
    await spendEnergy(trx, me.character.id, PACT_AP, arc);
    const [pact] = await trx('pol_pacts').insert({ ...base, status: 'offered' }).returning('*');
    await logAction(trx, stateId, me, arc, 'pact', toParty.id, `Offered ${toParty.name} a deal on ${title}`);
    await notify(trx, toParty.leader_character_id, arc, 'pact_offered', `${me.party.name} asks your party to vote ${input.askedVote === 'yea' ? 'for' : 'against'} "${title}" in return for a favour${cash ? ` and $${cash.toLocaleString()}` : ''}. Answer it on your Desk.`, 'desk');
    return { status: 'offered', pact, message: `Your offer is on ${toParty.name}'s desk.` };
  }
  const decision = await forecastPact(trx, bill, me.party, toParty, input.askedVote, cash, num(me.character.credibility), gov, laws, arc);
  if (!decision.accept) throw new AppError(decision.reason, 409, 'PACT_REFUSED');
  await spendEnergy(trx, me.character.id, PACT_AP, arc);
  const [pact] = await trx('pol_pacts').insert({ ...base, status: 'accepted' }).returning('*');
  await sealPact(trx, stateId, pact, me.party, toParty, title, arc);
  await logAction(trx, stateId, me, arc, 'pact', toParty.id, `Deal with ${toParty.name} on ${title}`);
  return { status: 'accepted', pact, message: `${toParty.name} will vote ${input.askedVote === 'yea' ? 'for' : 'against'} the bill. You owe them a favour.` };
}

async function sealPact(trx: any, stateId: string, pact: any, fromParty: any, toParty: any, title: string, arc: number): Promise<void> {
  const cash = num(pact.cash);
  if (cash > 0) {
    const from = await trx('pol_parties').where({ id: fromParty.id }).forUpdate().first();
    if (num(from.treasury) < cash) throw new AppError('The party that made this offer can no longer pay the donation.', 400, 'INSUFFICIENT_FUNDS');
    await trx('pol_parties').where({ id: fromParty.id }).decrement('treasury', cash);
    await trx('pol_parties').where({ id: toParty.id }).increment('treasury', cash);
  }
  await trx('pol_favours').insert({
    state_id: stateId, holder_party_id: toParty.id, debtor_party_id: fromParty.id, origin_pact_id: pact.id, status: 'pending', created_arc: arc,
  });
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'pact_made',
    headline: `${toParty.name} and ${fromParty.name} strike a deal`,
    body: `${toParty.name} will vote ${pact.asked_vote === 'yea' ? 'for' : 'against'} "${title}". In return ${fromParty.name} owes it a favour${cash > 0 ? ' and has made a donation' : ''}.`,
  });
}

export async function respondPact(trx: any, stateId: string, me: PlayerPolitics, pactId: string, accept: boolean, arc: number) {
  needParty(me);
  const pact = await trx('pol_pacts').where({ id: pactId, state_id: stateId, status: 'offered' }).forUpdate().first();
  if (!pact || pact.to_party_id !== me.party.id) throw new AppError('That offer is not on your desk.', 404, 'NOT_FOUND');
  if (!me.isLeader) throw new AppError('Only the party leader can answer for the party.', 403, 'FORBIDDEN');
  if (!accept) {
    await trx('pol_pacts').where({ id: pact.id }).update({ status: 'declined', resolved_arc: arc, decline_reason: 'Declined by the leader.' });
    await notify(trx, pact.created_by_character_id, arc, 'pact_declined', `${me.party.name} turned down your deal.`, 'chamber');
    return { status: 'declined' };
  }
  const bill = await trx('pol_bills').where({ id: pact.bill_id, status: 'proposed' }).first();
  if (!bill) throw new AppError('That bill is no longer before Parliament.', 409, 'CONFLICT');
  if (await partyObligation(trx, bill.id, me.party.id)) throw new AppError('Your party is already committed on this bill.', 409, 'CONFLICT');
  const fromParty = await trx('pol_parties').where({ id: pact.from_party_id }).first();
  await trx('pol_pacts').where({ id: pact.id }).update({ status: 'accepted' });
  await sealPact(trx, stateId, pact, fromParty, me.party, billTitle(parseParams(bill).category, parseParams(bill).option), arc);
  await notify(trx, pact.created_by_character_id, arc, 'pact_accepted', `${me.party.name} accepted your deal. You owe them a favour.`, 'chamber');
  return { status: 'accepted' };
}

export async function callFavour(trx: any, stateId: string, me: PlayerPolitics, favourId: string, billId: string, vote: Vote, arc: number) {
  needParty(me);
  if (!me.isLeader) throw new AppError('Only the party leader can call in the party\'s favours.', 403, 'FORBIDDEN');
  const fav = await trx('pol_favours').where({ id: favourId, state_id: stateId, status: 'open' }).forUpdate().first();
  if (!fav || fav.holder_party_id !== me.party.id) throw new AppError('You do not hold that favour.', 404, 'NOT_FOUND');
  const bill = await trx('pol_bills').where({ id: billId, state_id: stateId, status: 'proposed' }).first();
  if (!bill) throw new AppError('That bill is no longer before Parliament.', 404, 'NOT_FOUND');
  if (bill.proposed_by_party_id === fav.debtor_party_id && vote === 'nay') throw new AppError('You cannot make a party vote down its own bill.', 400, 'BAD_REQUEST');
  if (await partyObligation(trx, bill.id, fav.debtor_party_id)) throw new AppError('They are already committed on this bill.', 409, 'CONFLICT');
  await trx('pol_favours').where({ id: fav.id }).update({ status: 'called', called_bill_id: bill.id, called_vote: vote, called_arc: arc });
  const debtor = await trx('pol_parties').where({ id: fav.debtor_party_id }).first();
  const title = billTitle(parseParams(bill).category, parseParams(bill).option);
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'favour_called',
    headline: `${me.party.name} calls in a favour from ${debtor?.name ?? 'a party'}`,
    body: `${me.party.name} expects ${debtor?.name ?? 'them'} to vote ${vote === 'yea' ? 'for' : 'against'} "${title}".`,
  });
  await logAction(trx, stateId, me, arc, 'favour', fav.debtor_party_id, `Called in a favour from ${debtor?.name} on ${title}`);
  await notify(trx, debtor?.leader_character_id, arc, 'favour_called', `${me.party.name} calls in its favour: vote ${vote === 'yea' ? 'for' : 'against'} "${title}", or break your word.`, 'chamber');
  return { status: 'called' };
}

// ═══════════════════════════════ PARTIES ARE OPEN ═══════════════════════════════

/** Months the player must still wait before joining another party (0 = free to join). */
export async function switchCooldownLeft(trx: any, characterId: string, arc: number): Promise<number> {
  const last = await trx('pol_action_log').where({ character_id: characterId, kind: 'join_party' }).orderBy('arc', 'desc').first();
  if (!last) return 0;
  return Math.max(0, num(last.arc) + PARTY_SWITCH_COOLDOWN_MONTHS - arc);
}

/**
 * After a player joins a party: record it, and seat them. Human members take
 * the party's seats before its computer-run MPs do (the same rule elections use).
 */
export async function onJoinParty(trx: any, character: any, party: any, arc: number, gov: GovernmentInfo): Promise<{ seatedIn: string | null }> {
  await trx('pol_action_log').insert({
    state_id: party.state_id, character_id: character.id, party_id: party.id, arc, kind: 'join_party', target: party.id, summary: `Joined ${party.name}`,
  });
  // Their undecided "citizen" decisions no longer fit: clear them so the desk
  // deals decisions for a party member in their place.
  await trx('pol_situations').where({ character_id: character.id, arc, status: 'open' }).del();
  if (!gov.sittingCycleId) return { seatedIn: null };
  const already = await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: character.id }).first();
  if (already) return { seatedIn: null };
  const free = await trx('pol_council_seats')
    .where({ cycle_id: gov.sittingCycleId, party_id: party.id }).whereNull('character_id')
    .orderBy('id').forUpdate().first();
  if (!free) return { seatedIn: null };
  await trx('pol_council_seats').where({ id: free.id }).update({ character_id: character.id, is_npc: false });
  const district = free.constituency_id ? await trx('pol_constituencies').where({ id: free.constituency_id }).first() : null;
  await trx('pol_ledger_events').insert({
    state_id: party.state_id, arc, kind: 'new_mp',
    headline: `${character.name} takes a ${party.name} seat${district ? ` for ${district.name}` : ''}`,
    body: `${character.name} has joined ${party.name} and been sworn in as one of its MPs.`,
  });
  return { seatedIn: district?.name ?? 'Parliament' };
}

/** When a player leaves a party, its seats, posts and candidacies go back to the party. */
export async function onLeaveParty(trx: any, character: any, partyId: string): Promise<void> {
  await trx('pol_council_seats').where({ party_id: partyId, character_id: character.id }).update({ character_id: null, is_npc: true });
  await trx('pol_cabinet_posts').where({ party_id: partyId, holder_character_id: character.id }).update({ holder_character_id: null, npc_name: 'Acting minister' });
  const openCycles = await trx('pol_cycles').where({ status: 'open' }).select('id');
  if (openCycles.length) {
    await trx('pol_candidates').whereIn('cycle_id', openCycles.map((c: any) => c.id)).where({ party_id: partyId, character_id: character.id })
      .update({ character_id: null, is_npc: true });
  }
}

/** Put a new leader at the head of a party (and in the head of government's chair if the party leads the government). */
async function installLeader(trx: any, stateId: string, party: any, newLeader: any, oldLeader: any | null, arc: number, how: string): Promise<boolean> {
  await trx('pol_party_members').where({ party_id: party.id, role: 'leader' }).update({ role: 'member' });
  await trx('pol_party_members').where({ party_id: party.id, character_id: newLeader.id }).update({ role: 'leader' });
  await trx('pol_parties').where({ id: party.id }).update({ leader_character_id: newLeader.id });
  // The leader of the party that heads the government is the head of government.
  const becameHead = await trx('pol_offices').where({ state_id: stateId, office: 'premier', party_id: party.id })
    .update({ holder_character_id: newLeader.id });
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'new_leader',
    headline: `${newLeader.name} takes the leadership of ${party.name}`,
    body: oldLeader ? `${oldLeader.name} is out after ${how}.` : `${party.name}'s MPs have chosen a new leader.`,
  });
  return becameHead > 0;
}

/**
 * Challenge for the party leadership.
 * - A computer-run leader: decided at once by clout (leadershipDecision).
 * - A human leader: a CONTEST opens. The leader is told, the party's human
 *   members vote, and it is decided when the month after next turns (contestResult).
 */
export async function challengeLeadership(trx: any, stateId: string, me: PlayerPolitics, arc: number) {
  needParty(me);
  if (me.isLeader) throw new AppError('You already lead this party.', 409, 'CONFLICT');
  const tenure = arc - num(me.membership?.joined_arc, arc);
  if (tenure < LEADERSHIP_MIN_TENURE_MONTHS) {
    const wait = LEADERSHIP_MIN_TENURE_MONTHS - tenure;
    throw new AppError(`You are too new to the party. You can challenge in ${wait} month${wait === 1 ? '' : 's'}.`, 409, 'CONFLICT');
  }
  const leader = me.party.leader_character_id ? await trx('characters').where({ id: me.party.leader_character_id }).first() : null;
  const nationCode = await codeOf(trx, stateId);
  const nationName = getNationForPolState(nationCode)?.shortName ?? 'the nation';

  if (leader) {
    if (num(me.character.influence) < LEADERSHIP_MIN_CLOUT) {
      throw new AppError(`You need ${LEADERSHIP_MIN_CLOUT} clout to force a contest. You have ${num(me.character.influence)}.`, 409, 'CONFLICT');
    }
    const open = await trx('pol_leadership_contests').where({ party_id: me.party.id, status: 'open' }).first();
    if (open) throw new AppError('A leadership contest is already under way in your party.', 409, 'CONFLICT');
    await spendEnergy(trx, me.character.id, LEADERSHIP_AP, arc);
    const [contest] = await trx('pol_leadership_contests').insert({
      state_id: stateId, party_id: me.party.id, challenger_id: me.character.id, leader_id: leader.id,
      opened_arc: arc, closes_arc: arc + CONTEST_MONTHS, status: 'open',
    }).returning('*');
    await trx('pol_ledger_events').insert({
      state_id: stateId, arc, kind: 'leadership_contest',
      headline: `${me.character.name} challenges ${leader.name} for the leadership of ${me.party.name}`,
      body: `The party's members will decide. The result is declared when next month ends.`,
    });
    await notify(trx, leader.id, arc, 'contest_opened', `${me.character.name} has challenged you for the leadership of ${me.party.name}. Rally your members in the Party tab: the vote closes when next month ends.`, 'party');
    const members = await trx('pol_party_members').where({ party_id: me.party.id }).whereNotIn('character_id', [me.character.id, leader.id]).pluck('character_id');
    await notifyMany(trx, members, arc, 'contest_vote', `Leadership contest in ${me.party.name}: ${me.character.name} against ${leader.name}. Cast your ballot in the Party tab.`, 'party');
    await logAction(trx, stateId, me, arc, 'leadership', me.party.id, `Challenged ${leader.name} for the leadership`);
    return { won: null, contestId: contest.id, message: `The contest is on. ${leader.name} has been told. Win your party's members over before next month ends.` };
  }

  const decision = leadershipDecision(num(me.character.influence), false, 0);
  await spendEnergy(trx, me.character.id, LEADERSHIP_AP, arc);
  if (!decision.win) {
    await bumpCharacter(trx, me.character.id, { clout: LEADERSHIP_FAIL_CLOUT });
    await logAction(trx, stateId, me, arc, 'leadership', me.party.id, 'Leadership challenge failed');
    return { won: false, message: `The party was not ready to follow you. You needed ${decision.need} clout.` };
  }
  const becameHead = await installLeader(trx, stateId, me.party, me.character, null, arc, 'a challenge');
  await logAction(trx, stateId, me, arc, 'leadership', me.party.id, `Became leader of ${me.party.name}`);
  return { won: true, message: `You now lead ${me.party.name}${becameHead ? ` and are ${headOfGovernmentTitle(nationCode)} of ${nationName}` : ''}. Its bloc votes the way you vote.` };
}

/** A party member casts (or changes) their ballot in their party's open contest. */
export async function voteInContest(trx: any, me: PlayerPolitics, side: 'challenger' | 'leader', arc: number) {
  needParty(me);
  const contest = await trx('pol_leadership_contests').where({ party_id: me.party.id, status: 'open' }).forUpdate().first();
  if (!contest) throw new AppError('There is no leadership contest in your party.', 404, 'NOT_FOUND');
  if ([contest.challenger_id, contest.leader_id].includes(me.character.id)) throw new AppError('You are standing in this contest: your clout is your vote.', 409, 'CONFLICT');
  if (num(me.membership?.joined_arc, arc) > num(contest.opened_arc)) throw new AppError('Only members who belonged to the party when the contest opened may vote.', 403, 'FORBIDDEN');
  await trx('pol_leadership_ballots').insert({ contest_id: contest.id, character_id: me.character.id, side })
    .onConflict(['contest_id', 'character_id']).merge();
  return { message: side === 'challenger' ? 'You back the challenger.' : 'You back the leader.' };
}

/** The standing of a party's open contest, for the Party screen. */
export async function contestView(conn: any, partyId: string, myId: string | null) {
  const c = await conn('pol_leadership_contests').where({ party_id: partyId, status: 'open' }).first()
    ?? await conn('pol_leadership_contests').where({ party_id: partyId }).whereNot('status', 'open').orderBy('created_at', 'desc').first();
  if (!c) return null;
  const people = await conn('characters').whereIn('id', [c.challenger_id, c.leader_id]).select('id', 'name', 'influence');
  const by = new Map<string, any>(people.map((p: any) => [p.id, p]));
  const ballots = await conn('pol_leadership_ballots as b').join('characters as ch', 'ch.id', 'b.character_id')
    .where('b.contest_id', c.id).select('b.character_id', 'b.side', 'ch.name');
  const seated = await seatedIds(conn, c.state_id, ballots.map((b: any) => b.character_id));
  const standing = contestResult({
    challengerClout: num(by.get(c.challenger_id)?.influence), leaderClout: num(by.get(c.leader_id)?.influence),
    ballots: ballots.map((b: any) => ({ side: b.side, hasSeat: seated.has(b.character_id) })),
  });
  return {
    id: c.id, status: c.status, openedArc: c.opened_arc, closesArc: c.closes_arc,
    challenger: { id: c.challenger_id, name: by.get(c.challenger_id)?.name ?? '?', clout: num(by.get(c.challenger_id)?.influence) },
    leader: { id: c.leader_id, name: by.get(c.leader_id)?.name ?? '?', clout: num(by.get(c.leader_id)?.influence) },
    ballots: ballots.map((b: any) => ({ id: b.character_id, name: b.name, side: b.side, mp: seated.has(b.character_id) })),
    myBallot: myId ? ballots.find((b: any) => b.character_id === myId)?.side ?? null : null,
    standing: c.status === 'open' ? standing : (typeof c.result === 'string' ? JSON.parse(c.result) : c.result),
    rules: { ballotWeight: CONTEST_BALLOT_WEIGHT, mpMult: CONTEST_MP_BALLOT_MULT, incumbency: LEADERSHIP_MARGIN },
  };
}

async function seatedIds(conn: any, stateId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const gov = await getGovernmentLite(conn, stateId);
  if (!gov) return new Set();
  const rows = await conn('pol_council_seats').where({ cycle_id: gov }).whereIn('character_id', ids).pluck('character_id');
  return new Set(rows);
}
/** The sitting parliament's cycle id (the latest cycle that has seats). */
async function getGovernmentLite(conn: any, stateId: string): Promise<string | null> {
  const row = await conn('pol_council_seats as s').join('pol_cycles as c', 'c.id', 's.cycle_id')
    .where('c.state_id', stateId).orderBy('c.cycle_number', 'desc').select('c.id').first();
  return row?.id ?? null;
}

/** Monthly tick: decide every contest that has closed. */
export async function resolveContests(trx: any, stateId: string, arc: number): Promise<void> {
  const due = await trx('pol_leadership_contests').where({ state_id: stateId, status: 'open' }).where('closes_arc', '<=', arc);
  for (const c of due) {
    const party = await trx('pol_parties').where({ id: c.party_id }).first();
    const [challenger, leader] = await Promise.all([c.challenger_id, c.leader_id].map(id => trx('characters').where({ id }).first()));
    const stillIn = async (id: string) => !!(await trx('pol_party_members').where({ party_id: c.party_id, character_id: id }).first());
    // Void if the leader has already changed or either side has left.
    if (!party || !challenger || !leader || party.leader_character_id !== leader.id || !(await stillIn(challenger.id))) {
      await trx('pol_leadership_contests').where({ id: c.id }).update({ status: 'void', result: JSON.stringify({ reason: 'overtaken by events' }) });
      continue;
    }
    const ballots = await trx('pol_leadership_ballots').where({ contest_id: c.id });
    // Only ballots of people still in the party count.
    const members = new Set<string>(await trx('pol_party_members').where({ party_id: c.party_id }).pluck('character_id'));
    const valid = ballots.filter((b: any) => members.has(b.character_id));
    const seated = await seatedIds(trx, stateId, valid.map((b: any) => b.character_id));
    const r = contestResult({
      challengerClout: num(challenger.influence), leaderClout: num(leader.influence),
      ballots: valid.map((b: any) => ({ side: b.side, hasSeat: seated.has(b.character_id) })),
    });
    const won = r.winner === 'challenger';
    await trx('pol_leadership_contests').where({ id: c.id }).update({ status: won ? 'won' : 'lost', result: JSON.stringify({ ...r, ballots: valid.length }) });
    const score = `${Math.round(r.challenger)} to ${Math.round(r.leader)}`;
    if (won) {
      await installLeader(trx, stateId, party, challenger, leader, arc, `losing a leadership contest ${score}`);
      await bumpCharacter(trx, leader.id, { clout: CONTEST_DEPOSED_CLOUT });
      await notify(trx, challenger.id, arc, 'contest_won', `You won the leadership of ${party.name}, ${score}. Its bloc now votes the way you vote.`, 'party');
      await notify(trx, leader.id, arc, 'contest_lost', `You lost the leadership of ${party.name} to ${challenger.name}, ${score}.`, 'party');
    } else {
      await bumpCharacter(trx, challenger.id, { clout: LEADERSHIP_FAIL_CLOUT });
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc, kind: 'leadership_contest',
        headline: `${leader.name} sees off ${challenger.name} and keeps the ${party.name} leadership`,
        body: `The party backed its leader, ${score}.`,
      });
      await notify(trx, challenger.id, arc, 'contest_lost', `Your challenge in ${party.name} failed, ${score}. You lose ${-LEADERSHIP_FAIL_CLOUT} clout.`, 'party');
      await notify(trx, leader.id, arc, 'contest_won', `You saw off ${challenger.name}'s challenge, ${score}.`, 'party');
    }
    const voters = valid.map((b: any) => b.character_id);
    await notifyMany(trx, voters, arc, 'contest_result', `${party.name} leadership: ${won ? challenger.name : leader.name} wins, ${score}.`, 'party');
  }
}

// ═══════════════════════════════ DECREES ═══════════════════════════════

/** Which decrees this player's offices allow. */
export function decreeOffices(me: PlayerPolitics): string[] {
  const out: string[] = [];
  if (me.isPremier) out.push('premier');
  if (me.post?.post_key) out.push(me.post.post_key);
  return out;
}

/**
 * The Premier and ministers act without Parliament: a temporary nudge to the
 * nation's statistics, and a reaction from voters. One per month each.
 */
export async function issueDecree(trx: any, stateId: string, me: PlayerPolitics, key: string, arc: number) {
  const decree = DECREE_BY_KEY[key];
  if (!decree) throw new AppError('Unknown decree.', 400, 'BAD_REQUEST');
  if (!decreeOffices(me).includes(decree.office)) throw new AppError('Your office does not have that power.', 403, 'FORBIDDEN');
  if (await countActions(trx, me.character.id, arc, 'decree') > 0) throw new AppError('You have already issued a decree this month.', 409, 'CONFLICT');
  await spendEnergy(trx, me.character.id, DECREE_AP, arc);
  const code = await codeOf(trx, stateId);
  const months = nationRules(code).decreeMonths;
  for (const [stat, delta] of Object.entries(decree.stat)) {
    if (!delta) continue;
    await trx('pol_stat_shocks').insert({ state_id: stateId, stat, delta, reason: decree.title, created_arc: arc, expires_arc: arc + months });
  }
  if (decree.support && me.party) await addSupport(trx, me.party.id, decree.support as Record<string, number>, arc);
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'decree',
    headline: `${me.isPremier && decree.office === 'premier' ? headOfGovernmentTitle(code) : 'Minister'} ${me.character.name} orders: ${decree.title}`,
    body: decree.blurb,
  });
  await logAction(trx, stateId, me, arc, 'decree', decree.key, `Decree: ${decree.title}`);
  return { message: `${decree.title}: the order is given. Its effects are felt from next month and last ${months} months.` };
}


// ═══════════════════════════════ HANDSHAKES ═══════════════════════════════
// Person-to-person deals. Either side may promise a vote on a bill and/or pay
// money. Money moves when the deal is accepted; vote promises are judged when
// the bill is counted, from the same vote plan the tally used.

/** The party a politician leads (if it holds seats) and the party of their seat (if any). */
async function votingPosition(trx: any, stateId: string, characterId: string, gov: GovernmentInfo): Promise<{ ledPartyId: string | null; seatPartyId: string | null }> {
  const led = await trx('pol_parties').where({ state_id: stateId, leader_character_id: characterId }).first();
  const ledPartyId = led && (gov.seatsByParty[led.id] || 0) > 0 ? led.id : null;
  const seat = gov.sittingCycleId ? await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: characterId }).first() : null;
  return { ledPartyId, seatPartyId: seat?.party_id ?? null };
}
const canVote = (p: { ledPartyId: string | null; seatPartyId: string | null }) => !!(p.ledPartyId || p.seatPartyId);

async function payPerson(trx: any, fromId: string, toId: string, amount: number, who: string): Promise<void> {
  if (amount <= 0) return;
  const f = await trx('character_finances').where({ character_id: fromId }).forUpdate().first();
  if (!f || num(f.cash_in_hand) < amount) throw new AppError(`${who} cannot cover ${'$' + Math.round(amount).toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
  await trx('character_finances').where({ character_id: fromId }).decrement('cash_in_hand', amount);
  await trx('character_finances').where({ character_id: toId }).increment('cash_in_hand', amount);
}

export interface HandshakeInput {
  toCharacterId: string;
  give: { billId: string | null; vote: Vote | null; cash: number };
  ask: { billId: string | null; vote: Vote | null; cash: number };
  note: string;
}

export async function offerHandshake(trx: any, stateId: string, me: PlayerPolitics, input: HandshakeInput, gov: GovernmentInfo, arc: number) {
  const to = await trx('characters').where({ id: input.toCharacterId, status: 'active' }).first();
  if (!to || to.id === me.character.id) throw new AppError('Choose another politician.', 400, 'BAD_REQUEST');
  if (to.motherland_country_id !== me.character.motherland_country_id) throw new AppError('You can only deal with politicians of your own nation.', 400, 'BAD_REQUEST');
  const clampCash = (v: number) => Math.round(Math.max(0, Math.min(HANDSHAKE_MAX_CASH, num(v))));
  const giveCash = clampCash(input.give.cash), askCash = clampCash(input.ask.cash);
  const giveVote = input.give.billId && input.give.vote ? input.give.vote : null;
  const askVote = input.ask.billId && input.ask.vote ? input.ask.vote : null;
  if (!giveVote && !giveCash) throw new AppError('Offer something: your vote on a bill, money, or both.', 400, 'BAD_REQUEST');
  if (!askVote && !askCash) throw new AppError('Ask for something: their vote on a bill, money, or both.', 400, 'BAD_REQUEST');
  // A handshake is a deal about votes. Money for money is not politics, and it
  // would let one account feed another (see docs/WORLD_STAGE.md).
  if (!giveVote && !askVote) throw new AppError('A handshake must include a vote on a bill, from you or from them.', 400, 'BAD_REQUEST');
  for (const [billId, label] of [[giveVote ? input.give.billId : null, 'The bill you offered your vote on'], [askVote ? input.ask.billId : null, 'The bill you asked about']] as const) {
    if (!billId) continue;
    const bill = await trx('pol_bills').where({ id: billId, state_id: stateId, status: 'proposed' }).first();
    if (!bill) throw new AppError(`${label} is no longer before Parliament.`, 404, 'NOT_FOUND');
  }
  if (giveVote && !canVote(await votingPosition(trx, stateId, me.character.id, gov))) throw new AppError('You have no vote to promise: you need a seat, or to lead a party with seats.', 403, 'FORBIDDEN');
  if (askVote && !canVote(await votingPosition(trx, stateId, to.id, gov))) throw new AppError(`${to.name} has no vote to promise: they hold no seat.`, 400, 'BAD_REQUEST');
  if (giveCash) {
    const f = await trx('character_finances').where({ character_id: me.character.id }).first();
    if (!f || num(f.cash_in_hand) < giveCash) throw new AppError('You do not have that much money.', 400, 'INSUFFICIENT_FUNDS');
  }
  const open = num((await trx('pol_handshakes').where({ from_character_id: me.character.id, status: 'offered' }).count('* as n').first())?.n);
  if (open >= HANDSHAKE_MAX_OPEN) throw new AppError(`You already have ${open} offers waiting. Withdraw one first.`, 409, 'CONFLICT');
  await spendEnergy(trx, me.character.id, HANDSHAKE_AP, arc);
  const [row] = await trx('pol_handshakes').insert({
    state_id: stateId, from_character_id: me.character.id, to_character_id: to.id,
    from_bill_id: giveVote ? input.give.billId : null, from_vote: giveVote, from_cash: giveCash,
    to_bill_id: askVote ? input.ask.billId : null, to_vote: askVote, to_cash: askCash,
    note: String(input.note ?? '').replace(/\s+/g, ' ').trim().slice(0, HANDSHAKE_NOTE_MAX) || null,
    status: 'offered', created_arc: arc,
  }).returning('*');
  await logAction(trx, stateId, me, arc, 'handshake', to.id, `Offered ${to.name} a deal`);
  await notify(trx, to.id, arc, 'deal_offered', `${me.character.name} has offered you a deal. Answer it in Corridors.`, 'corridors');
  return { handshake: row, message: `Your offer is with ${to.name}.` };
}

export async function respondHandshake(trx: any, stateId: string, me: PlayerPolitics, id: string, accept: boolean, gov: GovernmentInfo, arc: number) {
  const h = await trx('pol_handshakes').where({ id, state_id: stateId, to_character_id: me.character.id, status: 'offered' }).forUpdate().first();
  if (!h) throw new AppError('That offer is no longer open.', 404, 'NOT_FOUND');
  const from = await trx('characters').where({ id: h.from_character_id }).first();
  if (!accept) {
    await trx('pol_handshakes').where({ id }).update({ status: 'declined', resolved_arc: arc });
    await notify(trx, h.from_character_id, arc, 'deal_declined', `${me.character.name} turned down your deal.`, 'corridors');
    return { message: `You turned down ${from?.name ?? 'the offer'}.` };
  }
  for (const billId of [h.from_bill_id, h.to_bill_id]) {
    if (billId && !(await trx('pol_bills').where({ id: billId, status: 'proposed' }).first())) {
      await trx('pol_handshakes').where({ id }).update({ status: 'expired', resolved_arc: arc });
      throw new AppError('A bill in this deal has already been decided. The offer has lapsed.', 409, 'CONFLICT');
    }
  }
  if (h.to_vote && !canVote(await votingPosition(trx, stateId, me.character.id, gov))) throw new AppError('You have no vote to promise any more.', 403, 'FORBIDDEN');
  await payPerson(trx, h.from_character_id, me.character.id, num(h.from_cash), from?.name ?? 'They');
  await payPerson(trx, me.character.id, h.from_character_id, num(h.to_cash), 'You');
  const judged = !h.from_vote && !h.to_vote;
  await trx('pol_handshakes').where({ id }).update({ status: judged ? 'settled' : 'accepted', resolved_arc: judged ? arc : null });
  await logAction(trx, stateId, me, arc, 'handshake', h.from_character_id, `Shook hands with ${from?.name ?? 'a politician'}`);
  await notify(trx, h.from_character_id, arc, 'deal_accepted', `${me.character.name} accepted your deal.${judged ? ' The money has changed hands.' : ' Their word is given.'}`, 'corridors');
  return { message: judged ? `Done. The money has changed hands.` : `You shook hands with ${from?.name ?? 'them'}. Your word is given.` };
}

export async function withdrawHandshake(trx: any, me: PlayerPolitics, id: string, arc: number) {
  const n = await trx('pol_handshakes').where({ id, from_character_id: me.character.id, status: 'offered' }).update({ status: 'withdrawn', resolved_arc: arc });
  if (!n) throw new AppError('That offer is no longer open.', 404, 'NOT_FOUND');
  return { message: 'Offer withdrawn.' };
}

/** Judge every handshake promise that turned on this bill. Called from settleBillPolitics. */
async function settleHandshakes(trx: any, bill: any, plan: BillVotePlan, shared: VoteShared, title: string, arc: number): Promise<void> {
  await trx('pol_handshakes').where({ status: 'offered' }).andWhere((q: any) => q.where({ from_bill_id: bill.id }).orWhere({ to_bill_id: bill.id }))
    .update({ status: 'expired', resolved_arc: arc });
  const rows = await trx('pol_handshakes').where({ status: 'accepted' }).andWhere((q: any) => q.where({ from_bill_id: bill.id }).orWhere({ to_bill_id: bill.id }));
  if (!rows.length) return;
  const ledBy = new Map<string, string>();
  for (const p of shared.parties) if (p.leader_character_id && (shared.gov.seatsByParty[p.id] || 0) > 0) ledBy.set(p.leader_character_id, p.id);
  const seatOf = new Map<string, string>(shared.humanSeats.map(s => [s.character_id, s.party_id]));
  const counted = (cid: string) => countedVoteOf({ characterId: cid, partyLine: plan.partyLine, personal: plan.personal, ledPartyId: ledBy.get(cid) ?? null, seatPartyId: seatOf.get(cid) ?? null });
  const rewarded = new Set<string>();
  for (const h of rows) {
    const upd: any = {};
    const sides: { who: string; other: string; vote: Vote; field: 'from_result' | 'to_result' }[] = [];
    if (h.from_bill_id === bill.id && h.from_vote) sides.push({ who: h.from_character_id, other: h.to_character_id, vote: h.from_vote, field: 'from_result' });
    if (h.to_bill_id === bill.id && h.to_vote) sides.push({ who: h.to_character_id, other: h.from_character_id, vote: h.to_vote, field: 'to_result' });
    for (const side of sides) {
      const result = judgePromise(side.vote, counted(side.who));
      upd[side.field] = result;
      if (result === 'kept' || result === 'broken') {
        const who = await trx('characters').where({ id: side.who }).select('name').first();
        await notify(trx, side.other, arc, result === 'kept' ? 'word_kept' : 'word_broken',
          result === 'kept' ? `${who?.name ?? 'Your partner'} kept their word on "${title}".` : `${who?.name ?? 'Your partner'} broke their word on "${title}". It is on their record.`, 'corridors');
      }
      if (result === 'kept' && !rewarded.has(side.who)) {
        const already = await trx('pol_action_log').where({ character_id: side.who, arc, kind: 'word_kept' }).first();
        if (!already) {
          await bumpCharacter(trx, side.who, { trust: HANDSHAKE_KEPT_TRUST });
          await trx('pol_action_log').insert({ state_id: bill.state_id, character_id: side.who, arc, kind: 'word_kept', target: h.id, summary: `Kept your word on ${title}` });
        }
        rewarded.add(side.who);
      } else if (result === 'broken') {
        await bumpCharacter(trx, side.who, { trust: HANDSHAKE_BROKEN_TRUST, clout: HANDSHAKE_BROKEN_CLOUT });
        const [a, b] = await Promise.all([side.who, side.other].map(id => trx('characters').where({ id }).select('name').first()));
        await trx('pol_ledger_events').insert({
          state_id: bill.state_id, arc, kind: 'word_broken',
          headline: `${a?.name ?? 'A politician'} breaks their word to ${b?.name ?? 'a colleague'}`,
          body: `${a?.name ?? 'They'} promised to vote ${side.vote === 'yea' ? 'for' : 'against'} "${title}" and did not.`,
        });
      }
    }
    const fromDone = !h.from_vote || h.from_result || upd.from_result;
    const toDone = !h.to_vote || h.to_result || upd.to_result;
    if (fromDone && toDone) { upd.status = 'settled'; upd.resolved_arc = arc; }
    if (Object.keys(upd).length) await trx('pol_handshakes').where({ id: h.id }).update(upd);
  }
}
