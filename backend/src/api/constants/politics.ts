export type Axis = "taxation" | "labour" | "investment" | "trade" | "stability";

export type Platform = Record<Axis, number>;

export const AXES: Axis[] = ["taxation", "labour", "investment", "trade", "stability"];

export interface VoterSegment {
  key: string;
  label: string;
  size: number;
  ideal: Platform;
  priorities: Record<Axis, number>;
}

export const SEGMENTS: VoterSegment[] = [
  {
    key: "industrial_workers",
    label: "Industrial Workers",
    size: 0.34,
    ideal: { taxation: 30, labour: 85, investment: 75, trade: 55, stability: 55 },
    priorities: { labour: 0.40, investment: 0.25, taxation: 0.15, stability: 0.12, trade: 0.08 }
  },
  {
    key: "logistics_trade_workers",
    label: "Logistics & Trade Workers",
    size: 0.18,
    ideal: { taxation: 45, labour: 65, investment: 70, trade: 80, stability: 55 },
    priorities: { trade: 0.35, investment: 0.25, labour: 0.20, taxation: 0.12, stability: 0.08 }
  },
  {
    key: "factory_business_owners",
    label: "Factory & Business Owners",
    size: 0.12,
    ideal: { taxation: 88, labour: 30, investment: 70, trade: 75, stability: 60 },
    priorities: { taxation: 0.45, investment: 0.20, trade: 0.20, stability: 0.10, labour: 0.05 }
  },
  {
    key: "civic_professionals",
    label: "Civic Professionals",
    size: 0.20,
    ideal: { taxation: 60, labour: 55, investment: 65, trade: 60, stability: 70 },
    priorities: { stability: 0.30, investment: 0.25, taxation: 0.20, labour: 0.15, trade: 0.10 }
  },
  {
    key: "suburban_families",
    label: "Suburban Families",
    size: 0.16,
    ideal: { taxation: 55, labour: 55, investment: 55, trade: 55, stability: 75 },
    priorities: { stability: 0.35, taxation: 0.25, labour: 0.20, investment: 0.12, trade: 0.08 }
  }
];

export const POL_FIT_EXP = 3.5;
export const POL_REACH_MIN = 0.05;
export const POL_REACH_MAX = 1.0;
export const POL_REACH_HALF_SAT = 120;
export const POL_INCUMBENCY_BONUS = 1.15;
export const POL_BASE_TURNOUT = 0.58;
export const POL_FIRST_CYCLE_MONTHS = 12;
export const POL_FILING_WINDOW_MONTHS = 3;
export const POL_CAMPAIGN_WINDOW_MONTHS = 6;
export const POL_FORMATION_WINDOW_MONTHS = 2;

// ── Jurisdictions (federal model, GDD v0.5 $3) ──────────────────────────────
// Drennia is an Australia-style federation: every State Assembly and the
// National Parliament run SEPARATE elections on SEPARATE clocks. Keyed by
// pol_states.code. Seats/majority/term mirror frontend _lib/model.ts
// JURISDICTION_MODEL. State terms are 24 months, staggered every 6 months so a
// state election lands somewhere in the nation every ~6 months; National is 48.
export type JurisdictionTier = 'state' | 'national';
export interface JurisdictionSpec {
  seats: number;
  majority: number;
  termMonths: number;
  electionOffsetMonths: number;
  tier: JurisdictionTier;
}

export const JURISDICTIONS: Record<string, JurisdictionSpec> = {
  ironvale:  { seats: 61, majority: 31,  termMonths: 48, electionOffsetMonths: 0,  tier: 'state' },
  drennport: { seats: 120, majority: 61,  termMonths: 24, electionOffsetMonths: 6,  tier: 'state' },
  westport:  { seats: 72,  majority: 37,  termMonths: 24, electionOffsetMonths: 12, tier: 'state' },
  greenmere: { seats: 50,  majority: 26,  termMonths: 24, electionOffsetMonths: 18, tier: 'state' },
  national:  { seats: 20, majority: 11, termMonths: 48, electionOffsetMonths: 0,  tier: 'national' },
};

