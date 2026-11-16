/**
 * The Floor — PURE rules for the politics redesign (docs/POLITICS_FLOOR.md).
 *
 * No database access in this file: every function takes plain values and
 * returns plain values, so the rules are unit-tested in tests/floor.test.ts
 * and reused unchanged by the monthly tick, the player actions and the screens.
 */
import { Platform, SEGMENTS } from '../constants/politics';
import { NationalStat } from '../constants/macroEconomy';
import {
  AD_GAIN, AD_REPEAT_DECAY, CHARISMA_MULT_MAX, CHARISMA_MULT_MIN, FUNDRAISE_BASE, FUNDRAISE_REPEAT_DECAY,
  FUNDRAISE_ROLL_MAX, FUNDRAISE_ROLL_MIN, HAND_SIZE, LAW_SUPPORT_CAP, LAW_SUPPORT_SCALE, LEADERSHIP_MARGIN,
  LEADERSHIP_MIN_CLOUT, PACT_CASH_PER_POINT, PACT_FAVOUR_VALUE, PACT_GOV_LOYALTY, PACT_MAX_CASH,
  PACT_MAX_OWED_TO_ONE_PARTY, PACT_OWED_PENALTY, PACT_TRUST_WEIGHT, RALLY_CAMPAIGN_MULT, RALLY_GAIN,
  RALLY_REPEAT_DECAY, SegmentKey, SHOCK_TOTAL_CAP,
} from '../constants/floor';
import { CardOption, CardWhen, Role, SITUATIONS, SituationCard } from '../constants/situations';
import { supportEffort, supportTarget, driftSupport, clampSupport } from './support.rules';
import { changeDesirability, partyVoteScore, seededUnit } from './statecraft.service';

export { supportEffort, supportTarget, driftSupport, clampSupport };
export const SEGMENT_KEYS = SEGMENTS.map(s => s.key) as SegmentKey[];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ═══════════════════════════════ SUPPORT ═══════════════════════════════

export function charismaMult(charisma: number): number {
  return CHARISMA_MULT_MIN + (CHARISMA_MULT_MAX - CHARISMA_MULT_MIN) * clamp(Number(charisma) || 0, 0, 100) / 100;
}

/** Support gained by a rally in one voter group. `repeats` = rallies already held there this month. */
export function rallyGain(charisma: number, repeats: number, phase: string): number {
  const campaign = phase === 'campaign' ? RALLY_CAMPAIGN_MULT : 1;
  return RALLY_GAIN * charismaMult(charisma) * Math.pow(RALLY_REPEAT_DECAY, Math.max(0, repeats)) * campaign;
}

/** Support gained in every group by an ad campaign. */
export function adGain(repeats: number): number {
  return AD_GAIN * Math.pow(AD_REPEAT_DECAY, Math.max(0, repeats));
}

/** Money raised by a fundraiser. `roll` is 0..1 luck on the night. */
export function fundraiseTake(avgSupport: number, charisma: number, repeats: number, roll: number): number {
  const luck = FUNDRAISE_ROLL_MIN + (FUNDRAISE_ROLL_MAX - FUNDRAISE_ROLL_MIN) * clamp(roll, 0, 1);
  const base = FUNDRAISE_BASE * (0.5 + clamp(avgSupport, 0, 100) / 100) * charismaMult(charisma);
  return Math.round(base * Math.pow(FUNDRAISE_REPEAT_DECAY, Math.max(0, repeats)) * luck / 100) * 100;
}

/**
 * How each voter group feels about a change in the law: positive = they want it.
 * Uses the same liking score parties use, with the group's ideal as its platform.
 * Returned in support points for a party that voted FOR the change.
 */
export function lawSupportDeltas(category: string, currentId: string, optionId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const seg of SEGMENTS) {
    const liking = changeDesirability(seg.ideal, category, currentId, optionId);
    out[seg.key] = Math.round(clamp(liking * LAW_SUPPORT_SCALE, -LAW_SUPPORT_CAP, LAW_SUPPORT_CAP) * 10) / 10;
  }
  return out;
}

