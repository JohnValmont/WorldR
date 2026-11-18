/**
 * Nations simulation: people, jobs, sectors, buildings and the world rating
 * (docs/NATIONS_SIMULATION.md, layers 1 and 2).
 *
 * Every tunable number lives here (AGENTS.md). Rules that use them are pure
 * functions in services/nationSim.rules.ts, tested in tests/nationSim.test.ts.
 *
 * The world rating is READ-ONLY: elections, votes, deals and support never read
 * it. It summarises what the laws and stats already did.
 */
import type { NationalStat } from './macroEconomy';

/** Master switch. Off = the monthly step does nothing and screens hide the panel. */
export const NATION_SIM_ENABLED = true;

// ─── Sectors ────────────────────────────────────────────────────────────────

export type SectorId = 'agriculture' | 'manufacturing' | 'construction' | 'retail' | 'services' | 'energy';
export const SECTORS: SectorId[] = ['agriculture', 'manufacturing', 'construction', 'retail', 'services', 'energy'];

export interface SectorSpec {
  name: string;
  /** Output per worker per game month, in dollars, at neutral stats. */
  productivity: number;
  /** What one "building" means for this sector and how many workers it holds. */
  building: { singular: string; plural: string; workers: number };
  /** Counts toward the Industry pillar (heavy and productive work). */
  industrial: boolean;
}

export const SECTOR_SPECS: Record<SectorId, SectorSpec> = {
  agriculture:   { name: 'Agriculture',   productivity: 3000,  building: { singular: 'farm',      plural: 'farms',      workers: 12 },   industrial: false },
  manufacturing: { name: 'Manufacturing', productivity: 7500,  building: { singular: 'factory',   plural: 'factories',  workers: 400 },  industrial: true },
  construction:  { name: 'Construction',  productivity: 5000,  building: { singular: 'site',      plural: 'sites',      workers: 60 },   industrial: true },
  retail:        { name: 'Retail',        productivity: 3500,  building: { singular: 'store',     plural: 'stores',     workers: 18 },   industrial: false },
  services:      { name: 'Services',      productivity: 6500,  building: { singular: 'office',    plural: 'offices',    workers: 45 },   industrial: false },
  energy:        { name: 'Energy',        productivity: 12000, building: { singular: 'plant',     plural: 'plants',     workers: 250 },  industrial: true },
};

// ─── Starting profile per nation (by pol_states.code) ──────────────────────
// Different but balanced (AGENTS.md): each nation's sector shares add up to a
// similar total, so starting unemployment is 5-7% everywhere.
// `jobShare` = jobs in that sector as a share of the labour force at neutral stats.

export interface NationEconomySpec {
  population: number;
  jobShare: Record<SectorId, number>;
  /** Government debt at the start, as a share of a year's output. */
  debtRatio: number;
}

export const NATION_ECONOMIES: Record<string, NationEconomySpec> = {
  // Drennia: an even industrial economy built on factory towns.
  national: {
    population: 10_000_000,
    jobShare: { agriculture: 0.06, manufacturing: 0.20, construction: 0.07, retail: 0.16, services: 0.42, energy: 0.03 },
    debtRatio: 0.50,
  },
  // Westmark: ports, trade and money. Fewer factories, many shops and offices. Borrowed more.
  westmark: {
    population: 9_000_000,
    jobShare: { agriculture: 0.04, manufacturing: 0.12, construction: 0.06, retail: 0.19, services: 0.49, energy: 0.02 },
    debtRatio: 0.58,
  },
  // Eryndor: farms, mines and smelters. Bigger, poorer, more industrial. Thrifty crown.
  eryndor: {
    population: 11_000_000,
    jobShare: { agriculture: 0.11, manufacturing: 0.23, construction: 0.08, retail: 0.13, services: 0.36, energy: 0.05 },
    debtRatio: 0.42,
  },
};

/** Used for any parliament not listed above. */
export const DEFAULT_ECONOMY: NationEconomySpec = NATION_ECONOMIES.national;

// ─── People ─────────────────────────────────────────────────────────────────

/** Share of everyone who is of working age and looking for work. */
export const LABOUR_FORCE_SHARE = 0.48;

/** Per game month, at neutral stats. 0.0010/month = about 1.2% a year. */
export const BIRTH_RATE = 0.0010;
export const DEATH_RATE = 0.0008;
/** Births fall as development rises (richer, more educated societies have fewer children). Per point of human_development above 50. */
export const BIRTH_HD_SLOPE = -0.000008;
/** Deaths fall as development rises. Per point of human_development above 50. */
export const DEATH_HD_SLOPE = -0.000006;

