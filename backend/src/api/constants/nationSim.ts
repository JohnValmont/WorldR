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
}

export const NATION_ECONOMIES: Record<string, NationEconomySpec> = {
  // Drennia: an even industrial economy built on factory towns.
  national: {
    population: 10_000_000,
    jobShare: { agriculture: 0.06, manufacturing: 0.20, construction: 0.07, retail: 0.16, services: 0.42, energy: 0.03 },
  },
  // Westmark: ports, trade and money. Fewer factories, many shops and offices.
  westmark: {
    population: 9_000_000,
    jobShare: { agriculture: 0.04, manufacturing: 0.12, construction: 0.06, retail: 0.19, services: 0.49, energy: 0.02 },
  },
  // Eryndor: farms, mines and smelters. Bigger, poorer, more industrial.
  eryndor: {
    population: 11_000_000,
    jobShare: { agriculture: 0.11, manufacturing: 0.23, construction: 0.08, retail: 0.13, services: 0.36, energy: 0.05 },
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
  tariffs: {
    free_trade: { manufacturing: 0.94, agriculture: 0.95, retail: 1.04, services: 1.02 },
    moderate:   {},
    high:       { manufacturing: 1.06, agriculture: 1.04, retail: 0.95, services: 0.98 },
    targeted:   { manufacturing: 1.03, retail: 0.98 },
  },
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
