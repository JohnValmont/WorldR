/**
 * Nations simulation: pure rules (docs/NATIONS_SIMULATION.md).
 * Layer 1 people, layer 2 sectors and buildings, layer 3 the national budget,
 * layer 4 trade between nations, and the world rating.
 * No database access here. Numbers come from constants/nationSim.ts.
 */
import {
  BASE_SPLIT, BIRTH_HD_SLOPE, BIRTH_RATE, CORP_TAX_TAKE, DEATH_HD_SLOPE, DEATH_RATE, DEBT_CEILING_RATIO, DEBT_INTEREST,
  DEBT_PENALTY_PER_10PCT, DEBT_SAFE_RATIO, DEFAULT_ECONOMY, DIPLOMACY_MIX, DISCRETIONARY_SHARE, ECONOMY_MIX,
  EMIGRATION_FLOOR, EMPLOYMENT_SCORE_SLOPE, GDP_REFERENCE_YEARLY, GDP_SIZE_PER_DOUBLING, IMMIGRATION_OPENNESS,
  IMPORT_ELASTICITY, IMPORT_SHARE_MIN, INCOME_TAX_TAKE, INDUSTRY_MIX, INDUSTRY_SHARE_REFERENCE, INDUSTRY_SHARE_SCALE,
  JOB_ADJUST_SPEED, JOB_PROSPERITY_SLOPE, JOBS_PER_FACTORY_CAPACITY_UNIT, LABOUR_FORCE_SHARE, LAW_JOB_EFFECTS,
  LAW_SPENDING, MAX_POPULATION_CHANGE, MIGRATION_PROSPERITY_SCALE, MIGRATION_RATE, MIGRATION_UNEMPLOYMENT_NORM,
  MIGRATION_UNEMPLOYMENT_SCALE, NATION_ECONOMIES, NationEconomySpec, NPC_BUDGET_BLEND, NPC_BUDGET_MAX_SHIFT, OTHER_SPENDING, OTHER_TAX_TAKE,
  PEOPLE_MIX, PILLAR_WEIGHTS, PillarId, PRODUCTIVITY_HD_SLOPE, PRODUCTIVITY_PROSPERITY_SLOPE, PROGRAMME_JOB_EFFECTS,
  PROGRAMME_PILLAR_EFFECTS, ProgrammeId, PROGRAMMES, RATING_TIERS, SECTOR_SPECS, SECTORS, SectorId, STABILITY_MIX,
  TARIFF_CONSUMER_JOB_EFFECTS, TARIFF_DEADWEIGHT, TARIFF_RATES, TRADABLE_SECTORS, TRADE_MULT_MAX, TRADE_MULT_MIN, UNEMPLOYMENT_MAX,
  UNEMPLOYMENT_MIN,
} from '../constants/nationSim';
import { DEFAULT_LAWS, DEFENCE_STRENGTH, getNationForPolState } from '../constants/nations';

export type Stats = Record<string, number>;
export type Laws = Record<string, string | undefined>;
export type SectorJobs = Record<SectorId, number>;
export type Split = Record<ProgrammeId, number>;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const stat = (s: Stats, k: string) => (Number.isFinite(Number(s[k])) ? Number(s[k]) : 50);
const zeroJobs = (): SectorJobs => ({ agriculture: 0, manufacturing: 0, construction: 0, retail: 0, services: 0, energy: 0 });
const round2 = (x: number) => Math.round(x * 100) / 100;

export function economySpecFor(polStateCode: string | null | undefined): NationEconomySpec {
  return (polStateCode && NATION_ECONOMIES[polStateCode]) || DEFAULT_ECONOMY;
}

/** The laws a nation was founded with (before Parliament changed anything). */
export function foundingLaws(polStateCode: string | null | undefined): Laws {
  return { ...DEFAULT_LAWS, ...(getNationForPolState(polStateCode)?.foundingLaws ?? {}) };
}

export function labourForce(population: number): number {
  return Math.round(population * LABOUR_FORCE_SHARE);
}

// ═══════════════════════════════ Jobs ═══════════════════════════════════════

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

