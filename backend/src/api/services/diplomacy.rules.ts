/**
 * Diplomacy: pure rules for relations and treaties (docs/NATIONS_SIMULATION.md, layer 5).
 * No database access. Numbers come from constants/diplomacy.ts.
 */
import {
  NPC_EMBARGO_MAX_RELATIONS, NPC_PACT_MIN_RELATIONS, NPC_TREATY_MIN_LIKING, PACT_MIN_RELATIONS, RELATIONS_DRIFT,
  RELATIONS_MAX, RELATIONS_MIN, RELATIONS_START, RELATIONS_TARIFF_PENALTY, RELATIONS_TARIFF_THRESHOLD,
  TREATY_KINDS, TREATY_SPECS, TreatyKind,
} from '../constants/diplomacy';

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** A treaty bill's option: "<kind>:<partner pol_states.code>". */
export function treatyOption(kind: TreatyKind, partnerCode: string): string {
  return `${kind}:${partnerCode}`;
}

export function parseTreatyOption(option: string | null | undefined): { kind: TreatyKind; partner: string } | null {
  if (!option) return null;
  const [kind, partner] = String(option).split(':');
  if (!partner || !(TREATY_KINDS as string[]).includes(kind)) return null;
  return { kind: kind as TreatyKind, partner };
}

/** How much a party with this platform likes a treaty of this kind (same scale as a law change). */
export function treatyLiking(platform: Record<string, number> | null | undefined, kind: TreatyKind): number {
  const spec = TREATY_SPECS[kind];
  let v = spec.liking.base;
  for (const [axis, w] of Object.entries(spec.liking.axes)) {
    const a = Number(platform?.[axis] ?? 50);
    v += w * ((Number.isFinite(a) ? a : 50) - 50) / 50;
  }
  return Math.round(v * 1000) / 1000;
}

/** The two nations of a pair in a fixed order, so each pair has one relations row. */
export function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export interface RelationsMonth {
  score: number;
  /** Treaties in force between the two (each listed once). */
  active: TreatyKind[];
  /** Average tariff on traded goods of each side (0-1). */
  tariffA: number;
  tariffB: number;
}

/** One month of relations: drift toward neutral, plus treaties, minus high tariffs. */
export function stepRelations(m: RelationsMonth): number {
  let s = m.score + RELATIONS_DRIFT * (RELATIONS_START - m.score);
  for (const k of m.active) s += TREATY_SPECS[k].relationsPerMonth;
  for (const t of [m.tariffA, m.tariffB]) if (t > RELATIONS_TARIFF_THRESHOLD) s -= RELATIONS_TARIFF_PENALTY;
  return Math.round(clamp(s, RELATIONS_MIN, RELATIONS_MAX) * 100) / 100;
}

export function bumpRelations(score: number, delta: number): number {
  return Math.round(clamp(score + delta, RELATIONS_MIN, RELATIONS_MAX) * 100) / 100;
}

export interface ProposalCheck {
  kind: TreatyKind;
  /** Treaties in force or awaiting a vote between the two nations. */
  activeOrPending: TreatyKind[];
  relations: number;
  /** Months since this kind was last rejected between the two (null = never). */
  monthsSinceRejected: number | null;
  rejectCooldown: number;
  /** Does the nation that must ratify have a government to bring the bill? */
  ratifierHasGovernment: boolean;
}

/** Why a proposal is not allowed, or null if it is. */
export function proposalProblem(c: ProposalCheck): string | null {
  const spec = TREATY_SPECS[c.kind];
  if (c.activeOrPending.includes(c.kind)) return `A ${spec.name.toLowerCase()} with that nation is already in force or awaiting a vote.`;
  if (c.kind !== 'embargo' && c.activeOrPending.includes('embargo')) return 'You cannot sign a pact with a nation under embargo. Lift the embargo first.';
  if (c.kind !== 'embargo' && c.relations < PACT_MIN_RELATIONS) return `Relations are too poor for a pact (below ${PACT_MIN_RELATIONS}).`;
  if (c.monthsSinceRejected != null && c.monthsSinceRejected < c.rejectCooldown) {
    return `They rejected a ${spec.name.toLowerCase()} ${c.monthsSinceRejected} month${c.monthsSinceRejected === 1 ? '' : 's'} ago. Wait ${c.rejectCooldown - c.monthsSinceRejected} more.`;
  }
  if (!c.ratifierHasGovernment) return spec.ratifiedBy === 'own' ? 'Your nation has no government to bring the bill.' : 'That nation has no government to bring the treaty before its parliament.';
  return null;
}

export interface NpcCandidate {
  partner: string;
  relations: number;
  activeOrPending: TreatyKind[];
  /** Kinds still on rejection cooldown with this partner. */
  coolingDown: TreatyKind[];
  partnerHasGovernment: boolean;
}

/**
 * What a computer-led government proposes, if anything: the treaty its lead
 * party likes most that is allowed and sensible (pacts with friends, embargoes
 * only on nations it truly dislikes).
 */
export function npcTreatyChoice(platform: Record<string, number> | null | undefined, candidates: NpcCandidate[]): { kind: TreatyKind; partner: string; liking: number } | null {
  let best: { kind: TreatyKind; partner: string; liking: number } | null = null;
  for (const c of candidates) {
    for (const kind of TREATY_KINDS) {
      if (c.activeOrPending.includes(kind) || c.coolingDown.includes(kind)) continue;
      if (kind === 'embargo') {
        if (c.relations > NPC_EMBARGO_MAX_RELATIONS) continue;
      } else {
        if (c.relations < NPC_PACT_MIN_RELATIONS || c.activeOrPending.includes('embargo') || !c.partnerHasGovernment) continue;
      }
      const liking = treatyLiking(platform, kind);
      if (liking < NPC_TREATY_MIN_LIKING) continue;
      if (!best || liking > best.liking) best = { kind, partner: c.partner, liking };
    }
  }
  return best;
}

/** Treaty effects on one nation's rating, from the treaties it is part of. */
export function treatyRatingBonus(active: TreatyKind[]): { diplomacy: number; military: number } {
  return active.reduce((a, k) => ({ diplomacy: a.diplomacy + TREATY_SPECS[k].diplomacyBonus, military: a.military + TREATY_SPECS[k].militaryBonus }), { diplomacy: 0, military: 0 });
}
