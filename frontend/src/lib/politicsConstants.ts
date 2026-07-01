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
export const POL_TENDER_INFLUENCE_TIEBREAK = true;
export const PARTY_FOUNDING_COST = 25000;
export const POL_VOTE_JITTER = 0;
export const POL_FUNDRAISER_BASE = 5000;
export const POL_FUNDRAISER_CHARISMA_MULT = 100;
export const POL_ENDORSEMENT_INFLUENCE_COST = 5;

export const POL_DEFAULT_INDUSTRY_TAX_RATE = 0.20;
export const POL_NPC_DEFAULT_TREASURY = 500000;

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
