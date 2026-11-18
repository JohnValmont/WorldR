/**
 * Nations simulation: pure rules (docs/NATIONS_SIMULATION.md, layers 1 and 2).
 * No database access here. Numbers come from constants/nationSim.ts.
 */
import {
  BIRTH_HD_SLOPE, BIRTH_RATE, DEATH_HD_SLOPE, DEATH_RATE, DEFAULT_ECONOMY, DIPLOMACY_MIX, ECONOMY_MIX,
  EMIGRATION_FLOOR, EMPLOYMENT_SCORE_SLOPE, GDP_REFERENCE_YEARLY, GDP_SIZE_PER_DOUBLING, IMMIGRATION_OPENNESS,
  INDUSTRY_MIX, INDUSTRY_SHARE_REFERENCE, INDUSTRY_SHARE_SCALE, JOB_ADJUST_SPEED, JOB_PROSPERITY_SLOPE,
  JOBS_PER_FACTORY_CAPACITY_UNIT, LABOUR_FORCE_SHARE, LAW_JOB_EFFECTS, MAX_POPULATION_CHANGE, MIGRATION_PROSPERITY_SCALE,
  MIGRATION_RATE, MIGRATION_UNEMPLOYMENT_NORM, MIGRATION_UNEMPLOYMENT_SCALE, NATION_ECONOMIES, NationEconomySpec,
  PEOPLE_MIX, PILLAR_WEIGHTS, PillarId, PRODUCTIVITY_HD_SLOPE, PRODUCTIVITY_PROSPERITY_SLOPE, RATING_TIERS,
  SECTOR_SPECS, SECTORS, SectorId, STABILITY_MIX, UNEMPLOYMENT_MAX, UNEMPLOYMENT_MIN,
} from '../constants/nationSim';
import { DEFENCE_STRENGTH } from '../constants/nations';

export type Stats = Record<string, number>;
export type Laws = Record<string, string | undefined>;
export type SectorJobs = Record<SectorId, number>;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const stat = (s: Stats, k: string) => (Number.isFinite(Number(s[k])) ? Number(s[k]) : 50);
const zeroJobs = (): SectorJobs => ({ agriculture: 0, manufacturing: 0, construction: 0, retail: 0, services: 0, energy: 0 });

export function economySpecFor(polStateCode: string | null | undefined): NationEconomySpec {
  return (polStateCode && NATION_ECONOMIES[polStateCode]) || DEFAULT_ECONOMY;
}

export function labourForce(population: number): number {
  return Math.round(population * LABOUR_FORCE_SHARE);
}

/** Multiplier the laws in force put on one sector's demand for workers. */
export function lawJobMultiplier(laws: Laws, sector: SectorId): number {
  let m = 1;
  for (const [category, options] of Object.entries(LAW_JOB_EFFECTS)) {
    const option = laws[category];
    const effect = option ? options[option]?.[sector] : undefined;
    if (effect) m *= effect;
  }
  return m;
}

/** How many workers each sector wants this month. */
export function jobTargets(spec: NationEconomySpec, population: number, stats: Stats, laws: Laws, playerFactoryCapacity = 0): SectorJobs {
  const lf = labourForce(population);
  const demand = 1 + JOB_PROSPERITY_SLOPE * (stat(stats, 'prosperity') - 50);
  const out = zeroJobs();
  for (const s of SECTORS) out[s] = lf * spec.jobShare[s] * demand * lawJobMultiplier(laws, s);
  out.manufacturing += Math.max(0, playerFactoryCapacity) * JOBS_PER_FACTORY_CAPACITY_UNIT;
  return out;
}

/** Jobs move part of the way toward their target each month. */
export function stepJobs(current: SectorJobs, target: SectorJobs): SectorJobs {
  const out = zeroJobs();
  for (const s of SECTORS) out[s] = Math.max(0, Math.round(current[s] + JOB_ADJUST_SPEED * (target[s] - current[s])));
  return out;
}

export function totalJobs(jobs: SectorJobs): number {
  return SECTORS.reduce((a, s) => a + (jobs[s] || 0), 0);
}