/** Sum of active stat nudges, capped so events can never swamp the economy model. */
export function sumShocks(shocks: { stat: string; delta: number }[]): Partial<Record<NationalStat, number>> {
  const out: Record<string, number> = {};
  for (const s of shocks) out[s.stat] = (out[s.stat] || 0) + Number(s.delta || 0);
  for (const k of Object.keys(out)) out[k] = clamp(out[k], -SHOCK_TOTAL_CAP, SHOCK_TOTAL_CAP);
  return out as Partial<Record<NationalStat, number>>;
}

// ═══════════════════════════════ VOTES ═══════════════════════════════

export type Vote = 'yea' | 'nay';
export interface TallyInput {
  seatsByParty: Record<string, number>;
  /** How each party's bloc votes. A party with no line abstains. */
  partyLine: Record<string, Vote | undefined>;
  /** Votes cast by individual MPs (not their party's leader) who hold a seat. */
  personalVotes: { partyId: string; vote: Vote }[];
}
export interface TallyResult {
  yea: number;
  nay: number;
  rebels: number;
  byParty: Record<string, { yea: number; nay: number; rebels: number }>;
}

/**
 * Count a vote. Each party's seats follow the party line, except seats held by
 * MPs who cast their own vote: those count one each, however they voted.
 */
export function tallyBill(input: TallyInput): TallyResult {
  const res: TallyResult = { yea: 0, nay: 0, rebels: 0, byParty: {} };
  for (const [partyId, seatsRaw] of Object.entries(input.seatsByParty)) {
    const seats = Math.max(0, Number(seatsRaw) || 0);
    if (seats === 0) continue;
    const line = input.partyLine[partyId];
    const personal = input.personalVotes.filter(v => v.partyId === partyId).slice(0, seats);
    const row = { yea: 0, nay: 0, rebels: 0 };
    for (const v of personal) {
      row[v.vote] += 1;
      if (line && v.vote !== line) row.rebels += 1;
    }
    if (line) row[line] += seats - personal.length;
    res.byParty[partyId] = row;
    res.yea += row.yea;
    res.nay += row.nay;
    res.rebels += row.rebels;
  }
  return res;
}

// ═══════════════════════════════ PACTS ═══════════════════════════════

export interface PactInput {
  /** How much the asked party likes the change (changeDesirability). */
  desirability: number;
  askedVote: Vote;
  targetProposedBill: boolean;
  targetInGovernment: boolean;
  billFromGovernment: boolean;
  /** Donation to their party funds offered on top of the favour. */
  cash: number;
  /** The asker's reputation for keeping their word (0..100). */
  askerTrust: number;
  /** Favours the asker's party already owes this party. */
  alreadyOwed: number;
  /** The asker's party broke its word recently. */
  askerWordBroken: boolean;
}
export interface PactDecision { accept: boolean; score: number; reason: string }

/** Would a computer-run party take "vote my way and I owe you one"? */
export function pactDecision(p: PactInput): PactDecision {
  if (p.targetProposedBill && p.askedVote === 'nay') {
    return { accept: false, score: -9, reason: 'It is their own bill. They will not vote it down.' };
  }
  if (p.askerWordBroken) {
    return { accept: false, score: -9, reason: 'Your party broke its word recently. They will not deal with you yet.' };
  }
  if (p.alreadyOwed >= PACT_MAX_OWED_TO_ONE_PARTY) {
    return { accept: false, score: -9, reason: `You already owe them ${p.alreadyOwed} favours. Repay some first.` };
  }
  const lean = partyVoteScore({
    desirability: p.desirability,
    voterInGovernment: p.targetInGovernment,
    billFromGovernment: p.billFromGovernment,
    ownBill: p.targetProposedBill,
  });
  let score = p.askedVote === 'yea' ? lean : -lean;
  if (p.targetInGovernment && p.billFromGovernment && p.askedVote === 'nay') score -= PACT_GOV_LOYALTY;
  score += PACT_FAVOUR_VALUE;
  score += clamp(p.cash, 0, PACT_MAX_CASH) / PACT_CASH_PER_POINT;
  score += PACT_TRUST_WEIGHT * (clamp(p.askerTrust, 0, 100) - 50) / 50;
  score -= PACT_OWED_PENALTY * Math.max(0, p.alreadyOwed);
  if (score > 0) return { accept: true, score, reason: 'They will take your word for it.' };
  const reason = score > -0.25
    ? 'Close. A donation to their party, or a better reputation for keeping your word, would do it.'
    : score > -0.6
      ? 'They dislike this. It would take a large donation as well as the favour.'
      : 'They are dead against this. No favour is worth it to them.';
  return { accept: false, score, reason };
}