/** How open the border is under each immigration law (0 = shut). */
export const IMMIGRATION_OPENNESS: Record<string, number> = { closed: 0.05, skilled: 0.4, moderate: 0.7, open: 1.0 };
/** Migration per month for a fully open border when pull = 1. */
export const MIGRATION_RATE = 0.0006;
/** Pull: prosperity above 50 attracts people, unemployment above the norm pushes them away. */
export const MIGRATION_PROSPERITY_SCALE = 25;   // prosperity 75 -> +1 pull
export const MIGRATION_UNEMPLOYMENT_NORM = 0.06;
export const MIGRATION_UNEMPLOYMENT_SCALE = 0.06; // 12% unemployment -> -1 pull
/** People leave a failing country even with a shut border: this share of a negative pull always applies. */
export const EMIGRATION_FLOOR = 0.3;

/** Population can never change by more than this share in one month. */
export const MAX_POPULATION_CHANGE = 0.004;

// ─── Jobs ───────────────────────────────────────────────────────────────────

/** Each month, jobs in a sector move this share of the way to their target (hiring and firing take time). */
export const JOB_ADJUST_SPEED = 0.15;
/** Prosperity drives demand for workers: target x (1 + slope x (prosperity - 50)). */
export const JOB_PROSPERITY_SLOPE = 0.004;
/** Unemployment is always reported inside these bounds (frictional floor, collapse ceiling). */
export const UNEMPLOYMENT_MIN = 0.02;
export const UNEMPLOYMENT_MAX = 0.35;

/**
 * How each law changes jobs in each sector (multiplier on the target).
 * Every option that helps one sector costs another or costs the budget
 * through its existing stat effects.
 */
export const LAW_JOB_EFFECTS: Record<string, Record<string, Partial<Record<SectorId, number>>>> = {
  // Tariffs are NOT here: what they do to jobs and output depends on what a
  // nation actually imports, so it comes from the trade model (layer 4 below).
  min_wage: {
    none:      { retail: 1.03, agriculture: 1.03 },
    low:       {},
    med:       { retail: 0.98, agriculture: 0.98 },
    high:      { retail: 0.95, agriculture: 0.95, manufacturing: 0.98 },
    very_high: { retail: 0.90, agriculture: 0.91, manufacturing: 0.96 },
  },
  corp_tax: {
    holiday:       { manufacturing: 1.03, services: 1.02 },
    low:           { manufacturing: 1.02, services: 1.02 },
    med:           {},
    high:          { manufacturing: 0.98, services: 0.98 },
    high_loophole: { manufacturing: 0.97, services: 0.98 },
  },
  interest_rate: {
    loose:   { construction: 1.08, retail: 1.02 },
    neutral: {},
    tight:   { construction: 0.92, retail: 0.98 },
  },
};

/** Workers at player-run car factories count toward manufacturing: jobs per car of monthly capacity (plant plus suppliers). */
export const JOBS_PER_FACTORY_CAPACITY_UNIT = 7;

// ─── Output ─────────────────────────────────────────────────────────────────

/** Output per worker rises with development (skills) and prosperity (investment). Per point above 50. */
export const PRODUCTIVITY_HD_SLOPE = 0.004;
export const PRODUCTIVITY_PROSPERITY_SLOPE = 0.004;

// ─── World rating (0-100) ───────────────────────────────────────────────────

export type PillarId = 'economy' | 'industry' | 'people' | 'stability' | 'military' | 'diplomacy';
export const PILLAR_NAMES: Record<PillarId, string> = {
  economy: 'Economy', industry: 'Industry', people: 'People', stability: 'Stability', military: 'Military', diplomacy: 'Diplomacy',
};
export const PILLAR_WEIGHTS: Record<PillarId, number> = {
  economy: 0.25, industry: 0.15, people: 0.20, stability: 0.15, military: 0.10, diplomacy: 0.15,
};

/** Yearly GDP that scores 50 on size. Each doubling adds GDP_SIZE_PER_DOUBLING. */
export const GDP_REFERENCE_YEARLY = 330_000_000_000;
export const GDP_SIZE_PER_DOUBLING = 25;
/** Economy pillar = size, prosperity and fiscal health. */
export const ECONOMY_MIX = { size: 0.5, prosperity: 0.3, fiscal_health: 0.2 } as const;

