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

import { NationalStat } from './macroEconomy';

// Per-bloc turnout sensitivity to Conditions (GDD $5 diagram: Turnout × Conditions).
// Positive ⇒ the bloc turns out MORE as the condition rises above neutral. Keyed
// by SEGMENTS[].key. The summed swing is clamped to ±POL_CONDITION_TURNOUT_MAX_SWING.
export const POL_CONDITION_TURNOUT_SENSITIVITY: Record<string, Partial<Record<NationalStat, number>>> = {
  industrial_workers:      { cost_of_living: -0.6, prosperity: +0.2, order_safety: -0.1 },
  logistics_trade_workers: { prosperity: +0.4, cost_of_living: -0.3 },
  factory_business_owners: { prosperity: +0.5, fiscal_health: +0.3, order_safety: +0.2 },
  civic_professionals:     { equity: +0.4, order_safety: +0.2, prosperity: +0.2 },
  suburban_families:       { order_safety: +0.4, equity: +0.3, prosperity: +0.2 },
};
export const POL_CONDITION_TURNOUT_MAX_SWING = 0.30; // turnout multiplier clamped to [0.70, 1.30]

// Crisis thresholds (GDD $11). A condition at/below its threshold fires the crisis
// deterministically from real state — no scripting. Each crisis dings the governing
// party's credibility/treasury only (never the tuned election math).
export const POL_CRISIS_THRESHOLDS: Record<string, { key: NationalStat; at: number; headline: string; body: string }> = {
  crisis_debt:     { key: 'fiscal_health',   at: 30, headline: 'DEBT CRISIS',      body: 'The treasury is stretched to breaking point as the budget deteriorates.' },
  crisis_jobs:     { key: 'cost_of_living',  at: 30, headline: 'CIVIL UNREST',     body: 'Mass unemployment drives workers into the streets in protest.' },
  crisis_order:    { key: 'order_safety',    at: 30, headline: 'LAWLESSNESS',      body: 'Organised crime and riots overwhelm the state apparatus.' },
  crisis_cohesion: { key: 'equity',          at: 30, headline: 'SOCIAL FRACTURE',  body: 'Deep societal divides paralyze civic institutions.' },
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
  'the_syndicate', 'the_directory',
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
  the_syndicate: { taxation: 20, labour: 80, investment: 50, trade: 50, stability: 20 },
  the_directory: { taxation: 50, labour: 50, investment: 80, trade: 50, stability: 50 },
};

export const DOCTRINE_IDENTITIES: Record<DoctrineId, { tagline: string, blurb: string, color: string }> = {
  forge_accord:  { tagline: 'Workers first', blurb: 'Industry built by the state, jobs protected, borders guarded. Puts working people ahead of markets.', color: '#F59E0B' },
  the_ledger:    { tagline: 'Free markets', blurb: 'Low taxes, a small state, and open trade. Trusts markets to create prosperity.', color: '#3B82F6' },
  the_homestead: { tagline: 'Order & tradition', blurb: 'Balanced books, protected industry, and law and order. Values stability over sudden change.', color: '#10B981' },
  the_commons:   { tagline: 'Redistribute & reform', blurb: 'Redistribution, public investment, and bold reform. Rebuilds the economy around working people.', color: '#EF4444' },
  the_vanguard:  { tagline: 'Reform & openness', blurb: 'Open trade, pragmatic investment, and bold institutional change. Modernises the state.', color: '#8B5CF6' },
  the_compact:   { tagline: 'The balanced path', blurb: 'Balanced on every issue. Defined by its record in government, not by rhetoric.', color: '#6366f1' },
  the_syndicate: { tagline: 'Power to creators', blurb: 'Strong unions, collective ownership, and a worker-first economy. Labour is the source of all value.', color: '#EC4899' },
  the_directory: { tagline: 'Efficiency & growth', blurb: 'State-led investment, massive infrastructure projects, and data-driven governance. Growth by design.', color: '#14B8A6' },
};

/** Which general action type is unlocked by each Doctrine. */
export const DOCTRINE_SIGNATURE_ACTION: Record<DoctrineId, string> = {
  forge_accord:  'union_address',
  the_ledger:    'investor_roadshow',
  the_homestead: 'town_hall',
  the_commons:   'shop_floor_tour',
  the_vanguard:  'listening_tour',
  the_compact:   'coalition_outreach',
  the_syndicate: 'shop_floor_tour',
  the_directory: 'investor_roadshow',
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
  'syndicate_radicals', 'syndicate_moderates',
  'directory_planners', 'directory_pragmatists',
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
  the_syndicate: ['syndicate_radicals',    'syndicate_moderates'],
  the_directory: ['directory_planners',    'directory_pragmatists'],
};