/** How many workers each sector wants this month. `extra` multiplies sectors (trade, budget programmes). */
export function jobTargets(
  spec: NationEconomySpec, population: number, stats: Stats, laws: Laws, playerFactoryCapacity = 0,
  extra: Partial<Record<SectorId, number>> = {},
): SectorJobs {
  const lf = labourForce(population);
  const demand = 1 + JOB_PROSPERITY_SLOPE * (stat(stats, 'prosperity') - 50);
  const out = zeroJobs();
  for (const s of SECTORS) out[s] = lf * spec.jobShare[s] * demand * lawJobMultiplier(laws, s) * (extra[s] ?? 1);
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

// ═══════════════════════════════ People ═════════════════════════════════════

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

// ═══════════════════════════════ Output ═════════════════════════════════════

/** Output per sector per month (dollars). `efficiency` comes from tariffs (1 = no change). */
export function sectorOutput(jobs: SectorJobs, stats: Stats, efficiency = 1): SectorJobs {
  const skill = 1 + PRODUCTIVITY_HD_SLOPE * (stat(stats, 'human_development') - 50);
  const invest = 1 + PRODUCTIVITY_PROSPERITY_SLOPE * (stat(stats, 'prosperity') - 50);
  const out = zeroJobs();
  for (const s of SECTORS) out[s] = Math.round(jobs[s] * SECTOR_SPECS[s].productivity * skill * invest * efficiency);
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

// ═══════════════════════════ Layer 4: trade ═════════════════════════════════

export function tariffRates(laws: Laws): Partial<Record<SectorId, number>> {
  return TARIFF_RATES[laws.tariffs ?? 'moderate'] ?? TARIFF_RATES.moderate;
}

/** Share of a shortfall a nation buys abroad at this tariff. */
export function importShare(tariff: number): number {
  return clamp(1 - IMPORT_ELASTICITY * tariff, IMPORT_SHARE_MIN, 1);
}

export interface TradeEntry {
  code: string;
  /** What the nation would produce with no trade effects (monthly dollars per sector). */
  structural: SectorJobs;
  tariffs: Partial<Record<SectorId, number>>;
  foundingTariffs: Partial<Record<SectorId, number>>;
}

export interface TradeResult {
  /** Jobs multiplier on each traded sector (1 at the founding tariffs). */
  mult: Partial<Record<SectorId, number>>;
  /** Monthly dollars. */
  imports: Partial<Record<SectorId, number>>;
  exports: Partial<Record<SectorId, number>>;
  tariffRevenue: number;
  /** Exports minus imports, monthly dollars. */
  balance: number;
  /** Shop and service jobs multiplier from what tariffs cost shoppers (1 at the founding tariffs). */
  consumerMult: Partial<Record<SectorId, number>>;
  /** Output per worker from protection (1 at the founding tariffs; below 1 = protected work is less efficient). */
  efficiency: number;
}

/** Who buys what from whom, given everyone's tariffs. Pure: world flows from structural outputs. */
function flows(entries: TradeEntry[], tariffsOf: (e: TradeEntry) => Partial<Record<SectorId, number>>) {
  const gdp = entries.map(e => totalJobs(e.structural));
  const worldGdp = gdp.reduce((a, b) => a + b, 0) || 1;
  const out = entries.map(() => ({
    production: {} as Partial<Record<SectorId, number>>, imports: {} as Partial<Record<SectorId, number>>, exports: {} as Partial<Record<SectorId, number>>,
    revenue: 0, consumerCost: 0, deadweight: 0,
  }));
  for (const s of TRADABLE_SECTORS) {
    const world = entries.reduce((a, e) => a + e.structural[s], 0);
    const demand = entries.map((_, i) => world * gdp[i] / worldGdp);
    const surplus = entries.map((e, i) => e.structural[s] - demand[i]);
    const bought = entries.map((e, i) => (surplus[i] < 0 ? -surplus[i] * importShare(tariffsOf(e)[s] ?? 0) : 0));
    const totalBought = bought.reduce((a, b) => a + b, 0);
    const totalSurplus = surplus.reduce((a, b) => a + Math.max(0, b), 0);
    entries.forEach((e, i) => {
      const t = tariffsOf(e)[s] ?? 0;
      const shortfall = Math.max(0, -surplus[i]);
      const exp = surplus[i] > 0 && totalSurplus > 0 ? totalBought * surplus[i] / totalSurplus : 0;
      out[i].imports[s] = bought[i];
      out[i].exports[s] = exp;
      out[i].production[s] = surplus[i] < 0 ? demand[i] - bought[i] : demand[i] + exp;
      out[i].revenue += bought[i] * t;
      out[i].consumerCost += shortfall * t;
      out[i].deadweight += (shortfall - bought[i]) * t;
    });
  }
  return { out, gdp };
}

/** Trade between all nations this month, measured against everyone's founding tariffs. */
export function computeTrade(entries: TradeEntry[]): Record<string, TradeResult> {
  const { out: now, gdp } = flows(entries, e => e.tariffs);
  const { out: ref } = flows(entries, e => e.foundingTariffs);
  const result: Record<string, TradeResult> = {};
  entries.forEach((e, i) => {
    const mult: Partial<Record<SectorId, number>> = {};
    for (const s of TRADABLE_SECTORS) {
      const r = ref[i].production[s] ?? 0;
      mult[s] = r > 0 ? clamp((now[i].production[s] ?? 0) / r, TRADE_MULT_MIN, TRADE_MULT_MAX) : 1;
    }
    const g = gdp[i] || 1;
    const consumerShift = (now[i].consumerCost - ref[i].consumerCost) / g;
    const consumerMult: Partial<Record<SectorId, number>> = {};
    for (const [s, k] of Object.entries(TARIFF_CONSUMER_JOB_EFFECTS) as [SectorId, number][]) {
      consumerMult[s] = clamp(1 - k * consumerShift, TRADE_MULT_MIN, TRADE_MULT_MAX);
    }
    const efficiency = clamp(1 - TARIFF_DEADWEIGHT * (now[i].deadweight - ref[i].deadweight) / g, TRADE_MULT_MIN, TRADE_MULT_MAX);
    const imports: Partial<Record<SectorId, number>> = {}, exports: Partial<Record<SectorId, number>> = {};
    for (const s of TRADABLE_SECTORS) { imports[s] = Math.round(now[i].imports[s] ?? 0); exports[s] = Math.round(now[i].exports[s] ?? 0); }
    const balance = TRADABLE_SECTORS.reduce((a, s) => a + (exports[s] ?? 0) - (imports[s] ?? 0), 0);
    result[e.code] = {
      mult, imports, exports, tariffRevenue: Math.round(now[i].revenue), balance,
      consumerMult, efficiency: Math.round(efficiency * 10000) / 10000,
    };
  });
  return result;
}

/** A nation with no trading partners: nothing moves. */
export const NO_TRADE: TradeResult = { mult: {}, imports: {}, exports: {}, tariffRevenue: 0, balance: 0, consumerMult: {}, efficiency: 1 };

// ═══════════════════════════ Layer 3: budget ════════════════════════════════

export function taxShare(laws: Laws): number {
  return (INCOME_TAX_TAKE[laws.income_tax ?? 'flat_med'] ?? INCOME_TAX_TAKE.flat_med)
    + (CORP_TAX_TAKE[laws.corp_tax ?? 'med'] ?? CORP_TAX_TAKE.med)
    + OTHER_TAX_TAKE;
}

export function lawSpendingLines(laws: Laws): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [cat, opts] of Object.entries(LAW_SPENDING)) {
    const opt = laws[cat] ?? DEFAULT_LAWS[cat];
    out[cat] = opts[opt as string] ?? Object.values(opts)[0];
  }
  out.running = OTHER_SPENDING;
  return out;
}