/** Industry: share of the labour force in industrial sectors; this share scores 50. */
export const INDUSTRY_SHARE_REFERENCE = 0.30;
export const INDUSTRY_SHARE_SCALE = 100; // +0.10 share -> +10 points
export const INDUSTRY_MIX = { capacity: 0.6, employment: 0.4 } as const;

/** Employment score = 100 - unemployment x this (6% -> 64). */
export const EMPLOYMENT_SCORE_SLOPE = 600;

export const PEOPLE_MIX: Partial<Record<NationalStat | 'employment', number>> = { human_development: 0.4, equity: 0.3, employment: 0.3 };
export const STABILITY_MIX: Partial<Record<NationalStat, number>> = { order_safety: 0.5, bureaucracy: 0.3, freedom_rights: 0.2 };
/** Diplomacy is global standing until treaties exist (layer 5). */
export const DIPLOMACY_MIX: Partial<Record<NationalStat, number>> = { global_standing: 1.0 };

/**
 * Tiers are ABSOLUTE thresholds, not rank positions: with three nations,
 * "top 10%" would always crown one superpower. Highest first.
 */
export const RATING_TIERS: { min: number; name: string; blurb: string }[] = [
  { min: 80, name: 'Superpower',     blurb: 'Leads the world in wealth, strength and influence.' },
  { min: 65, name: 'Great power',    blurb: 'Shapes events well beyond its borders.' },
  { min: 55, name: 'Regional power', blurb: 'Counts in its corner of the world.' },
  { min: 40, name: 'Middle power',   blurb: 'Holds its own but follows more than it leads.' },
  { min: 0,  name: 'Minor state',    blurb: 'Struggling to keep up with its neighbours.' },
];

/** Starting ratings must stay within this many points of each other (tests enforce it). */
export const RATING_BALANCE_TOLERANCE = 3;

// ═══════════════════════ Layer 3: the national budget ═══════════════════════
// Money in: taxes (set by the tax laws) plus tariff revenue (layer 4).
// Money out: what the spending laws commit (welfare, health, schools, defence),
// running costs, interest on debt, and a discretionary budget that the head of
// government or the finance minister splits between four programmes.
// All shares are of a year's output (GDP).

/** Tax take by law option, as a share of GDP. */
export const INCOME_TAX_TAKE: Record<string, number> = { none: 0, flat_low: 0.06, flat_med: 0.12, flat_high: 0.19, prog_mod: 0.13, prog_steep: 0.16 };
export const CORP_TAX_TAKE: Record<string, number> = { holiday: 0.01, low: 0.026, med: 0.044, high: 0.055, high_loophole: 0.065 };
/** Sales and other taxes every nation collects. */
export const OTHER_TAX_TAKE = 0.06;

/** What each spending law commits the state to, as a share of GDP. */
export const LAW_SPENDING: Record<string, Record<string, number>> = {
  welfare:    { minimal: 0.02, standard: 0.04, expanded: 0.07, ubi_pilot: 0.06, ubi_full: 0.12 },
  healthcare: { market: 0.02, hybrid: 0.05, universal: 0.09 },
  education:  { low: 0.03, med: 0.05, high: 0.075, voucher: 0.045 },
  defense:    { minimal: 0.01, moderate: 0.025, high: 0.045, very_high: 0.06 },
};
/** Courts, roads, offices: the running costs every state pays. */
export const OTHER_SPENDING = 0.03;

/** Interest the state pays on its debt, by the interest-rate law. Yearly. */
export const DEBT_INTEREST: Record<string, number> = { loose: 0.02, neutral: 0.035, tight: 0.06 };

/** The discretionary budget the government splits each month: this share of GDP. */
export const DISCRETIONARY_SHARE = 0.03;

export type ProgrammeId = 'industry' | 'welfare' | 'interior' | 'defence';
export const PROGRAMMES: ProgrammeId[] = ['industry', 'welfare', 'interior', 'defence'];
export const PROGRAMME_SPECS: Record<ProgrammeId, { name: string; ministry: string; blurb: string }> = {
  industry: { name: 'Industry & building', ministry: 'industry', blurb: 'Factory grants and public works: more construction and factory jobs.' },
  welfare:  { name: 'Health & welfare',    ministry: 'welfare',  blurb: 'Clinics, schools and benefits: lifts the People score and public-service jobs.' },
  interior: { name: 'Police & courts',     ministry: 'interior', blurb: 'Order and a working state: lifts the Stability score.' },
  defence:  { name: 'Armed forces',        ministry: 'defence',  blurb: 'Equipment and readiness: lifts the Military score.' },
};
/**
 * The split everyone is measured against: a quarter each, nothing saved.
 * Effects below are per share above or below this (0.25 -> 0.50 = +0.25).
 */