export function unemploymentRate(jobs: SectorJobs, population: number): number {
  const lf = labourForce(population);
  if (lf <= 0) return UNEMPLOYMENT_MAX;
  return clamp(1 - totalJobs(jobs) / lf, UNEMPLOYMENT_MIN, UNEMPLOYMENT_MAX);
}

export interface PopulationStep { population: number; births: number; deaths: number; migration: number }

/** One month of births, deaths and migration. */
export function stepPopulation(population: number, stats: Stats, unemployment: number, immigrationLaw: string | undefined): PopulationStep {
  const hd = stat(stats, 'human_development') - 50;
  const births = population * Math.max(0, BIRTH_RATE + BIRTH_HD_SLOPE * hd);
  const deaths = population * Math.max(0, DEATH_RATE + DEATH_HD_SLOPE * hd);
  const pull = clamp(
    (stat(stats, 'prosperity') - 50) / MIGRATION_PROSPERITY_SCALE
      - (unemployment - MIGRATION_UNEMPLOYMENT_NORM) / MIGRATION_UNEMPLOYMENT_SCALE,
    -2, 2,
  );
  const openness = IMMIGRATION_OPENNESS[immigrationLaw ?? 'moderate'] ?? IMMIGRATION_OPENNESS.moderate;
  // A shut border keeps people out; it does not fully keep unhappy people in.
  const effective = pull >= 0 ? openness : Math.max(openness, EMIGRATION_FLOOR);
  const migration = population * MIGRATION_RATE * pull * effective;
  const maxChange = population * MAX_POPULATION_CHANGE;
  const change = clamp(births - deaths + migration, -maxChange, maxChange);
  return {
    population: Math.max(0, Math.round(population + change)),
    births: Math.round(births), deaths: Math.round(deaths), migration: Math.round(migration),
  };
}

/** Output per sector per month (dollars). */
export function sectorOutput(jobs: SectorJobs, stats: Stats): SectorJobs {
  const skill = 1 + PRODUCTIVITY_HD_SLOPE * (stat(stats, 'human_development') - 50);
  const invest = 1 + PRODUCTIVITY_PROSPERITY_SLOPE * (stat(stats, 'prosperity') - 50);
  const out = zeroJobs();
  for (const s of SECTORS) out[s] = Math.round(jobs[s] * SECTOR_SPECS[s].productivity * skill * invest);
  return out;
}

export function gdpYearly(output: SectorJobs): number {
  return totalJobs(output) * 12;
}

/** Farms, factories, sites, stores, offices and plants implied by each sector's workforce. */
export function buildingCounts(jobs: SectorJobs): SectorJobs {
  const out = zeroJobs();
  for (const s of SECTORS) out[s] = Math.round(jobs[s] / SECTOR_SPECS[s].building.workers);
  return out;
}

// ─── Rating ─────────────────────────────────────────────────────────────────

export interface RatingInput {
  stats: Stats;
  gdpYearly: number;
  unemployment: number;
  jobs: SectorJobs;
  population: number;
  defenceLaw: string | undefined;
}

export interface Rating {
  score: number;
  pillars: Record<PillarId, number>;
  tier: string;
  tierBlurb: string;
}

const mix = (stats: Stats, weights: Partial<Record<string, number>>, extra: Record<string, number> = {}) =>
  Object.entries(weights).reduce((a, [k, w]) => a + (w ?? 0) * (k in extra ? extra[k] : stat(stats, k)), 0);

export function employmentScore(unemployment: number): number {
  return clamp(100 - unemployment * EMPLOYMENT_SCORE_SLOPE, 0, 100);
}

export function gdpSizeScore(gdp: number): number {
  if (gdp <= 0) return 0;
  return clamp(50 + GDP_SIZE_PER_DOUBLING * Math.log2(gdp / GDP_REFERENCE_YEARLY), 0, 100);
}

export function industryShare(jobs: SectorJobs, population: number): number {
  const lf = labourForce(population);
  if (lf <= 0) return 0;
  return SECTORS.filter(s => SECTOR_SPECS[s].industrial).reduce((a, s) => a + jobs[s], 0) / lf;
}

export function tierFor(score: number): { name: string; blurb: string } {
  const t = RATING_TIERS.find(t => score >= t.min) ?? RATING_TIERS[RATING_TIERS.length - 1];
  return { name: t.name, blurb: t.blurb };
}