// Safe fallback for any unknown/unseeded jurisdiction code (mirrors a typical
// mid-size State Assembly) so the engine degrades gracefully.
export const POL_DEFAULT_JURISDICTION: JurisdictionSpec = {
  seats: 61, majority: 31, termMonths: 48, electionOffsetMonths: 0, tier: 'state',
};

/** Resolve a jurisdiction spec from a pol_states.code (case-sensitive). */
export function getJurisdiction(code: string | null | undefined): JurisdictionSpec {
  return (code && JURISDICTIONS[code]) || POL_DEFAULT_JURISDICTION;
}
export function getSeatsForState(code: string | null | undefined): number {
  return getJurisdiction(code).seats;
}
export function getMajorityForState(code: string | null | undefined): number {
  return getJurisdiction(code).majority;
}
export function getTermMonthsForState(code: string | null | undefined): number {
  return getJurisdiction(code).termMonths;
}
export function getElectionOffsetMonths(code: string | null | undefined): number {
  return getJurisdiction(code).electionOffsetMonths;
}

// ── Legacy single-council constants (pre-federal) ───────────────────────────
// @deprecated Prefer the per-jurisdiction helpers above (getSeatsForState, etc.).
// Retained only as fallbacks for the feedback/display layer; they now resolve to
// the default jurisdiction so unthreaded call sites stay sane.
export const POL_COUNCIL_SEATS = POL_DEFAULT_JURISDICTION.seats;        // was 61
export const POL_MAJORITY_SEATS = POL_DEFAULT_JURISDICTION.majority;    // was 31
export const POL_TERM_LENGTH_MONTHS = POL_DEFAULT_JURISDICTION.termMonths; // was 48
export const POL_COALITION_MAX_DISTANCE = 0.30;
export const POL_NPC_MAX_SPEND_FRAC = 0.25;
// A projected segment share below this counts as "trailing" for the NPC campaign
// brain, prompting it to spend on that segment. (Was an inline 0.20 magic number.)
export const POL_NPC_TRAILING_SHARE = 0.20;
export const POL_TENDER_INFLUENCE_TIEBREAK = true;
export const PARTY_FOUNDING_COST = 25000;
export const POL_VOTE_JITTER = 0.04;
export const POL_FUNDRAISER_BASE = 5000;
export const POL_FUNDRAISER_CHARISMA_MULT = 100;
export const POL_ENDORSEMENT_INFLUENCE_COST = 5;

// ── Jurisdiction Conditions (GDD v0.5 $11 & $16) ────────────────────────────
// Five per-state indicators the governing party's active policy moves each month;
// they feed bloc turnout and trigger deterministic crisis events at thresholds.
// All values are TUNABLE. Prosperity/Jobs/Order/Cohesion/Budget live on a 0–10
// scale (v0: Budget is a fiscal-health index, not yet a money ledger).
export type ConditionKey = 'prosperity' | 'jobs' | 'order' | 'cohesion' | 'budget';
export const POL_CONDITION_KEYS: ConditionKey[] = ['prosperity', 'jobs', 'order', 'cohesion', 'budget'];
export const POL_CONDITION_MIN = 0;
export const POL_CONDITION_MAX = 10;
export const POL_CONDITION_NEUTRAL = 5;
// Fraction of the gap to the policy-implied target closed each in-game month.
// ~0.34 ⇒ conditions converge over roughly three months (smooth, deterministic).
export const POL_CONDITION_DRIFT_RATE = 0.34;

type ConditionDelta = Partial<Record<ConditionKey, number>>;

