/**
 * Nations simulation: the monthly step and the read view
 * (docs/NATIONS_SIMULATION.md, layers 1 and 2).
 *
 * Rules are pure functions in nationSim.rules.ts. This file only loads inputs,
 * calls the rules, and stores one row per nation per month.
 *
 * READ-ONLY for the rest of the game: elections, votes, deals and support never
 * read the rating.
 */
import { NATION_SIM_ENABLED, PILLAR_NAMES, PillarId, SECTOR_SPECS, SECTORS, SectorId } from '../constants/nationSim';
import { getNationForPolState, STARTER_NATIONS } from '../constants/nations';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { getLawsInForce } from './statecraft.service';
import * as R from './nationSim.rules';

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const json = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);

/** Monthly car-making capacity of player and computer companies' factories in this country. */
async function factoryCapacity(conn: any, countryId: string | null): Promise<number> {
  if (!countryId) return 0;
  const row = await conn('manufacturing_factories')
    .where({ country_id: countryId, status: 'active' })
    .sum({ cap: 'capacity_per_month' })
    .first();
  return num(row?.cap);
}

async function contextFor(conn: any, state: any): Promise<R.NationSimContext> {
  return {
    spec: R.economySpecFor(state.code),
    stats: readNationalStatsFromRow(state) as any,
    laws: await getLawsInForce(conn, state.id),
    playerFactoryCapacity: await factoryCapacity(conn, state.country_id),
  };
}

function rowToState(row: any): R.NationSimState {
  return { population: num(row.population), jobs: json(row.jobs) };
}

/**
 * Advance one nation by one month. Call AFTER the month's national stats are
 * updated (processMacroEconomy), in its own savepoint. Idempotent per arc.
 */
export async function stepNationSim(trx: any, stateId: string, arc: number): Promise<R.NationSimMonth | null> {
  if (!NATION_SIM_ENABLED) return null;
  const state = await trx('pol_states').where({ id: stateId }).first();
  if (!state || !getNationForPolState(state.code)) return null;
  if (await trx('nation_sim_months').where({ state_id: stateId, arc }).first()) return null;

  const ctx = await contextFor(trx, state);
  const prev = await trx('nation_sim_months').where({ state_id: stateId }).where('arc', '<', arc).orderBy('arc', 'desc').first();
  const month = prev ? R.stepMonth(rowToState(prev), ctx) : R.describe(R.initialState(ctx), ctx);

  await trx('nation_sim_months').insert({
    state_id: stateId,
    arc,
    population: month.population,
    births: month.births,
    deaths: month.deaths,
    migration: month.migration,
    labour_force: month.labourForce,
    unemployment: month.unemployment,
    gdp_yearly: month.gdpYearly,
    jobs: JSON.stringify(month.jobs),
    output: JSON.stringify(month.output),
    buildings: JSON.stringify(month.buildings),
    rating: month.rating.score,
    pillars: JSON.stringify(month.rating.pillars),
    tier: month.rating.tier,
  }).onConflict(['state_id', 'arc']).ignore();

  // Keep the existing summary columns in step, so nothing shows a stale number.
  await trx('pol_states').where({ id: stateId }).update({ raw_population: month.population, raw_gdp: month.gdpYearly });
  return month;
}

// ─── Read view ──────────────────────────────────────────────────────────────

export interface SectorView {
  id: SectorId; name: string; jobs: number; jobShare: number; outputYearly: number; outputShare: number;
  buildings: number; buildingName: string;
}

export interface NationSimView {
  polStateCode: string;
  arc: number | null;
  /** True while the nation has no stored month yet (numbers are its starting point). */
  projected: boolean;
  population: number;
  populationChange: { births: number; deaths: number; migration: number };
  labourForce: number;
  unemployment: number;
  unemploymentTrend: number | null;
  gdpYearly: number;
  gdpPerPerson: number;
  gdpTrend: number | null;
  sectors: SectorView[];
  rating: number;
  ratingTrend: number | null;
  tier: string;
  tierBlurb: string;
  pillars: { id: PillarId; name: string; value: number }[];
  rank: number;
  history: { arc: number; rating: number; unemployment: number; gdpYearly: number; population: number }[];
}