export function nationRating(input: RatingInput): Rating {
  const employment = employmentScore(input.unemployment);
  const pillars: Record<PillarId, number> = {
    economy: ECONOMY_MIX.size * gdpSizeScore(input.gdpYearly)
      + ECONOMY_MIX.prosperity * stat(input.stats, 'prosperity')
      + ECONOMY_MIX.fiscal_health * stat(input.stats, 'fiscal_health'),
    industry: INDUSTRY_MIX.capacity * clamp(50 + INDUSTRY_SHARE_SCALE * (industryShare(input.jobs, input.population) - INDUSTRY_SHARE_REFERENCE), 0, 100)
      + INDUSTRY_MIX.employment * employment,
    people: mix(input.stats, PEOPLE_MIX, { employment }),
    stability: mix(input.stats, STABILITY_MIX),
    military: DEFENCE_STRENGTH[input.defenceLaw ?? 'moderate'] ?? DEFENCE_STRENGTH.moderate,
    diplomacy: mix(input.stats, DIPLOMACY_MIX),
  };
  for (const k of Object.keys(pillars) as PillarId[]) pillars[k] = Math.round(clamp(pillars[k], 0, 100) * 10) / 10;
  const raw = (Object.keys(PILLAR_WEIGHTS) as PillarId[]).reduce((a, k) => a + PILLAR_WEIGHTS[k] * pillars[k], 0);
  const score = Math.round(clamp(raw, 0, 100) * 10) / 10;
  const tier = tierFor(score);
  return { score, pillars, tier: tier.name, tierBlurb: tier.blurb };
}

/** Rank by score (highest first); ties keep input order. */
export function rankNations<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  return rows.map((r, i) => ({ r, i })).sort((a, b) => b.r.score - a.r.score || a.i - b.i).map(({ r }, i) => ({ ...r, rank: i + 1 }));
}

// ─── One whole month ────────────────────────────────────────────────────────

export interface NationSimState {
  population: number;
  jobs: SectorJobs;
}

export interface NationSimContext {
  spec: NationEconomySpec;
  stats: Stats;
  laws: Laws;
  playerFactoryCapacity: number;
}

export interface NationSimMonth extends NationSimState {
  births: number;
  deaths: number;
  migration: number;
  labourForce: number;
  unemployment: number;
  output: SectorJobs;
  gdpYearly: number;
  buildings: SectorJobs;
  rating: Rating;
}

/** A brand-new nation starts with every sector at its target (no artificial boom or bust). */
export function initialState(ctx: NationSimContext): NationSimState {
  const population = ctx.spec.population;
  const target = jobTargets(ctx.spec, population, ctx.stats, ctx.laws, ctx.playerFactoryCapacity);
  const jobs = zeroJobs();
  for (const s of SECTORS) jobs[s] = Math.round(target[s]);
  return { population, jobs };
}

/** Describe a state without moving time (used for a brand-new nation's first row). */
export function describe(state: NationSimState, ctx: NationSimContext, pop: { births: number; deaths: number; migration: number } = { births: 0, deaths: 0, migration: 0 }): NationSimMonth {
  const unemployment = unemploymentRate(state.jobs, state.population);
  const output = sectorOutput(state.jobs, ctx.stats);
  const gdp = gdpYearly(output);
  return {
    ...state, ...pop,
    labourForce: labourForce(state.population),
    unemployment, output, gdpYearly: gdp,
    buildings: buildingCounts(state.jobs),
    rating: nationRating({ stats: ctx.stats, gdpYearly: gdp, unemployment, jobs: state.jobs, population: state.population, defenceLaw: ctx.laws.defense }),
  };
}

/** Advance one game month: people first (they react to last month's jobs), then jobs. */
export function stepMonth(prev: NationSimState, ctx: NationSimContext): NationSimMonth {
  const pop = stepPopulation(prev.population, ctx.stats, unemploymentRate(prev.jobs, prev.population), ctx.laws.immigration);
  const target = jobTargets(ctx.spec, pop.population, ctx.stats, ctx.laws, ctx.playerFactoryCapacity);
  const jobs = stepJobs(prev.jobs, target);
  return describe({ population: pop.population, jobs }, ctx, pop);
}