export function debtInterestRate(laws: Laws): number {
  return DEBT_INTEREST[laws.interest_rate ?? 'neutral'] ?? DEBT_INTEREST.neutral;
}

/** A valid split: each programme 0-1, together at most 1 (the rest is saved). Returns the cleaned split or an error. */
export function validateSplit(input: any): { split: Split } | { error: string } {
  if (!input || typeof input !== 'object') return { error: 'Send a share for each programme.' };
  const split = {} as Split;
  for (const p of PROGRAMMES) {
    const v = Number(input[p] ?? 0);
    if (!Number.isFinite(v) || v < 0 || v > 1) return { error: `The ${p} share must be between 0 and 1.` };
    split[p] = Math.round(v * 1000) / 1000;
  }
  const sum = PROGRAMMES.reduce((a, p) => a + split[p], 0);
  if (sum > 1.0005) return { error: 'The shares add up to more than the whole budget.' };
  return { split };
}

/**
 * How a computer-run government splits the budget: by its lead party's
 * platform (0-100 on each axis), leaned back toward the base split.
 */
export function npcSplit(platform: Record<string, number> | null | undefined): Split {
  if (!platform) return { ...BASE_SPLIT };
  const p = (k: string) => clamp(Number(platform[k] ?? 50), 0, 100);
  const raw: Split = {
    industry: p('investment'),
    welfare: p('labour'),
    interior: p('stability'),
    defence: (p('stability') + (100 - p('labour'))) / 2,
  };
  const sum = PROGRAMMES.reduce((a, k) => a + raw[k], 0) || 1;
  const blended = {} as Split;
  for (const k of PROGRAMMES) {
    const b = NPC_BUDGET_BLEND * BASE_SPLIT[k] + (1 - NPC_BUDGET_BLEND) * raw[k] / sum;
    blended[k] = clamp(b, BASE_SPLIT[k] - NPC_BUDGET_MAX_SHIFT, BASE_SPLIT[k] + NPC_BUDGET_MAX_SHIFT);
  }
  // Clamping can leave the shares not adding to 1: give the difference to the
  // programmes that still have room inside their bounds.
  for (let pass = 0; pass < PROGRAMMES.length; pass++) {
    const gap = 1 - PROGRAMMES.reduce((a, k) => a + blended[k], 0);
    if (Math.abs(gap) < 1e-9) break;
    const room = PROGRAMMES.filter(k => gap > 0 ? BASE_SPLIT[k] + NPC_BUDGET_MAX_SHIFT - blended[k] > 1e-9 : blended[k] - (BASE_SPLIT[k] - NPC_BUDGET_MAX_SHIFT) > 1e-9);
    if (room.length === 0) break;
    for (const k of room) blended[k] = clamp(blended[k] + gap / room.length, BASE_SPLIT[k] - NPC_BUDGET_MAX_SHIFT, BASE_SPLIT[k] + NPC_BUDGET_MAX_SHIFT);
  }
  const out = {} as Split;
  for (const k of PROGRAMMES) out[k] = Math.round(blended[k] * 1000) / 1000;
  return out;
}