/** Fit bonus applied per-segment when a tenet is active (additive, fraction). */
export const TENET_FIT_BONUS = 0.08; // +8% fit in the targeted segment

// ── Political Capital (PC) System ─────────────────────────────────────────────
// PC is a strategic resource separate from AP.
// AP  = routine throughput  (12 / arc, resets)
// PC  = high-stakes leverage (slow regen, never resets — leftover carries over)
//
// A player builds PC through landmark actions (winning elections, passing major
// bills, surviving scandals, delivering on coalition commitments) and spends it
// on extraordinary interventions that bypass normal limits.

export const PC_ARC_REGEN        = 1;   // PC gained passively each arc
export const PC_CAP_BASE         = 10;  // base maximum PC a character can hold
export const PC_CAP_PREMIER      = 15;  // cap while holding Premier office
export const PC_CAP_OPPOSITION   = 12;  // cap while leading the Official Opposition

// ── PC Earn events (applied by arc processor) ─────────────────────────────────
export const PC_EARN_WIN_ELECTION          = 5;  // party wins a seat majority
export const PC_EARN_PASS_MAJOR_BILL       = 3;  // major bill passes with your leadership
export const PC_EARN_SURVIVE_SCANDAL       = 2;  // scandal resolved without resignation
export const PC_EARN_COALITION_COMMITMENT  = 2;  // coalition agreement review passed
export const PC_EARN_LEADERSHIP_VICTORY    = 3;  // win a leadership challenge

// ── PC Spend costs ─────────────────────────────────────────────────────────────
// These are ALL tunable. Change here only.
export const PC_COST_FORCE_VOTE            = 3;  // force a parliamentary vote through
export const PC_COST_NEGOTIATE_STRENGTH    = 2;  // enter coalition talks with leverage bonus
export const PC_COST_RALLY_BASE            = 2;  // emergency rally to restore faction loyalty
export const PC_COST_SUPPRESS_SCANDAL      = 4;  // bury an emerging scandal (phase: rumour only)
export const PC_COST_BUY_MEDIA_CYCLE       = 3;  // dominate one arc's news cycle
export const PC_COST_DISCIPLINE_FACTION    = 3;  // snap a restless faction back into line
export const PC_COST_TRIGGER_INQUIRY       = 4;  // open a parliamentary inquiry vs. rival
export const PC_COST_LEADERSHIP_CHALLENGE  = 5;  // formally trigger a leadership ballot
export const PC_COST_EMERGENCY_DECREE      = 6;  // Premier only: bypass legislature once

// Valid PC spend action IDs (checked in controller)
export const PC_SPEND_ACTIONS = [
  'force_vote',
  'negotiate_strength',
  'rally_base',
  'suppress_scandal',
  'buy_media_cycle',
  'discipline_faction',
  'trigger_inquiry',
  'leadership_challenge',
  'emergency_decree',
] as const;
export type PcSpendAction = typeof PC_SPEND_ACTIONS[number];

export const PC_SPEND_COSTS: Record<PcSpendAction, number> = {
  force_vote:           PC_COST_FORCE_VOTE,
  negotiate_strength:   PC_COST_NEGOTIATE_STRENGTH,
  rally_base:           PC_COST_RALLY_BASE,
  suppress_scandal:     PC_COST_SUPPRESS_SCANDAL,
  buy_media_cycle:      PC_COST_BUY_MEDIA_CYCLE,
  discipline_faction:   PC_COST_DISCIPLINE_FACTION,
  trigger_inquiry:      PC_COST_TRIGGER_INQUIRY,
  leadership_challenge: PC_COST_LEADERSHIP_CHALLENGE,
  emergency_decree:     PC_COST_EMERGENCY_DECREE,
};

// ── Faction System ─────────────────────────────────────────────────────────────
// At party founding, 2–3 factions are generated based on the chosen Doctrine.
// Each faction has a name, a direction bias, and initial loyalty.
// Cohesion = weighted average of all faction loyalties (weight = membership_share).

