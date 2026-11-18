// Coalitions: talks, deals and unity. Every number lives here (docs/COALITIONS.md).

/** Rounds of talks after an election = POL_FORMATION_WINDOW_MONTHS (constants/politics.ts). */

// ── Will a computer-run party accept an offer? (score >= COALITION_ACCEPT_AT) ──
export const COALITION_ACCEPT_AT = 0;
/** Ideology: IDEOLOGY_WEIGHT × (1 − distance / the nation's coalitionMaxDistance). */
export const COALITION_IDEOLOGY_WEIGHT = 0.6;
/** What each ministry is worth to a partner. */
export const COALITION_POST_VALUE: Record<string, number> = {
  finance: 0.20,
  industry: 0.16,
  welfare: 0.16,
  interior: 0.12,
  defence: 0.12,
};
/** Promised laws: weight × the partner's liking of each change, total clamped to ±PROMISE_CAP. */
export const COALITION_PROMISE_WEIGHT = 0.6;
export const COALITION_PROMISE_CAP = 0.4;
export const COALITION_MAX_PROMISES = 3;
export const COALITION_PROMISE_MIN_MONTHS = 3;
export const COALITION_PROMISE_MAX_MONTHS = 12;
/** The deadline a computer-run party gives its own promises. */
export const COALITION_NPC_PROMISE_MONTHS = 6;
/** A computer-run leader only promises a law it can live with (its own liking at least this). */
export const COALITION_NPC_PROMISE_TOLERANCE = -0.1;
/** Becoming head of government. */
export const COALITION_HOG_VALUE = 0.5;
/** Being in government at all. */
export const COALITION_GOVERNMENT_APPETITE = 0.10;
/** Per party in the planned bloc beyond two. */
export const COALITION_CROWDING_PENALTY = 0.08;
/** The offering party broke its word recently (pol_parties.word_broken_until_arc). */
export const COALITION_WORD_BROKEN_PENALTY = 0.5;
/** The same penalty applies for this long to a party that broke a coalition promise to the one it now courts. */
export const COALITION_BROKEN_PROMISE_MEMORY_MONTHS = 60;

// ── Rival blocs ──
/** When a rival bloc courts the same partner, the largest party raises its offer to beat the rival's score by this much. */
export const COALITION_OUTBID_MARGIN = 0.02;
/** Parties ganging up on the largest only try when their coalition would start this united. */
export const COALITION_RIVAL_MIN_UNITY = 45;

// ── Unity (0..100), stored in pol_coalition_agreements.health ──
export const UNITY_BASE = 80;
export const UNITY_PER_EXTRA_PARTY = 12;
export const UNITY_SPREAD_WEIGHT = 40;
export const UNITY_MARGIN_CAP = 10;
export const UNITY_MINORITY_PENALTY = 10;
export const UNITY_PROMISE_KEPT = 8;
export const UNITY_PROMISE_BROKEN = -15;
/** Broken, but the government did bring the law to a vote and lost. */
export const UNITY_PROMISE_TRIED = -7;
export const UNITY_PARTNER_OUTVOTED = -3;
export const UNITY_GOV_BILL_DEFEATED = -4;
export const UNITY_SCANDAL = -5;
export const UNITY_QUIET_RECOVERY = 1;
/** After a partner walks out, unity moves this far toward the new starting level (never above it). */
export const UNITY_AFTER_WALKOUT_BOUNCE = 10;
/** Below this at a month end, one computer-run partner walks out. */
export const UNITY_WALKOUT_AT = 20;
/** Whip strength = NPC_GOV_WHIP × clamp(unity / UNITY_WHIP_REF, MIN, MAX). At UNITY_WHIP_REF it is unchanged. */
export const UNITY_WHIP_REF = 70;
export const UNITY_WHIP_MIN = 0.3;
export const UNITY_WHIP_MAX = 1.25;
/** Plain-English bands for the screen. */
export const UNITY_BANDS: { min: number; label: string }[] = [
  { min: 75, label: 'Solid' },
  { min: 55, label: 'Holding' },
  { min: 35, label: 'Strained' },
  { min: UNITY_WALKOUT_AT, label: 'Fragile' },
  { min: 0, label: 'Breaking up' },
];
