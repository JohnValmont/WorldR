/**
 * Company goals (pure; tests/businessGoals.test.ts). Facts come from real rows
 * (ManufacturingController.getCompanyManufacturingData businessGoalFacts), never
 * from the browser. Goals pay nothing: they show the next thing worth doing.
 */
import { BUSINESS_GOALS, NEXT_GOALS_SHOWN, type BusinessGoalKey, type BusinessGoalSpec } from '../constants/businessGoals';

export type BusinessGoalFacts = Record<BusinessGoalKey, number>;

export interface BusinessGoalView extends BusinessGoalSpec {
  value: number;
  /** Tiers reached (0..tiers.length). */
  level: number;
  /** The next target, or null when every tier is reached. */
  target: number | null;
  /** 0..1 progress from the previous tier to the next one (1 when maxed). */
  progress: number;
  maxed: boolean;
}

export interface BusinessGoalsView {
  goals: BusinessGoalView[];
  /** Tiers reached across all goals, and how many exist. */
  earned: number;
  total: number;
  /** The open goals closest to their next tier. */
  next: BusinessGoalKey[];
}

export function goalView(spec: BusinessGoalSpec, rawValue: number): BusinessGoalView {
  const value = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
  const level = spec.tiers.filter(t => value >= t).length;
  const maxed = level >= spec.tiers.length;
  const target = maxed ? null : spec.tiers[level];
  const floor = level === 0 ? 0 : spec.tiers[level - 1];
  const progress = maxed ? 1 : Math.max(0, Math.min(1, (value - floor) / Math.max(1e-9, (target as number) - floor)));
  return { ...spec, value, level, target, progress, maxed };
}

export function businessGoals(facts: BusinessGoalFacts): BusinessGoalsView {
  const goals = BUSINESS_GOALS.map(spec => goalView(spec, facts[spec.key] ?? 0));
  const earned = goals.reduce((s, g) => s + g.level, 0);
  const total = goals.reduce((s, g) => s + g.tiers.length, 0);
  const next = goals
    .filter(g => !g.maxed)
    .sort((a, b) => b.progress - a.progress || BUSINESS_GOALS.findIndex(s => s.key === a.key) - BUSINESS_GOALS.findIndex(s => s.key === b.key))
    .slice(0, NEXT_GOALS_SHOWN)
    .map(g => g.key);
  return { goals, earned, total, next };
}

/** Months in a row, counting back from the latest, with net profit above zero. */
export function profitStreak(netProfitsNewestFirst: number[]): number {
  let n = 0;
  for (const p of netProfitsNewestFirst) { if (Number(p) > 0) n++; else break; }
  return n;
}