export const FACTION_LOYALTY_WARNING   = 35;  // below this → is_restless = true
export const FACTION_LOYALTY_CRISIS    = 20;  // below this → leadership challenge risk
export const FACTION_LOYALTY_BREAKAWAY = 10;  // below this → split event possible
export const FACTION_DRIFT_PER_ARC    = 2;   // loyalty can drift ±2 / arc by default
export const FACTION_RALLY_RESTORE    = 20;  // PC: rally_base restores loyalty by this

/** Template shape for auto-generated factions at party founding. */
export interface FactionTemplate {
  name: string;
  ideology_lean: Record<Axis, number>;   // ideal platform for THIS faction
  demand_type: string;
  demand_payload: Record<string, unknown>;
  membership_share: number;
}

/**
 * Per-doctrine faction templates.
 * 3 factions per doctrine: Left Wing, Mainstream, Right Wing (relative to doctrine axis).
 * At founding, loyalty initialises at 70 for all.
 */
export const DOCTRINE_FACTIONS: Record<DoctrineId, FactionTemplate[]> = {
  forge_accord: [
    { name: 'Industrial Vanguard', ideology_lean: { taxation: 10, labour: 95, investment: 85, trade: 20, stability: 45 }, demand_type: 'policy_axis', demand_payload: { axis: 'labour', direction: 'raise' }, membership_share: 0.35 },
    { name: 'Reformist Centre',    ideology_lean: { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 50 }, demand_type: 'policy_axis', demand_payload: { axis: 'investment', direction: 'raise' }, membership_share: 0.40 },
    { name: 'Social Democrats',    ideology_lean: { taxation: 30, labour: 65, investment: 75, trade: 30, stability: 60 }, demand_type: 'ministry_seat', demand_payload: { ministry: 'labour' }, membership_share: 0.25 },
  ],
  the_ledger: [
    { name: 'Fiscal Hawks',        ideology_lean: { taxation: 95, labour: 10, investment: 15, trade: 90, stability: 85 }, demand_type: 'policy_axis', demand_payload: { axis: 'taxation', direction: 'raise' }, membership_share: 0.30 },
    { name: 'Market Liberals',     ideology_lean: { taxation: 80, labour: 20, investment: 20, trade: 80, stability: 80 }, demand_type: 'policy_axis', demand_payload: { axis: 'trade', direction: 'raise' }, membership_share: 0.45 },
    { name: 'Moderate Right',      ideology_lean: { taxation: 65, labour: 35, investment: 30, trade: 70, stability: 75 }, demand_type: 'ministry_seat', demand_payload: { ministry: 'finance' }, membership_share: 0.25 },
  ],
  the_homestead: [
    { name: 'Rural Traditionalists', ideology_lean: { taxation: 45, labour: 55, investment: 15, trade: 15, stability: 90 }, demand_type: 'policy_axis', demand_payload: { axis: 'stability', direction: 'raise' }, membership_share: 0.40 },
    { name: 'Community Builders',    ideology_lean: { taxation: 50, labour: 50, investment: 20, trade: 20, stability: 80 }, demand_type: 'policy_axis', demand_payload: { axis: 'trade', direction: 'lower' }, membership_share: 0.35 },
    { name: 'Reform Agrarians',      ideology_lean: { taxation: 55, labour: 45, investment: 30, trade: 25, stability: 70 }, demand_type: 'ministry_seat', demand_payload: { ministry: 'agriculture' }, membership_share: 0.25 },
  ],
  the_commons: [
    { name: 'Labour Radicals',      ideology_lean: { taxation: 10, labour: 95, investment: 90, trade: 50, stability: 10 }, demand_type: 'policy_axis', demand_payload: { axis: 'labour', direction: 'raise' }, membership_share: 0.30 },
    { name: 'Community Left',       ideology_lean: { taxation: 20, labour: 80, investment: 80, trade: 50, stability: 20 }, demand_type: 'policy_axis', demand_payload: { axis: 'investment', direction: 'raise' }, membership_share: 0.45 },
    { name: 'Progressive Centre',   ideology_lean: { taxation: 30, labour: 65, investment: 70, trade: 55, stability: 35 }, demand_type: 'leadership_change', demand_payload: { reason: 'moderate_tack' }, membership_share: 0.25 },
  ],
  the_vanguard: [
    { name: 'Technocrats',          ideology_lean: { taxation: 45, labour: 55, investment: 55, trade: 90, stability: 25 }, demand_type: 'policy_axis', demand_payload: { axis: 'trade', direction: 'raise' }, membership_share: 0.35 },
    { name: 'Reformers',            ideology_lean: { taxation: 50, labour: 50, investment: 50, trade: 80, stability: 20 }, demand_type: 'policy_axis', demand_payload: { axis: 'investment', direction: 'raise' }, membership_share: 0.40 },
    { name: 'Social Reformists',    ideology_lean: { taxation: 55, labour: 45, investment: 45, trade: 70, stability: 30 }, demand_type: 'ministry_seat', demand_payload: { ministry: 'trade' }, membership_share: 0.25 },
  ],
  the_compact: [
    { name: 'Unity Left',           ideology_lean: { taxation: 40, labour: 60, investment: 60, trade: 50, stability: 55 }, demand_type: 'policy_axis', demand_payload: { axis: 'labour', direction: 'raise' }, membership_share: 0.33 },
    { name: 'Grand Centre',         ideology_lean: { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 }, demand_type: 'autonomy', demand_payload: { want: 'internal_vote_freedom' }, membership_share: 0.34 },
    { name: 'Unity Right',          ideology_lean: { taxation: 60, labour: 40, investment: 40, trade: 55, stability: 55 }, demand_type: 'policy_axis', demand_payload: { axis: 'taxation', direction: 'raise' }, membership_share: 0.33 },
  ],
  the_syndicate: [
    { name: 'Direct Action Wing',   ideology_lean: { taxation: 10, labour: 95, investment: 55, trade: 45, stability: 10 }, demand_type: 'policy_axis', demand_payload: { axis: 'labour', direction: 'raise' }, membership_share: 0.35 },
    { name: 'Worker Cooperativists',ideology_lean: { taxation: 20, labour: 80, investment: 50, trade: 50, stability: 20 }, demand_type: 'policy_axis', demand_payload: { axis: 'investment', direction: 'raise' }, membership_share: 0.40 },
    { name: 'Democratic Socialists',ideology_lean: { taxation: 30, labour: 65, investment: 45, trade: 55, stability: 30 }, demand_type: 'ministry_seat', demand_payload: { ministry: 'labour' }, membership_share: 0.25 },
  ],
  the_directory: [
    { name: 'Planning Bureau',      ideology_lean: { taxation: 55, labour: 45, investment: 90, trade: 55, stability: 55 }, demand_type: 'policy_axis', demand_payload: { axis: 'investment', direction: 'raise' }, membership_share: 0.35 },
    { name: 'Industrial Planners',  ideology_lean: { taxation: 50, labour: 50, investment: 80, trade: 50, stability: 50 }, demand_type: 'ministry_seat', demand_payload: { ministry: 'industry' }, membership_share: 0.40 },
    { name: 'Reform Technocrats',   ideology_lean: { taxation: 45, labour: 55, investment: 70, trade: 50, stability: 45 }, demand_type: 'policy_axis', demand_payload: { axis: 'trade', direction: 'raise' }, membership_share: 0.25 },
  ],
};