export interface BudgetMonth {
  /** Yearly figures in dollars. */
  revenue: number;
  taxes: number;
  tariffs: number;
  lawSpending: Record<string, number>;
  programmes: Split;
  saved: number;
  interest: number;
  spending: number;
  /** Positive = deficit. Yearly. */
  deficit: number;
  /** Debt after this month. */
  debt: number;
  debtRatio: number;
  /** Share of the planned programme money that could actually be spent (below 1 when over the debt ceiling). */
  funded: number;
  split: Split;
}

/** One month of the state's books. Figures are yearly rates; debt moves by one month's deficit. */
export function budgetMonth(args: { gdpYearly: number; laws: Laws; debt: number; split: Split; tariffRevenueMonthly: number }): BudgetMonth {
  const { gdpYearly: gdp, laws, debt, split } = args;
  const taxes = gdp * taxShare(laws);
  const tariffs = args.tariffRevenueMonthly * 12;
  const revenue = taxes + tariffs;
  const lines = lawSpendingLines(laws);
  const lawSpending: Record<string, number> = {};
  for (const [k, v] of Object.entries(lines)) lawSpending[k] = Math.round(gdp * v);
  const committed = Object.values(lawSpending).reduce((a, b) => a + b, 0);
  const interest = debt * debtInterestRate(laws);
  const planned = PROGRAMMES.reduce((a, p) => a + split[p], 0) * DISCRETIONARY_SHARE * gdp;
  // Over the debt ceiling nobody lends: programmes get only what taxes leave over.
  const room = Math.max(0, revenue - committed - interest);
  const overCeiling = gdp > 0 && debt / gdp > DEBT_CEILING_RATIO;
  const actual = overCeiling ? Math.min(planned, room) : planned;
  const funded = planned > 0 ? actual / planned : 1;
  const programmes = {} as Split;
  for (const p of PROGRAMMES) programmes[p] = Math.round(split[p] * DISCRETIONARY_SHARE * gdp * funded);
  const spending = committed + interest + actual;
  const deficit = spending - revenue;
  const newDebt = Math.max(0, debt + deficit / 12);
  return {
    revenue: Math.round(revenue), taxes: Math.round(taxes), tariffs: Math.round(tariffs),
    lawSpending, programmes,
    saved: Math.round((1 - PROGRAMMES.reduce((a, p) => a + split[p], 0)) * DISCRETIONARY_SHARE * gdp),
    interest: Math.round(interest), spending: Math.round(spending), deficit: Math.round(deficit),
    debt: Math.round(newDebt), debtRatio: gdp > 0 ? round2(newDebt / gdp * 100) / 100 : 0,
    funded: round2(funded), split,
  };
}