// Per-Pillar, per-rung condition pressure — GDD $16 effect tables condensed onto
// the engine's three-rung 20/50/80 platform scale. Rung from a plank value:
// <=35 = 'low', >=65 = 'high', else 'mid'. Deltas are added to the neutral (5)
// baseline to form each month's target for the condition. Plain-name mapping and
// rung semantics follow _lib/model.ts LADDERS (never rename the engine Axis keys).
export const POL_POLICY_CONDITION_EFFECTS: Record<Axis, { low: ConditionDelta; mid: ConditionDelta; high: ConditionDelta }> = {
  // Tax & Spending — low(20)='Tax the Wealthy'/generous spend, high(80)='Low Taxes'/austere.
  taxation: {
    low:  { prosperity: +1, cohesion: +1, budget: -1 },
    mid:  {},
    high: { budget: +2, prosperity: -1, cohesion: -1 },
  },
  // Workers & Jobs — low(20)='Employer-Led', high(80)='Worker-First'.
  labour: {
    low:  { prosperity: +1, jobs: -1 },
    mid:  {},
    high: { jobs: +1, cohesion: +1, prosperity: -1 },
  },
  // State Investment — low(20)='Free Market', high(80)='State-Run'.
  investment: {
    low:  { prosperity: +1, jobs: -1 },
    mid:  {},
    high: { jobs: +2, prosperity: -1, budget: -1 },
  },
  // Trade — low(20)='Closed/Protected', high(80)='Open/Free'.
  trade: {
    low:  { jobs: +2, prosperity: -2 },
    mid:  {},
    high: { prosperity: +2, jobs: -2 },
  },
  // Order & Reform — low(20)='Bold Reform'/open, high(80)='Law & Order'/strict.
  stability: {
    low:  { cohesion: +1, prosperity: +1, order: -1 },
    mid:  {},
    high: { order: +2, cohesion: -1 },
  },
};

// Per-bloc turnout sensitivity to Conditions (GDD $5 diagram: Turnout × Conditions).
// Positive ⇒ the bloc turns out MORE as the condition rises above neutral. Keyed
// by SEGMENTS[].key. The summed swing is clamped to ±POL_CONDITION_TURNOUT_MAX_SWING.
export const POL_CONDITION_TURNOUT_SENSITIVITY: Record<string, Partial<Record<ConditionKey, number>>> = {
  industrial_workers:      { jobs: +0.6, prosperity: +0.2, order: -0.1 },
  logistics_trade_workers: { prosperity: +0.4, jobs: +0.3 },
  factory_business_owners: { prosperity: +0.5, budget: +0.3, order: +0.2 },
  civic_professionals:     { cohesion: +0.4, order: +0.2, prosperity: +0.2 },
  suburban_families:       { order: +0.4, cohesion: +0.3, prosperity: +0.2 },
};
export const POL_CONDITION_TURNOUT_MAX_SWING = 0.30; // turnout multiplier clamped to [0.70, 1.30]

// Crisis thresholds (GDD $11). A condition at/below its threshold fires the crisis
// deterministically from real state — no scripting. Each crisis dings the governing
// party's credibility/treasury only (never the tuned election math).
export const POL_CRISIS_THRESHOLDS: Record<string, { key: ConditionKey; at: number; headline: string; body: string }> = {
  crisis_debt:     { key: 'budget',   at: 3, headline: 'DEBT CRISIS',      body: 'The treasury is stretched to breaking point as the budget deteriorates.' },
  crisis_jobs:     { key: 'jobs',     at: 3, headline: 'CIVIL UNREST',     body: 'Mass unemployment drives workers into the streets in protest.' },
  crisis_order:    { key: 'order',    at: 3, headline: 'PUBLIC UNREST',    body: 'Order breaks down as unrest spreads across the jurisdiction.' },
  crisis_cohesion: { key: 'cohesion', at: 3, headline: 'RISING EXTREMISM', body: 'A fractured society sees extremist movements gain ground.' },
};
export const POL_CRISIS_CREDIBILITY_HIT = 3;     // subtracted from the governing leader's credibility
export const POL_CRISIS_TREASURY_HIT     = 10000; // subtracted from the governing party's treasury