// ── Interest Group System (Phase 6) ──────────────────────────────────────────
// Interest groups are persistent world entities (one per voter segment).
// Relationship score 0–100. Endorsement tier gates segment share bonuses.
// ALL numbers are tunable constants — never hardcode in service/controller.

export type EndorsementStatus = 'none' | 'sympathetic' | 'endorsed' | 'allied';

/**
 * Endorsement tier thresholds (relationship_score breakpoints).
 */
export const IG_ENDORSEMENT_THRESHOLDS: Record<EndorsementStatus, number> = {
  none:        0,
  sympathetic: 40,
  endorsed:    60,
  allied:      75,
};

/**
 * Platform alignment scoring formula weight.
 * alignment_score = Σ axis_weight × (1 - |party_value - pref_value| / 100)
 * This raw score (0–1) is scaled to a 0–100 relationship delta per arc.
 */
export const IG_ALIGNMENT_SCORE_SCALE = 6;      // max score delta per arc from platform alignment
export const IG_ALIGNMENT_DECAY = 0.4;           // score lost per arc when alignment drifts below 0.5

/**
 * Natural relationship decay per arc (absent any contact or alignment bonus).
 * Even at high scores, groups drift away without active maintenance.
 */
export const IG_PASSIVE_DECAY_PER_ARC = 0.8;

