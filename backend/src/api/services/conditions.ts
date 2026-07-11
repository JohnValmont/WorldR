/**
 * conditions.ts — Jurisdiction Conditions (GDD v0.5 $11 & $16).
 *
 * Pure, deterministic helpers (no DB, no randomness) for the five per-state
 * indicators: Prosperity · Jobs · Order · Cohesion · Budget (0–10). The governing
 * party's active policy (its platform) sets each month's target; conditions drift
 * toward it. Conditions modulate bloc turnout and trigger crisis events at
 * thresholds. Everything traces to real state, so results are reproducible.
 */
import { Axis, AXES, Platform } from '../constants/politics';
import {
  ConditionKey,
  POL_CONDITION_KEYS,
  POL_CONDITION_MIN,
  POL_CONDITION_MAX,
  POL_CONDITION_NEUTRAL,
  POL_CONDITION_DRIFT_RATE,
  POL_POLICY_CONDITION_EFFECTS,
  POL_CONDITION_TURNOUT_SENSITIVITY,
  POL_CONDITION_TURNOUT_MAX_SWING,
  POL_CRISIS_THRESHOLDS,
} from '../constants/politics';

export type Conditions = Record<ConditionKey, number>;

export const NEUTRAL_CONDITIONS: Conditions = {
  prosperity: POL_CONDITION_NEUTRAL,
  jobs: POL_CONDITION_NEUTRAL,
  order: POL_CONDITION_NEUTRAL,
  cohesion: POL_CONDITION_NEUTRAL,
  budget: POL_CONDITION_NEUTRAL,
};

function clampCondition(v: number): number {
  return Math.max(POL_CONDITION_MIN, Math.min(POL_CONDITION_MAX, v));
}

/** Read the five Conditions off a pol_states row (pg returns NUMERICs as strings). */
export function readConditionsFromRow(stateRow: any): Conditions {
  if (!stateRow) return { ...NEUTRAL_CONDITIONS };
  const c: Conditions = { ...NEUTRAL_CONDITIONS };
  for (const key of POL_CONDITION_KEYS) {
    const raw = stateRow[`cond_${key}`];
    if (raw !== undefined && raw !== null) c[key] = Number(raw);
  }
  return c;
}

/** Map a platform plank value (0–100, engine 20/50/80 scale) to a rung. */
function rungFor(value: number): 'low' | 'mid' | 'high' {
  if (value <= 35) return 'low';
  if (value >= 65) return 'high';
  return 'mid';
}

/**
 * The condition targets implied by the governing party's active policy. Each
 * pillar's rung contributes deltas (GDD $16) to the neutral baseline. With no
 * government (null platform), targets pull back toward neutral.
 */
export function computeConditionTargets(governingPlatform: Platform | null | undefined): Conditions {
  const target: Conditions = { ...NEUTRAL_CONDITIONS };
  if (!governingPlatform) return target;

  for (const axis of AXES as Axis[]) {
    const value = governingPlatform[axis];
    if (typeof value !== 'number') continue;
    const effects = POL_POLICY_CONDITION_EFFECTS[axis][rungFor(value)];
    for (const key of POL_CONDITION_KEYS) {
      const delta = effects[key];
      if (delta) target[key] += delta;
    }
  }

  for (const key of POL_CONDITION_KEYS) {
    target[key] = clampCondition(target[key]);
  }
  return target;
}

/** Drift current conditions a fraction of the way toward their targets (clamped 0–10). */
export function driftConditions(current: Conditions, targets: Conditions): Conditions {
  const next: Conditions = { ...current };
  for (const key of POL_CONDITION_KEYS) {
    const cur = current[key];
    next[key] = clampCondition(cur + POL_CONDITION_DRIFT_RATE * (targets[key] - cur));
  }
  return next;
}

/**
 * Turnout multiplier for a bloc given current conditions (GDD $5: Turnout ×
 * Conditions). Sums the bloc's sensitivity to each condition's deviation from
 * neutral, clamped to ±POL_CONDITION_TURNOUT_MAX_SWING. Returns 1.0 when no
 * conditions are supplied, so the engine is unchanged without this system.
 */
export function conditionTurnoutMultiplier(segmentKey: string, conditions: Conditions | null | undefined): number {
  if (!conditions) return 1.0;
  const sensitivity = POL_CONDITION_TURNOUT_SENSITIVITY[segmentKey];
  if (!sensitivity) return 1.0;

  let swing = 0;
  for (const key of POL_CONDITION_KEYS) {
    const s = sensitivity[key];
    if (!s) continue;
    swing += s * ((conditions[key] - POL_CONDITION_NEUTRAL) / POL_CONDITION_NEUTRAL);
  }
  const clamped = Math.max(-POL_CONDITION_TURNOUT_MAX_SWING, Math.min(POL_CONDITION_TURNOUT_MAX_SWING, swing));
  return 1 + clamped;
}

export type CrisisKind = keyof typeof POL_CRISIS_THRESHOLDS;

/** Which crises are currently active — a condition at/below its threshold. Deterministic. */
export function detectCrises(conditions: Conditions): CrisisKind[] {
  const active: CrisisKind[] = [];
  for (const kind of Object.keys(POL_CRISIS_THRESHOLDS) as CrisisKind[]) {
    const { key, at } = POL_CRISIS_THRESHOLDS[kind];
    if (conditions[key] <= at) active.push(kind);
  }
  return active;
}