export const POL_DEFAULT_INDUSTRY_TAX_RATE = 0.20;
export const POL_NPC_DEFAULT_TREASURY = 500000;

export const POL_FACTOR_DELTAS = {
  WIN_SEAT: { influence: 6, credibility: 3 },
  BECOME_PREMIER: { influence: 12, credibility: 6, charisma: 3 },
  BILL_PASSES: { credibility: 4 },
  TENDER_WINS: { credibility: 4 },
  LOSE_SEAT: { influence: -5 },
  BILL_FAILS: { credibility: -3 },
  ACTIVE_CAMPAIGN: { charisma: 2 } // >= 3 actions
};

// ── Governing Phase Events ────────────────────────────────────────────────────
/** One event fires per governing month. Deterministic: month % templates.length */
export const GOVERNING_EVENTS_ENABLED = true;

/** Effect magnitudes — all tunable here, never inline */
export const GOV_EVENT_EFFECTS = {
  TAX_PRESSURE_CREDIBILITY:    -1,
  CIVIC_APPROVAL_INFLUENCE:    +1,
  PROCUREMENT_SURPLUS_CASH:    50_000,
  CORRUPTION_CREDIBILITY:      -2,
  OPPOSITION_RALLY_CREDIBILITY: +1,
};

export interface GoverningEventTemplate {
  kind: string;            // discriminator stored in pol_ledger_events.kind
  headline: string;
  body: string;
  /** Who gets the effect: 'premier' | 'opposition_leader' | 'governing_party' | null */
  target: 'premier' | 'opposition_leader' | 'governing_party' | null;
  /** Factor deltas applied to target character (null = no character effect) */
  characterDelta: Record<string, number> | null;
  /** Treasury delta applied to governing party (0 = none) */
  partyTreasuryDelta: number;
}

export const GOVERNING_EVENT_TEMPLATES: GoverningEventTemplate[] = [
  {
    kind: 'gov_industrial_dispute',
    headline: 'Ironvale steelworkers\' union calls warning strike',
    body: 'Disruption risk rises across Ironvale\'s industrial corridor as union representatives cite unsafe conditions and stalled wage negotiations.',
    target: null,
    characterDelta: null,
    partyTreasuryDelta: 0,
  },
  {
    kind: 'gov_tax_pressure',
    headline: 'Business council petitions Premier for tax relief',
    body: 'The Ironvale Chamber of Commerce submits a formal petition citing the current industry tax rate as a drag on reinvestment and hiring.',
    target: 'premier',
    characterDelta: { credibility: GOV_EVENT_EFFECTS.TAX_PRESSURE_CREDIBILITY },
    partyTreasuryDelta: 0,
  },
  {
    kind: 'gov_civic_approval',
    headline: 'Civic satisfaction index up — stability restored',
    body: 'The Drennport Civic Monitor reports a rise in public satisfaction with institutional performance this month across all four Drennia states.',
    target: 'premier',
    characterDelta: { influence: GOV_EVENT_EFFECTS.CIVIC_APPROVAL_INFLUENCE },
    partyTreasuryDelta: 0,
  },
  {
    kind: 'gov_procurement_surplus',
    headline: 'Government procurement budget underspent — surplus returned',
    body: 'The State Treasury confirms an unspent procurement allocation has been returned to the governing party\'s discretionary fund this month.',
    target: 'governing_party',
    characterDelta: null,
    partyTreasuryDelta: GOV_EVENT_EFFECTS.PROCUREMENT_SURPLUS_CASH,
  },
  {
    kind: 'gov_corruption_whisper',
    headline: 'Anonymous tip sheet circulates in Drennport press',
    body: 'An unsigned document alleging improper conduct in last month\'s tender award process has begun circulating among political correspondents.',
    target: 'premier',
    characterDelta: { credibility: GOV_EVENT_EFFECTS.CORRUPTION_CREDIBILITY },
    partyTreasuryDelta: 0,
  },
  {
    kind: 'gov_investment_uptick',
    headline: 'Ironvale factory orders rise — investors cautiously optimistic',
    body: 'Order books at three Ironvale manufacturing facilities are up month-on-month, prompting cautious optimism among industrial analysts.',
    target: null,
    characterDelta: null,
    partyTreasuryDelta: 0,
  },
  {
    kind: 'gov_opposition_rally',
    headline: 'Opposition holds mass rally at Westgate Square',
    body: 'Several thousand supporters gathered this month as the principal opposition party staged its largest public demonstration of the current term.',
    target: 'opposition_leader',
    characterDelta: { credibility: GOV_EVENT_EFFECTS.OPPOSITION_RALLY_CREDIBILITY },
    partyTreasuryDelta: 0,
  },
];