/**
 * Outreach action costs and success probabilities.
 * manual_outreach: player-initiated, costs AP. Improves score + creates commitment slot.
 * rally_support:   spend PC to trigger a volunteer surge (score +boost).
 */
export const IG_OUTREACH_AP_COST      = 3;      // AP to perform manual outreach
export const IG_RALLY_PC_COST         = 2;      // PC to rally group support
export const IG_OUTREACH_COOLDOWN_ARCS = 2;     // minimum arcs between outreach to same group
export const IG_OUTREACH_BASE_GAIN    = 8;      // base score gain from manual outreach
export const IG_RALLY_GAIN            = 6;      // score gain from rally action
export const IG_RALLY_MOMENTUM_GAIN   = 3;      // momentum added from rally

/**
 * Commitment mechanics.
 * When a player makes a commitment to a group (via outreach), the group expects
 * the party's platform to reflect it within COMMITMENT_DEADLINE_ARCS.
 * Honoring: bonus. Breaking: severe penalty.
 */
export const IG_COMMITMENT_DEADLINE_ARCS = 6;   // arcs before a commitment expires
export const IG_COMMITMENT_HONOR_BONUS   = 10;  // score gain when commitment honored
export const IG_COMMITMENT_BREAK_PENALTY = 18;  // score lost when commitment broken

/**
 * Endorsement share bonuses — added to the segment's vote share calc when endorsed.
 * These are multiplied by the group's influence_weight in the engine.
 */
export const IG_ENDORSEMENT_SHARE_BONUS: Record<EndorsementStatus, number> = {
  none:        0,
  sympathetic: 0.03,   // +3% on segment share
  endorsed:    0.07,   // +7%
  allied:      0.14,   // +14%
};

// ── Legacy System (Phase 8) ───────────────────────────────────────────────────
// A politician's permanent historical record across 6 dimensions.
// Events are recorded in pol_legacy_records; aggregates in pol_legacy_scores.
// ALL numbers are tunable constants — never hardcode in service/controller.

export type LegacyDimension = 'electoral' | 'legislative' | 'coalition' | 'scandal' | 'economic' | 'longevity';

/**
 * Score deltas by event type, per dimension.
 * Negative scandal score = bad record; positive = clean.
 */
export const LEGACY_EVENT_SCORES: Record<string, { dimension: LegacyDimension; delta: number; headline: string }> = {
  // Electoral
  election_won:          { dimension: 'electoral',   delta: +12, headline: 'Won state election'             },
  election_lost:         { dimension: 'electoral',   delta:  -5, headline: 'Lost state election'            },
  seats_gained:          { dimension: 'electoral',   delta:  +2, headline: 'Net seats gained'               },
  seats_lost:            { dimension: 'electoral',   delta:  -1, headline: 'Net seats lost'                 },
  // Legislative
  legislation_passed:    { dimension: 'legislative', delta:  +6, headline: 'Legislation passed'             },
  legislation_blocked:   { dimension: 'legislative', delta:  -2, headline: 'Legislative agenda blocked'     },
  government_formed:     { dimension: 'legislative', delta:  +5, headline: 'Government successfully formed' },
  // Coalition
  coalition_formed:      { dimension: 'coalition',   delta:  +8, headline: 'Coalition agreement signed'     },
  coalition_maintained:  { dimension: 'coalition',   delta:  +3, headline: 'Coalition survived full term'   },
  coalition_collapsed:   { dimension: 'coalition',   delta:  -8, headline: 'Coalition collapsed'            },
  // Scandal
  scandal_survived:      { dimension: 'scandal',     delta:  +4, headline: 'Scandal weathered without harm' },
  scandal_damage:        { dimension: 'scandal',     delta:  -3, headline: 'Scandal caused lasting damage'  },
  scandal_resolved:      { dimension: 'scandal',     delta:  +6, headline: 'Scandal fully resolved'         },
  // Economic
  economy_thriving:      { dimension: 'economic',    delta:  +3, headline: 'Economy thrived under watch'    },
  economy_declining:     { dimension: 'economic',    delta:  -2, headline: 'Economy declined under watch'   },
  // Longevity
  arc_as_leader:         { dimension: 'longevity',   delta:  +1, headline: 'Arc served as party leader'     },
  arc_as_member:         { dimension: 'longevity',   delta:  +0, headline: 'Arc served as party member'     }, // counted but no score
};