/** The split as actually funded (a split scaled down when the money ran out). */
const effectiveSplit = (split: Split, funded: number): Split => {
  const out = {} as Split;
  for (const p of PROGRAMMES) out[p] = split[p] * funded;
  return out;
};

/** What the programmes do to jobs: multiplier per sector. */
export function programmeJobMult(split: Split): Partial<Record<SectorId, number>> {
  const out: Partial<Record<SectorId, number>> = {};
  for (const p of PROGRAMMES) {
    for (const [s, k] of Object.entries(PROGRAMME_JOB_EFFECTS[p]) as [SectorId, number][]) {
      out[s] = (out[s] ?? 1) * (1 + k * (split[p] - BASE_SPLIT[p]));
    }
  }
  return out;
}

/** What the programmes do to the rating pillars: points added per pillar. */
export function programmePillarBonus(split: Split): Partial<Record<PillarId, number>> {
  const out: Partial<Record<PillarId, number>> = {};
  for (const p of PROGRAMMES) {
    for (const [pillar, k] of Object.entries(PROGRAMME_PILLAR_EFFECTS[p]) as [PillarId, number][]) {
      out[pillar] = (out[pillar] ?? 0) + k * (split[p] - BASE_SPLIT[p]);
    }
  }
  return out;
}

export function debtPenalty(debtRatio: number): number {
  return Math.max(0, debtRatio - DEBT_SAFE_RATIO) * 10 * DEBT_PENALTY_PER_10PCT;
}

// ═══════════════════════════ Rating ═════════════════════════════════════════

export interface RatingInput {
  stats: Stats;
  gdpYearly: number;
  unemployment: number;
  jobs: SectorJobs;
  population: number;
  defenceLaw: string | undefined;
  /** Points added to pillars by budget programmes. */
  pillarBonus?: Partial<Record<PillarId, number>>;
  debtRatio?: number;
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
  const bonus = input.pillarBonus ?? {};
  const pillars: Record<PillarId, number> = {
    economy: ECONOMY_MIX.size * gdpSizeScore(input.gdpYearly)
      + ECONOMY_MIX.prosperity * stat(input.stats, 'prosperity')
      + ECONOMY_MIX.fiscal_health * stat(input.stats, 'fiscal_health')
      - debtPenalty(input.debtRatio ?? 0),
    industry: INDUSTRY_MIX.capacity * clamp(50 + INDUSTRY_SHARE_SCALE * (industryShare(input.jobs, input.population) - INDUSTRY_SHARE_REFERENCE), 0, 100)
      + INDUSTRY_MIX.employment * employment,
    people: mix(input.stats, PEOPLE_MIX, { employment }),
    stability: mix(input.stats, STABILITY_MIX),
    military: DEFENCE_STRENGTH[input.defenceLaw ?? 'moderate'] ?? DEFENCE_STRENGTH.moderate,
    diplomacy: mix(input.stats, DIPLOMACY_MIX),
  };
  for (const k of Object.keys(pillars) as PillarId[]) pillars[k] = Math.round(clamp(pillars[k] + (bonus[k] ?? 0), 0, 100) * 10) / 10;
  const raw = (Object.keys(PILLAR_WEIGHTS) as PillarId[]).reduce((a, k) => a + PILLAR_WEIGHTS[k] * pillars[k], 0);
  const score = Math.round(clamp(raw, 0, 100) * 10) / 10;
  const tier = tierFor(score);
  return { score, pillars, tier: tier.name, tierBlurb: tier.blurb };
}

/** Rank by score (highest first); ties keep input order. */
export function rankNations<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  return rows.map((r, i) => ({ r, i })).sort((a, b) => b.r.score - a.r.score || a.i - b.i).map(({ r }, i) => ({ ...r, rank: i + 1 }));
}

// ═══════════════════════════ One whole month ════════════════════════════════

export interface NationSimState {
  population: number;
  jobs: SectorJobs;
  /** Government debt in dollars. */
  debt: number;
}