// ── Engagement / "Pulse" tunables (feedback-layer only; do NOT affect the pure engine) ──
export const POL_PULSE = {
  SEGMENT_WIN_MARGIN: 0.05,       // lead >= 5% over 2nd place in a segment => "winning"
  SEGMENT_CONTESTED_MARGIN: 0.05, // within 5% of the leader => "contested"
  NEAR_MISS_SEATS: 5,             // show "X seats from power" tension when within this many
  RIVAL_MAX_SEAT_GAP: 8,          // a party within this seat gap is surfaced as your rival
  MOMENTUM_MIN_DELTA: 0.005       // ignore per-month share swings smaller than this (noise floor)
};

export interface CampaignAction {
  type: string;
  cost_cash: number;
  effort: number;
  targeting: "segment" | "all" | "none";
  gates?: { min_credibility?: number; uses_influence?: boolean };
}

export const CAMPAIGN_ACTIONS: CampaignAction[] = [
  { type: "canvass", cost_cash: 1500, effort: 8, targeting: "segment" },
  { type: "rally", cost_cash: 5000, effort: 22, targeting: "segment" },
  { type: "media_ad", cost_cash: 12000, effort: 30, targeting: "all" },
  { type: "debate", cost_cash: 0, effort: 18, targeting: "all", gates: { min_credibility: 40 } },
  { type: "endorsement", cost_cash: 0, effort: 15, targeting: "segment", gates: { uses_influence: true } },
  { type: "fundraiser", cost_cash: 0, effort: 0, targeting: "none" }
];

// ── AP (Action Point) System ───────────────────────────────────────────────
// All values are TUNABLE DEFAULTS — change here, never inline.

// ── AP grant model (GDD v0.5 $7, refined) ───────────────────────────────────
// AP REFRESHES to a flat monthly grant — it does NOT accumulate. Each in-game
// month current_ap is RESET to AP_MONTHLY_GRANT regardless of what was left over.
// Example: hold 6 leftover AP at month end → next month you have 12 (NOT 18).
// Voting is always free.
export const AP_MONTHLY_GRANT            = 12;

// ── Legacy AP-cap tunables (pre-v0.5) ───────────────────────────────────────
// Retained for reference / potential future office-Mandate wiring. The old
// per-office AP-cap system is retired; the effective cap is now AP_MONTHLY_GRANT
// and regen no longer uses AP_REGEN_PER_ARC.
export const AP_BASE_CAP                 = 4;
export const AP_BONUS_LEGISLATIVE_SEAT   = 2;
export const AP_BONUS_SECRETARY          = 2;
export const AP_BONUS_GOVERNOR           = 3;
export const AP_BONUS_COMMITTEE_CHAIR    = 1;
export const AP_REGEN_PER_ARC            = 1;

// ── Canonical AP cost table ─────────────────────────────────────────────────
// SOURCE OF TRUTH mirror of frontend _lib/model.ts → AP_MODEL.COSTS (GDD $7).
// The discrete AP_COST_* constants below are aligned to these weights.
export const AP_MODEL_COSTS = {
  vote:            0,
  campaign:        2,
  scout:           2,
  whip:            2,
  propose_law:     3,
  court_bloc:      3,
  expedite_bill:   4,
  recruit:         4,
  executive_order: 5,
  signature:       6,
} as const;