/**
 * Legacy benefits — unlock at dimension/total score thresholds.
 * Each benefit provides a mechanical advantage described by effect_description.
 */
export interface LegacyBenefit {
  key: string;
  label: string;
  description: string;
  /** Which dimension to check, or 'total' for overall sum */
  dimension: LegacyDimension | 'total';
  threshold: number;
  effect_description: string;
}

export const LEGACY_BENEFITS: LegacyBenefit[] = [
  {
    key:               'elder_statesman',
    label:             'Elder Statesman',
    description:       'Your long record commands respect across all factions.',
    dimension:         'total',
    threshold:         150,
    effect_description: 'All outreach and rally actions cost 1 less AP/PC (min 1).',
  },
  {
    key:               'party_institution',
    label:             'Party Institution',
    description:       'Your party has become synonymous with your name.',
    dimension:         'electoral',
    threshold:         40,
    effect_description: 'Party gains +5 base popularity (persistent).',
  },
  {
    key:               'coalition_architect',
    label:             'Coalition Architect',
    description:       'You are the trusted hand that holds governments together.',
    dimension:         'coalition',
    threshold:         30,
    effect_description: 'Coalition formation requires 3% less seat majority.',
  },
  {
    key:               'untouchable',
    label:             'Untouchable',
    description:       'Your clean record makes you resistant to political attack.',
    dimension:         'scandal',
    threshold:         20,
    effect_description: 'Scandals 25% less likely to erupt against your party.',
  },
  {
    key:               'media_legend',
    label:             'Media Legend',
    description:       'Decades of exposure have made you a household name.',
    dimension:         'longevity',
    threshold:         60,
    effect_description: 'All new media outlet relations seed 10 points higher.',
  },
];

/** Longevity: arcs required to gain each rank title */
export const LEGACY_LONGEVITY_RANKS: { arcs: number; title: string }[] = [
  { arcs: 0,   title: 'Newcomer'      },
  { arcs: 6,   title: 'Activist'      },
  { arcs: 12,  title: 'Councillor'    },
  { arcs: 24,  title: 'Veteran'       },
  { arcs: 48,  title: 'Elder'         },
  { arcs: 72,  title: 'Statesman'     },
  { arcs: 100, title: 'Icon'          },
];

// ── Media Ecosystem (Phase 7) ─────────────────────────────────────────────────
// Media outlets are persistent world entities seeded once per state.
// Each party maintains a relationship_score with every outlet.
// Every arc: the coverage processor generates news stories, applies tone weighting,
// and converts to popularity deltas.
// ALL numbers are tunable constants — never hardcode in service/controller.

export type CoverageStance = 'allied' | 'favourable' | 'neutral' | 'sceptical' | 'hostile';
export type OutletBias = 'labour' | 'capital' | 'civic' | 'trade' | 'populist' | 'neutral';

/**
 * Coverage stance thresholds (relationship_score breakpoints).
 */
export const MEDIA_STANCE_THRESHOLDS: Record<CoverageStance, number> = {
  allied:     70,
  favourable: 55,
  neutral:    40,
  sceptical:  25,
  hostile:    0,
};

/**
 * Bias–platform axis mapping.
 * When a party's platform value on the bias axis is ≥ MEDIA_ALIGNMENT_THRESHOLD,
 * the outlet is considered "ideologically aligned" and the seed score is higher.
 */
export const MEDIA_BIAS_AXIS: Record<OutletBias, string | null> = {
  labour:   'labour',
  capital:  'taxation',   // high taxation score = capital-friendly (low tax)
  civic:    'stability',
  trade:    'trade',
  populist: null,         // populist outlets don't align to platform axes
  neutral:  null,
};
export const MEDIA_ALIGNMENT_THRESHOLD = 60;  // platform value ≥ this = aligned

/**
 * Story weight values by story_type (determines if story makes top-3 news cycle).
 */
export const MEDIA_STORY_WEIGHTS: Record<string, number> = {
  scandal_eruption:      9,
  scandal_escalation:    6,
  scandal_resolved:      3,
  campaign_event:        2,
  endorsement_gained:    4,
  endorsement_lost:      5,
  coalition_formed:      8,
  coalition_crisis:      7,
  coalition_collapsed:   10,
  legislation_passed:    5,
  legislation_blocked:   3,
  election_called:       8,
  election_result:       10,
  policy_announcement:   3,
  interest_group_deal:   3,
};