export const BASE_SPLIT: Record<ProgrammeId, number> = { industry: 0.25, welfare: 0.25, interior: 0.25, defence: 0.25 };

/** Job effects: target multiplier = 1 + effect x (share - base). */
export const PROGRAMME_JOB_EFFECTS: Record<ProgrammeId, Partial<Record<SectorId, number>>> = {
  industry: { construction: 0.16, manufacturing: 0.05 },
  welfare:  { services: 0.04 },
  interior: {},
  defence:  { manufacturing: 0.03 },
};
/** Rating pillar points per share above base: +0.25 share -> +5 points. */
export const PROGRAMME_PILLAR_EFFECTS: Record<ProgrammeId, Partial<Record<PillarId, number>>> = {
  industry: { industry: 12 },
  welfare:  { people: 20 },
  interior: { stability: 20 },
  defence:  { military: 20 },
};

/** Who may set the split: the head of government, or the minister holding this post. */
export const BUDGET_MINISTER_POST = 'finance';

/**
 * Computer-run governments split by their lead party's platform, then lean this
 * far back toward the base split (1 = always base, 0 = pure platform), so a
 * computer government never goes to extremes.
 */
export const NPC_BUDGET_BLEND = 0.6;
/** And never more than this far from the base split on any programme, whatever the platform. */
export const NPC_BUDGET_MAX_SHIFT = 0.15;

/** Debt above this share of GDP drags the Economy score; this many points per 10% above. */
export const DEBT_SAFE_RATIO = 0.9;
export const DEBT_PENALTY_PER_10PCT = 2;
/** A state with more debt than this cannot borrow further: the discretionary budget is cut to what taxes cover. */
export const DEBT_CEILING_RATIO = 2.0;

// ═══════════════════════ Layer 4: trade between nations ══════════════════════
// Farm goods, factory goods and energy are traded between the nations. Each
// nation consumes its share of world output (by GDP); what it lacks it imports
// from nations with a surplus. Tariffs make imports dearer: fewer are bought,
// more is made at home (jobs) at a cost in efficiency, and exporters lose sales.
// Effects are measured against each nation's FOUNDING tariff, so starting
// numbers are unchanged and only later changes move jobs.

export const TRADABLE_SECTORS: SectorId[] = ['agriculture', 'manufacturing', 'energy'];

/** Tariff rate by law option and sector. */
export const TARIFF_RATES: Record<string, Partial<Record<SectorId, number>>> = {
  free_trade: { agriculture: 0,    manufacturing: 0,    energy: 0 },
  moderate:   { agriculture: 0.10, manufacturing: 0.10, energy: 0.10 },
  high:       { agriculture: 0.25, manufacturing: 0.25, energy: 0.25 },
  targeted:   { agriculture: 0.05, manufacturing: 0.20, energy: 0.05 },
};

/** Share of a shortfall bought from abroad = 1 - elasticity x tariff, never below the floor. */
export const IMPORT_ELASTICITY = 1.5;
export const IMPORT_SHARE_MIN = 0.2;

/**
 * What tariffs cost at home, measured on goods a nation actually lacks (a
 * tariff on goods it does not import does nothing). Both are against the
 * nation's founding tariffs.
 * - Shoppers pay the tariff on every unit of the shortfall (imported or made
 *   at home instead), so they spend less elsewhere: shop and service jobs
 *   fall by this much per share of GDP that cost takes.
 * - Making at home what was cheaper abroad wastes effort: output per worker
 *   falls by this much per share of GDP of protected (substituted) value.
 */
export const TARIFF_CONSUMER_JOB_EFFECTS: Partial<Record<SectorId, number>> = { retail: 1.5, services: 0.6 };
export const TARIFF_DEADWEIGHT = 2;
/** Trade can never move a sector's jobs more than this far either way in a month's target. */
export const TRADE_MULT_MIN = 0.6;
export const TRADE_MULT_MAX = 1.6;