// AP costs per action (weighted per GDD $7 / AP_MODEL_COSTS)
export const AP_COST_STATEMENT           = AP_MODEL_COSTS.court_bloc;   // targeted Statement / court a bloc
export const AP_COST_FUNDRAISE           = 1;                            // fine-grained action (not in canonical table)
export const AP_COST_RECRUIT             = AP_MODEL_COSTS.recruit;       // 4 (+Treasury)
export const AP_COST_ENDORSEMENT_AP      = 2;                            // fine-grained action (not in canonical table)
export const AP_COST_SCOUT               = AP_MODEL_COSTS.scout;         // 2
export const AP_COST_NEGOTIATE           = 2;                            // fine-grained action (not in canonical table)
export const AP_COST_EXECUTIVE_ORDER     = AP_MODEL_COSTS.executive_order; // 5
export const AP_COST_APPOINT_SECRETARY   = 2;
export const AP_COST_ADDRESS_STATE       = 1;
export const AP_COST_EMERGENCY_RESPONSE  = 2;
export const AP_COST_RESHUFFLE_CABINET   = 2;
export const AP_COST_BILL_MINOR          = 2;
export const AP_COST_BILL_MODERATE       = 3;
export const AP_COST_BILL_MAJOR          = 4;
export const AP_COST_BILL_CONSTITUTIONAL = 6;
export const AP_COST_AMEND_MINOR         = 1;
export const AP_COST_AMEND_CLAUSE        = 2;
export const AP_COST_JOIN_COMMITTEE      = 1;
export const AP_COST_WHIP                = AP_MODEL_COSTS.whip;         // 2
// Votes always cost 0 AP — this is intentional and non-configurable.
export const AP_COST_VOTE                = AP_MODEL_COSTS.vote;         // 0

// ── Roster Cap Bands ─────────────────────────────────────────────────────
// Ordered high-to-low; first matching band wins.
// TUNABLE — adjust thresholds/caps here without touching game logic.
export const ROSTER_CAP_BANDS: { minPop: number; cap: number }[] = [
  { minPop: 75, cap: 10 },
  { minPop: 50, cap:  7 },
  { minPop: 25, cap:  4 },
  { minPop:  0, cap:  2 },
];

// Cost drawn from party treasury when recruiting one NPC. TUNABLE.
export const RECRUIT_COST_CASH = 5_000;

// NPC platform drift variance per axis (0-100 scale). TUNABLE.
export const RECRUIT_PLATFORM_DRIFT = 15;

// General action types (used as discriminator in doGeneralAction)
export const GENERAL_ACTION_TYPES = [
  'statement', 'fundraise', 'recruit',
  'endorsement', 'scout', 'negotiate',
  // Doctrine signature actions — gated by party doctrine_id
  'union_address', 'investor_roadshow', 'town_hall',
  'shop_floor_tour', 'listening_tour', 'coalition_outreach',
] as const;
export type GeneralActionType = typeof GENERAL_ACTION_TYPES[number];

// ── Doctrine System ────────────────────────────────────────────────────────
// Six party identities. Each auto-sets all 5 platform axes at founding.

export const DOCTRINE_IDS = [
  'forge_accord', 'the_ledger', 'the_homestead',
  'the_commons', 'the_vanguard', 'the_compact',
] as const;
export type DoctrineId = typeof DOCTRINE_IDS[number];

