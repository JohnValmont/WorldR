/**
 * Character creation rules (pure). constants/characterCreation.ts holds the numbers.
 */
import {
  BASE_PROFILE, BACKGROUNDS_BY_KEY, CASH_PER_POINT, CONVICTION_AXES, EDGE_CASH, EDGE_STAT, EDGE_TOKENS,
  HOME_GROUP_POINT_VALUE, STAT_CAP, type Background, type ConvictionAxis,
} from '../constants/characterCreation';

export type EdgeStat = 'charisma' | 'credibility' | 'influence' | 'cash';
export interface StartingProfile {
  background: string | null;
  charisma: number;
  credibility: number;
  influence: number;
  cash: number;
  convictions: Partial<Record<ConvictionAxis, number>> | null;
}

const clampStat = (v: number) => Math.max(0, Math.min(STAT_CAP, Math.round(v)));

/** A background's total worth in points (stat points + cash + home group). */
export function backgroundPoints(b: Background): number {
  return b.charisma + b.credibility + b.influence + b.cash / CASH_PER_POINT + (b.homeGroup ? HOME_GROUP_POINT_VALUE : 0);
}

/** Only known stats, whole tokens, at most EDGE_TOKENS in total. Anything else is dropped. */
export function sanitiseEdge(edge: unknown): Record<EdgeStat, number> {
  const out: Record<EdgeStat, number> = { charisma: 0, credibility: 0, influence: 0, cash: 0 };
  if (!edge || typeof edge !== 'object') return out;
  let left = EDGE_TOKENS;
  for (const k of Object.keys(out) as EdgeStat[]) {
    const n = Math.max(0, Math.floor(Number((edge as any)[k]) || 0));
    const take = Math.min(n, left);
    out[k] = take; left -= take;
  }
  return out;
}

export function sanitiseConvictions(c: unknown): Partial<Record<ConvictionAxis, number>> | null {
  if (!c || typeof c !== 'object') return null;
  const out: Partial<Record<ConvictionAxis, number>> = {};
  for (const axis of CONVICTION_AXES) {
    const v = Number((c as any)[axis]);
    if (Number.isFinite(v)) out[axis] = Math.max(0, Math.min(100, Math.round(v)));
  }
  return Object.keys(out).length ? out : null;
}

/**
 * The starting numbers for a new character. An unknown background gets the base
 * profile (old clients); legacy slider `attributes` are ignored on purpose:
 * they let a client ask for unlimited cash.
 */
export function startingProfile(backgroundKey: unknown, edge: unknown, convictions: unknown): StartingProfile {
  const b = typeof backgroundKey === 'string' ? BACKGROUNDS_BY_KEY[backgroundKey] : undefined;
  const e = sanitiseEdge(edge);
  return {
    background: b?.key ?? null,
    charisma: clampStat(BASE_PROFILE.charisma + (b?.charisma ?? 0) + e.charisma * EDGE_STAT),
    credibility: clampStat(BASE_PROFILE.credibility + (b?.credibility ?? 0) + e.credibility * EDGE_STAT),
    influence: clampStat(BASE_PROFILE.influence + (b?.influence ?? 0) + e.influence * EDGE_STAT),
    cash: BASE_PROFILE.cash + (b?.cash ?? 0) + e.cash * EDGE_CASH,
    convictions: sanitiseConvictions(convictions),
  };
}

/** How well a set of convictions fits a party platform, 0..100 (100 = identical). */
export function convictionFit(convictions: Partial<Record<ConvictionAxis, number>> | null | undefined, platform: Record<string, number>): number | null {
  if (!convictions) return null;
  const axes = CONVICTION_AXES.filter(a => convictions[a] != null);
  if (!axes.length) return null;
  const dist = axes.reduce((s, a) => s + Math.abs((convictions[a] as number) - Number(platform[a] ?? 50)), 0) / axes.length;
  return Math.round(100 - dist);
}

/** The home voter group of a background key (null if none or unknown). */
export function homeGroupOf(backgroundKey: string | null | undefined): string | null {
  return (backgroundKey && BACKGROUNDS_BY_KEY[backgroundKey]?.homeGroup) || null;
}