/**
 * Popularity delta per story from coverage tone (averaged across all outlets).
 * tone: -1.0 (hostile) to +1.0 (allied). These are per-story multipliers.
 * Final delta = base_weight × tone × MEDIA_POP_SCALE.
 */
export const MEDIA_POP_SCALE = 0.8;  // popularity points per 1.0 tone × 1.0 weight unit

/**
 * Tone modifier applied per coverage stance.
 * This is ADDED to base_tone of the outlet for a story about an allied/hostile party.
 */
export const MEDIA_STANCE_TONE_MOD: Record<CoverageStance, number> = {
  allied:     +0.40,
  favourable: +0.18,
  neutral:     0.00,
  sceptical:  -0.18,
  hostile:    -0.40,
};

/**
 * Passive relationship decay per arc (outlets drift toward neutral without contact).
 */
export const MEDIA_PASSIVE_DECAY = 0.5;

/**
 * Press contact action costs.
 */
export const MEDIA_PRESS_CONFERENCE_AP_COST = 2;   // improves all outlet relations slightly
export const MEDIA_EXCLUSIVE_AP_COST        = 3;   // targets one outlet, bigger gain
export const MEDIA_EXCLUSIVE_GAIN           = 12;  // score gain from exclusive interview
export const MEDIA_PRESS_CONF_GAIN          = 3;   // score gain across all outlets from press conf
export const MEDIA_CONTACT_COOLDOWN_ARCS    = 2;   // arcs between exclusive contacts to same outlet

/**
 * News cycle: max top stories per arc written to pol_news_stories.
 */
export const MEDIA_TOP_STORIES_PER_ARC = 3;

// ── Campaign System (Phase 5) ─────────────────────────────────────────────────
// A party-level persistent campaign object is created at election candidacy.
// It accumulates ground_game_score each arc and feeds a bonus into the election engine.
// ALL numbers are tunable constants — never hardcode in service/controller.

export type CampaignStrategyType = 'ground_war' | 'air_war' | 'targeted' | 'balanced' | 'insurgent';

/**
 * Strategy multipliers applied to ground_game_score per arc.
 *   effort_mult  — how efficiently campaign actions convert to GGS
 *   budget_mult  — how much budget spending boosts GGS
 *   reach_bonus  — flat GGS added per arc regardless of actions (brand presence)
 */
export const CAMPAIGN_STRATEGY_PARAMS: Record<CampaignStrategyType, {
  effort_mult: number;
  budget_mult: number;
  reach_bonus: number;
}> = {
  ground_war:  { effort_mult: 1.40, budget_mult: 0.80, reach_bonus: 0.5 },
  air_war:     { effort_mult: 0.70, budget_mult: 1.60, reach_bonus: 1.0 },
  targeted:    { effort_mult: 1.20, budget_mult: 1.00, reach_bonus: 0.2 },
  balanced:    { effort_mult: 1.00, budget_mult: 1.00, reach_bonus: 0.5 },
  insurgent:   { effort_mult: 1.10, budget_mult: 0.50, reach_bonus: 0.8 },
};

/** GGS (ground_game_score) per unit of effort from pol_campaign_actions, before strategy mult. */
export const CAMPAIGN_GGS_PER_EFFORT = 0.10;

/** Maximum ground_game_score — beyond this further accumulation is wasted. */
export const CAMPAIGN_GGS_CAP = 100;

/** Momentum decay per arc (if no actions taken, momentum moves toward 0). */
export const CAMPAIGN_MOMENTUM_DECAY = 0.85;

/** Momentum gain per canvass / rally resolved this arc. */
export const CAMPAIGN_MOMENTUM_GAIN_ACTION = 1.5;

/**
 * Campaign events: random occurrences that fire during arc processing.
 * Each entry: id, probability per arc (during campaign phase only),
 * ground_game_delta (±), popularity_delta (±), budget_cost (≥0),
 * message shown to player.
 */