// ═══════════════════════════════ LEADERSHIP ═══════════════════════════════

export function leadershipDecision(challengerClout: number, leaderIsHuman: boolean, leaderClout: number): { win: boolean; need: number } {
  const need = leaderIsHuman ? Math.max(LEADERSHIP_MIN_CLOUT, leaderClout + LEADERSHIP_MARGIN) : LEADERSHIP_MIN_CLOUT;
  return { win: challengerClout >= need, need };
}

// ═══════════════════════════════ SITUATIONS ═══════════════════════════════

export interface DealContext {
  roles: Role[];
  inGovernment: boolean;
  inOpposition: boolean;
  phase: string;
  stats: Partial<Record<NationalStat, number>>;
  approval: number;
  hasOpenBill: boolean;
  monthsToElection: number;
}

const PARTY_ROLES: Role[] = ['member', 'mp', 'leader', 'minister', 'premier'];

export function cardEligible(when: CardWhen, ctx: DealContext): boolean {
  const roles = when.roles ?? PARTY_ROLES;
  if (!roles.some(r => ctx.roles.includes(r))) return false;
  if (when.inGovernment && !ctx.inGovernment) return false;
  if (when.inOpposition && !ctx.inOpposition) return false;
  if (when.phase && !when.phase.includes(ctx.phase)) return false;
  if (when.hasOpenBill && !ctx.hasOpenBill) return false;
  if (when.monthsToElectionMax != null && ctx.monthsToElection > when.monthsToElectionMax) return false;
  if (when.approvalAbove != null && !(ctx.approval > when.approvalAbove)) return false;
  if (when.approvalBelow != null && !(ctx.approval < when.approvalBelow)) return false;
  if (when.stat) {
    const v = Number(ctx.stats[when.stat.key] ?? 50);
    if (when.stat.above != null && !(v > when.stat.above)) return false;
    if (when.stat.below != null && !(v < when.stat.below)) return false;
  }
  return true;
}

/** Cards written for a specific office are dealt more often to people who hold it. */
function specificity(card: SituationCard): number {
  const roles = card.when.roles ?? PARTY_ROLES;
  return roles.includes('member') || roles.includes('citizen') ? 1 : 2.5;
}

/**
 * Deal this month's hand. Deterministic for a given seed (character + month),
 * so reloading the page never re-rolls it. Cards seen recently are skipped
 * unless there are not enough others.
 */
export function dealHand(ctx: DealContext, seed: string, recentKeys: Set<string> = new Set(), library: SituationCard[] = SITUATIONS): SituationCard[] {
  const eligible = library.filter(c => cardEligible(c.when, ctx));
  let pool = eligible.filter(c => !recentKeys.has(c.key));
  if (pool.length < HAND_SIZE) pool = eligible;
  const hand: SituationCard[] = [];
  const remaining = [...pool];
  for (let i = 0; i < HAND_SIZE && remaining.length > 0; i++) {
    const weights = remaining.map(c => (c.weight ?? 1) * specificity(c));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = seededUnit(`${seed}|deal|${i}`) * total;
    let idx = 0;
    for (; idx < remaining.length - 1; idx++) { roll -= weights[idx]; if (roll < 0) break; }
    hand.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return hand;
}

/** Which outcome of an option happens. Deterministic for a given seed. */
export function pickOutcome(option: CardOption, seed: string): number {
  const total = option.outcomes.reduce((a, o) => a + o.weight, 0);
  let roll = seededUnit(seed) * total;
  for (let i = 0; i < option.outcomes.length; i++) {
    roll -= option.outcomes[i].weight;
    if (roll < 0) return i;
  }
  return option.outcomes.length - 1;
}

/** Chance (0..1) of each outcome of an option, for showing the odds up front. */
export function outcomeChances(option: CardOption): number[] {
  const total = option.outcomes.reduce((a, o) => a + o.weight, 0) || 1;
  return option.outcomes.map(o => o.weight / total);
}

export function renderText(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
