export const MARKETING = { RETENTION: 0.85, MAX_GAIN: 17, HALF_SAT: 30000 };

export function awarenessGain(spend: number): number {
  return MARKETING.MAX_GAIN * (spend / (spend + MARKETING.HALF_SAT));
}

/** Demand multiplier per marketing tier (locked values; see AGENTS.md). Single source of truth. */
export const MARKETING_DEMAND_MULT: Record<string, number> = { none: 1.0, local: 1.15, regional: 1.30, national: 1.50 };