/** Numeric platform values each Doctrine maps to (mirrors PLATFORM_STANCES values). */
export const DOCTRINE_PLATFORMS: Record<DoctrineId, Record<Axis, number>> = {
  forge_accord:  { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 50 },
  the_ledger:    { taxation: 80, labour: 20, investment: 20, trade: 80, stability: 80 },
  the_homestead: { taxation: 50, labour: 50, investment: 20, trade: 20, stability: 80 },
  the_commons:   { taxation: 20, labour: 80, investment: 80, trade: 50, stability: 20 },
  the_vanguard:  { taxation: 50, labour: 50, investment: 50, trade: 80, stability: 20 },
  the_compact:   { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
};

/** Which general action type is unlocked by each Doctrine. */
export const DOCTRINE_SIGNATURE_ACTION: Record<DoctrineId, string> = {
  forge_accord:  'union_address',
  the_ledger:    'investor_roadshow',
  the_homestead: 'town_hall',
  the_commons:   'shop_floor_tour',
  the_vanguard:  'listening_tour',
  the_compact:   'coalition_outreach',
};

// AP costs for signature actions (Creed-locked) — all 6 AP per GDD $7 (AP_MODEL_COSTS.signature).
export const AP_COST_UNION_ADDRESS       = AP_MODEL_COSTS.signature;
export const AP_COST_INVESTOR_ROADSHOW   = AP_MODEL_COSTS.signature;
export const AP_COST_TOWN_HALL           = AP_MODEL_COSTS.signature;
export const AP_COST_SHOP_FLOOR_TOUR     = AP_MODEL_COSTS.signature;
export const AP_COST_LISTENING_TOUR      = AP_MODEL_COSTS.signature;
export const AP_COST_COALITION_OUTREACH  = AP_MODEL_COSTS.signature;

/** Map action type → AP cost for the backend to look up. */
export const SIGNATURE_ACTION_AP_COST: Record<string, number> = {
  union_address:      AP_COST_UNION_ADDRESS,
  investor_roadshow:  AP_COST_INVESTOR_ROADSHOW,
  town_hall:          AP_COST_TOWN_HALL,
  shop_floor_tour:    AP_COST_SHOP_FLOOR_TOUR,
  listening_tour:     AP_COST_LISTENING_TOUR,
  coalition_outreach: AP_COST_COALITION_OUTREACH,
};

/** Valid tenet IDs (for validation). */
export const TENET_IDS = [
  'forge_radicals', 'forge_modernizers',
  'ledger_hardliners', 'ledger_expansionists',
  'homestead_roots', 'homestead_pragmatists',
  'commons_vanguard', 'commons_outreach',
  'vanguard_professionals', 'vanguard_traders',
  'compact_builders', 'compact_populists',
] as const;
export type TenetId = typeof TENET_IDS[number];

/** Which tenets belong to which doctrine. */
export const DOCTRINE_TENETS: Record<DoctrineId, [string, string]> = {
  forge_accord:  ['forge_radicals',        'forge_modernizers'],
  the_ledger:    ['ledger_hardliners',     'ledger_expansionists'],
  the_homestead: ['homestead_roots',       'homestead_pragmatists'],
  the_commons:   ['commons_vanguard',      'commons_outreach'],
  the_vanguard:  ['vanguard_professionals','vanguard_traders'],
  the_compact:   ['compact_builders',      'compact_populists'],
};

/** Fit bonus applied per-segment when a tenet is active (additive, fraction). */
export const TENET_FIT_BONUS = 0.08; // +8% fit in the targeted segment

// Self-check
const EPSILON = 1e-9;
const totalSize = SEGMENTS.reduce((sum, s) => sum + s.size, 0);
if (Math.abs(totalSize - 1.0) > EPSILON) {
  throw new Error(`Politics constants self-check failed: Total segment size is ${totalSize}, expected 1.0`);
}

for (const segment of SEGMENTS) {
  const totalPriorities = Object.values(segment.priorities).reduce((sum, p) => sum + p, 0);
  if (Math.abs(totalPriorities - 1.0) > EPSILON) {
    throw new Error(`Politics constants self-check failed: Segment '${segment.key}' priorities sum to ${totalPriorities}, expected 1.0`);
  }
}