const HISTORY_MONTHS = 12;

function buildView(code: string, m: R.NationSimMonth, arc: number | null, projected: boolean, prior: any | null, history: any[]): Omit<NationSimView, 'rank'> {
  const totalOut = SECTORS.reduce((a, s) => a + m.output[s], 0) || 1;
  const totalJobs = SECTORS.reduce((a, s) => a + m.jobs[s], 0) || 1;
  return {
    polStateCode: code,
    arc,
    projected,
    population: m.population,
    populationChange: { births: m.births, deaths: m.deaths, migration: m.migration },
    labourForce: m.labourForce,
    unemployment: m.unemployment,
    unemploymentTrend: prior ? m.unemployment - num(prior.unemployment) : null,
    gdpYearly: m.gdpYearly,
    gdpPerPerson: m.population > 0 ? Math.round(m.gdpYearly / m.population) : 0,
    gdpTrend: prior && num(prior.gdp_yearly) > 0 ? m.gdpYearly / num(prior.gdp_yearly) - 1 : null,
    sectors: SECTORS.map(s => ({
      id: s, name: SECTOR_SPECS[s].name,
      jobs: m.jobs[s], jobShare: m.jobs[s] / totalJobs,
      outputYearly: m.output[s] * 12, outputShare: m.output[s] / totalOut,
      buildings: m.buildings[s], buildingName: m.buildings[s] === 1 ? SECTOR_SPECS[s].building.singular : SECTOR_SPECS[s].building.plural,
    })),
    rating: m.rating.score,
    ratingTrend: prior ? Math.round((m.rating.score - num(prior.rating)) * 10) / 10 : null,
    tier: m.rating.tier,
    tierBlurb: m.rating.tierBlurb,
    pillars: (Object.keys(PILLAR_NAMES) as PillarId[]).map(id => ({ id, name: PILLAR_NAMES[id], value: m.rating.pillars[id] })),
    history: history.map(h => ({ arc: h.arc, rating: num(h.rating), unemployment: num(h.unemployment), gdpYearly: num(h.gdp_yearly), population: num(h.population) })).reverse(),
  };
}

function rowToMonth(row: any): R.NationSimMonth {
  const pillars = json(row.pillars);
  const tier = R.tierFor(num(row.rating));
  return {
    population: num(row.population), jobs: json(row.jobs),
    births: num(row.births), deaths: num(row.deaths), migration: num(row.migration),
    labourForce: num(row.labour_force), unemployment: num(row.unemployment),
    output: json(row.output), gdpYearly: num(row.gdp_yearly), buildings: json(row.buildings),
    rating: { score: num(row.rating), pillars, tier: row.tier, tierBlurb: tier.blurb },
  };
}

/** Every starter nation's economy and world rating, ranked. Read-only. */
export async function nationSimViews(conn: any): Promise<NationSimView[]> {
  if (!NATION_SIM_ENABLED) return [];
  const out: Omit<NationSimView, 'rank'>[] = [];
  for (const spec of STARTER_NATIONS) {
    const state = await conn('pol_states').where({ code: spec.polStateCode }).first();
    if (!state) continue;
    const rows = await conn('nation_sim_months').where({ state_id: state.id }).orderBy('arc', 'desc').limit(HISTORY_MONTHS);
    if (rows.length > 0) {
      out.push(buildView(spec.polStateCode, rowToMonth(rows[0]), rows[0].arc, false, rows[1] ?? null, rows));
    } else {
      // Before the first monthly step: show where the nation starts, without writing anything.
      const ctx = await contextFor(conn, state);
      out.push(buildView(spec.polStateCode, R.describe(R.initialState(ctx), ctx), null, true, null, []));
    }
  }
  const ranked = R.rankNations(out.map(v => ({ ...v, score: v.rating })));
  return ranked.map(({ score: _s, ...v }) => v);
}
