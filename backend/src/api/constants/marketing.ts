export const MARKETING = { RETENTION: 0.85, MAX_GAIN: 17, HALF_SAT: 30000 };

export function awarenessGain(spend: number): number {
  return MARKETING.MAX_GAIN * (spend / (spend + MARKETING.HALF_SAT));
}
