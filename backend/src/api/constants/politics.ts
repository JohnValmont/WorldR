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
export const POL_TERM_LENGTH_ARCS = 48;
export const POL_FIRST_CYCLE_ARCS = 12;
export const POL_FILING_WINDOW_ARCS = 3;
export const POL_CAMPAIGN_WINDOW_ARCS = 6;
export const POL_FORMATION_WINDOW_ARCS = 2;
export const POL_COUNCIL_SEATS = 61;
export const POL_MAJORITY_SEATS = 31;
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
/** One event fires per governing arc. Deterministic: arc % templates.length */
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
  MOMENTUM_MIN_DELTA: 0.005       // ignore per-arc share swings smaller than this (noise floor)
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