export interface NationSimContext {
  spec: NationEconomySpec;
  stats: Stats;
  laws: Laws;
  playerFactoryCapacity: number;
  /** This month's trade result for this nation. Defaults to no trade. */
  trade?: TradeResult;
  /** Budget split in force. Defaults to the base split. */
  split?: Split;
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
  budget: BudgetMonth;
  trade: TradeResult;
  efficiency: number;
}

/** What a nation would produce with no trade effects: used to work out who trades with whom. */
export function structuralOutput(ctx: NationSimContext, population: number): SectorJobs {
  return sectorOutput(jobTargets(ctx.spec, population, ctx.stats, ctx.laws, ctx.playerFactoryCapacity), ctx.stats);
}

function combine(...ms: Partial<Record<SectorId, number>>[]): Partial<Record<SectorId, number>> {
  const out: Partial<Record<SectorId, number>> = {};
  for (const m of ms) for (const [s, v] of Object.entries(m) as [SectorId, number][]) out[s] = (out[s] ?? 1) * v;
  return out;
}

/** A brand-new nation: every sector at its target, debt at its starting ratio. */
export function initialState(ctx: NationSimContext): NationSimState {
  const population = ctx.spec.population;
  const target = jobTargets(ctx.spec, population, ctx.stats, ctx.laws, ctx.playerFactoryCapacity);
  const jobs = zeroJobs();
  for (const s of SECTORS) jobs[s] = Math.round(target[s]);
  const gdp = gdpYearly(sectorOutput(jobs, ctx.stats));
  return { population, jobs, debt: Math.round(gdp * ctx.spec.debtRatio) };
}

/** Describe a state. `budget` is this month's books (computed by stepMonth); omitted = books on the current state, debt unchanged. */
export function describe(
  state: NationSimState, ctx: NationSimContext,
  pop: { births: number; deaths: number; migration: number } = { births: 0, deaths: 0, migration: 0 },
  budget?: BudgetMonth,
): NationSimMonth {
  const trade = ctx.trade ?? NO_TRADE;
  const efficiency = trade.efficiency;
  const unemployment = unemploymentRate(state.jobs, state.population);
  const output = sectorOutput(state.jobs, ctx.stats, efficiency);
  const gdp = gdpYearly(output);
  const split = ctx.split ?? { ...BASE_SPLIT };
  const books = budget ?? { ...budgetMonth({ gdpYearly: gdp, laws: ctx.laws, debt: state.debt, split, tariffRevenueMonthly: trade.tariffRevenue }), debt: state.debt, debtRatio: gdp > 0 ? state.debt / gdp : 0 };
  return {
    ...state, ...pop,
    debt: books.debt,
    labourForce: labourForce(state.population),
    unemployment, output, gdpYearly: gdp,
    buildings: buildingCounts(state.jobs),
    rating: nationRating({
      stats: ctx.stats, gdpYearly: gdp, unemployment, jobs: state.jobs, population: state.population, defenceLaw: ctx.laws.defense,
      pillarBonus: programmePillarBonus(effectiveSplit(split, books.funded)), debtRatio: books.debtRatio,
    }),
    budget: books, trade, efficiency,
  };
}

/**
 * Advance one game month: people react to last month's jobs; the budget is set
 * from last month's economy; then jobs move toward targets shaped by laws,
 * trade and the budget programmes.
 */
export function stepMonth(prev: NationSimState, ctx: NationSimContext): NationSimMonth {
  const trade = ctx.trade ?? NO_TRADE;
  const split = ctx.split ?? { ...BASE_SPLIT };
  const efficiency = trade.efficiency;
  const pop = stepPopulation(prev.population, ctx.stats, unemploymentRate(prev.jobs, prev.population), ctx.laws.immigration);
  const lastGdp = gdpYearly(sectorOutput(prev.jobs, ctx.stats, efficiency));
  const books = budgetMonth({ gdpYearly: lastGdp, laws: ctx.laws, debt: prev.debt, split, tariffRevenueMonthly: trade.tariffRevenue });
  const target = jobTargets(ctx.spec, pop.population, ctx.stats, ctx.laws, ctx.playerFactoryCapacity,
    combine(trade.mult, trade.consumerMult, programmeJobMult(effectiveSplit(split, books.funded))));
  const jobs = stepJobs(prev.jobs, target);
  return describe({ population: pop.population, jobs, debt: books.debt }, ctx, pop, books);
}