export const CAMPAIGN_EVENTS = [
  {
    id: 'opposition_research',
    prob: 0.06,
    ground_game_delta: -4,
    popularity_delta: -1,
    budget_cost: 0,
    message: 'Rival opposition research surfaces — a damaging story about a candidate has been leaked to the press.',
  },
  {
    id: 'donor_withdrawal',
    prob: 0.04,
    ground_game_delta: 0,
    popularity_delta: 0,
    budget_cost: 8000,
    message: 'A major donor has withdrawn their pledge citing \"strategic differences\". Campaign budget reduced.',
  },
  {
    id: 'local_issue_eruption',
    prob: 0.08,
    ground_game_delta: 2,
    popularity_delta: 2,
    budget_cost: 0,
    message: 'A local issue has surged in public consciousness. Voters in affected constituencies are engaging directly with your platform.',
  },
  {
    id: 'media_endorsement',
    prob: 0.03,
    ground_game_delta: 3,
    popularity_delta: 2,
    budget_cost: 0,
    message: 'The Drennia Tribune has issued an editorial endorsement. Broad credibility boost across moderate segments.',
  },
  {
    id: 'volunteer_surge',
    prob: 0.05,
    ground_game_delta: 6,
    popularity_delta: 0,
    budget_cost: 0,
    message: 'A surge in volunteer sign-ups has supercharged ground operations this arc.',
  },
] as const;

export type CampaignEventId = typeof CAMPAIGN_EVENTS[number]['id'];

// ── Scandal System ─────────────────────────────────────────────────────────────
// Scandals are probabilistic events that fire during arc processing.
// They escalate through 6 phases unless the player intervenes.
// ALL numbers here are tunable; do NOT hardcode in service/controller.

export type ScandalType    = 'financial' | 'personal' | 'governmental' | 'electoral';
export type ScandalPhase   = 'rumour' | 'investigation' | 'allegation' | 'explosion' | 'inquiry' | 'resolved';
export type ScandalResolution = 'suppressed' | 'cleared' | 'weathered' | 'resignation' | 'expelled';

/** Base probability that a random scandal fires for an active party per arc. */
export const SCANDAL_BASE_PROB = 0.04;  // 4% per arc per active (non-NPC) player party

/** Severity weights (probability of each severity rolling, must sum to 1.0) */
export const SCANDAL_SEVERITY_WEIGHTS = [0.35, 0.30, 0.20, 0.10, 0.05]; // 1..5

/** How many arcs each phase lasts before auto-escalating (if not resolved). */
export const SCANDAL_PHASE_DURATION: Record<ScandalPhase, number> = {
  rumour:        2,
  investigation: 3,
  allegation:    3,
  explosion:     4,
  inquiry:       6,
  resolved:      0,  // terminal
};

/**
 * Popularity damage (percentage points) applied to the party per arc
 * while the scandal is in this phase, multiplied by severity.
 *   damage = SCANDAL_PHASE_DAMAGE[phase] * severity
 */
export const SCANDAL_PHASE_DAMAGE: Record<ScandalPhase, number> = {
  rumour:        0,     // silent — no public damage yet
  investigation: 0.3,
  allegation:    0.8,
  explosion:     2.0,
  inquiry:       1.2,
  resolved:      0,
};

/**
 * Natural resolution probability each arc (chance the scandal clears itself
 * without player action) — lower for higher severity.
 */
export const SCANDAL_NATURAL_CLEAR_PROB: Record<ScandalPhase, number> = {
  rumour:        0.20,
  investigation: 0.10,
  allegation:    0.05,
  explosion:     0.02,
  inquiry:       0.08,
  resolved:      0,
};

/** NPC party scandal probability multiplier (NPCs get slightly less scandal). */
export const SCANDAL_NPC_PROB_MULT = 0.5;

/**
 * Player intervention effects — what each action does and its AP / PC cost.
 * 'suppress' is a PC spend (handled via spendPc).
 * All others cost AP and are tied to general-action routing.
 */
export const SCANDAL_INTERVENTIONS = {
  suppress:             { phase: 'rumour',        ap_cost: 0,  pc_cost: 4, success_prob: 0.80 },
  spin:                 { phase: 'investigation', ap_cost: 3,  pc_cost: 0, success_prob: 0.50 },
  investigate_internal: { phase: 'allegation',    ap_cost: 4,  pc_cost: 0, success_prob: 0.40 },
  stonewall:            { phase: 'explosion',      ap_cost: 2,  pc_cost: 0, success_prob: 0.30 },
  full_disclosure:      { phase: 'explosion',      ap_cost: 0,  pc_cost: 0, success_prob: 1.00 },
} as const;

export type ScandalIntervention = keyof typeof SCANDAL_INTERVENTIONS;

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
