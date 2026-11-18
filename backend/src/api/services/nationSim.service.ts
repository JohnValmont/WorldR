/**
 * Nations simulation: the monthly step, the budget decision and the read view
 * (docs/NATIONS_SIMULATION.md, layers 1-4).
 *
 * Rules are pure functions in nationSim.rules.ts. This file only loads inputs,
 * calls the rules, and stores one row per nation per month.
 *
 * READ-ONLY for the rest of the game: elections, approval, votes, deals and
 * support never read the rating, unemployment, GDP, budget or trade.
 */
import { AppError } from '../../utils/errors';
import {
  BUDGET_MINISTER_POST, DISCRETIONARY_SHARE, NATION_SIM_ENABLED, PILLAR_NAMES, PillarId, PROGRAMME_SPECS, PROGRAMMES,
  SECTOR_SPECS, SECTORS, SectorId, TRADABLE_SECTORS,
} from '../constants/nationSim';
import { getNationForPolState, headOfGovernmentTitle, STARTER_NATIONS } from '../constants/nations';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { getGovernment, getLawsInForce } from './statecraft.service';
import type { PlayerPolitics } from './floor.service';
import * as R from './nationSim.rules';

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const json = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);

/** Monthly car-making capacity of companies' factories in this country. */
async function factoryCapacity(conn: any, countryId: string | null): Promise<number> {
  if (!countryId) return 0;
  const row = await conn('manufacturing_factories')
    .where({ country_id: countryId, status: 'active' })
    .sum({ cap: 'capacity_per_month' })
    .first();
  return num(row?.cap);
}

// ─── Who decides the budget ─────────────────────────────────────────────────

export interface SplitSource {
  split: R.Split;
  /** 'player' = set by a head of government or finance minister who still holds office; 'computer' = the lead party's platform. */
  source: 'player' | 'computer';
  byName: string | null;
  setArc: number | null;
}

/** Characters who may set this nation's budget right now. */
async function budgetHolders(conn: any, stateId: string): Promise<string[]> {
  const out: string[] = [];
  const premier = await conn('pol_offices').where({ state_id: stateId, office: 'premier' }).orderBy('since_arc', 'desc').first();
  if (premier?.holder_character_id) out.push(premier.holder_character_id);
  const finance = await conn('pol_cabinet_posts').where({ state_id: stateId, post_key: BUDGET_MINISTER_POST }).first();
  if (finance?.holder_character_id) out.push(finance.holder_character_id);
  return out;
}

export async function resolveSplit(conn: any, stateId: string): Promise<SplitSource> {
  const row = await conn('nation_budgets').where({ state_id: stateId }).first();
  if (row?.set_by_character_id && (await budgetHolders(conn, stateId)).includes(row.set_by_character_id)) {
    const who = await conn('characters').where({ id: row.set_by_character_id }).select('name').first();
    return { split: json(row.split), source: 'player', byName: who?.name ?? null, setArc: num(row.set_arc) };
  }
  const gov = await getGovernment(conn, stateId);
  const lead = gov.leadPartyId ? await conn('pol_parties').where({ id: gov.leadPartyId }).select('name', 'platform').first() : null;
  return { split: R.npcSplit(lead ? json(lead.platform) : null), source: 'computer', byName: lead?.name ?? null, setArc: null };
}

// ─── Monthly step ───────────────────────────────────────────────────────────

interface Loaded {
  state: any;
  ctx: R.NationSimContext;
  prev: R.NationSimState | null;
  done: boolean;
}

function rowToState(row: any, ctx: R.NationSimContext): R.NationSimState {
  const jobs = json(row.jobs);
  // Rows from before the budget existed have no debt: start it from the nation's ratio.
  const debt = row.debt == null ? Math.round(num(row.gdp_yearly) * ctx.spec.debtRatio) : num(row.debt);
  return { population: num(row.population), jobs, debt };
}

async function loadNation(conn: any, state: any, arc: number | null): Promise<Loaded> {
  const ctx: R.NationSimContext = {
    spec: R.economySpecFor(state.code),
    stats: readNationalStatsFromRow(state) as any,
    laws: await getLawsInForce(conn, state.id),
    playerFactoryCapacity: await factoryCapacity(conn, state.country_id),
    split: (await resolveSplit(conn, state.id)).split,
  };
  const prevQ = conn('nation_sim_months').where({ state_id: state.id }).orderBy('arc', 'desc');
  if (arc != null) prevQ.where('arc', '<', arc);
  const prevRow = await prevQ.first();
  const done = arc != null && !!(await conn('nation_sim_months').where({ state_id: state.id, arc }).first());
  return { state, ctx, prev: prevRow ? rowToState(prevRow, ctx) : null, done };
}

/** Trade between the loaded nations, from each one's state this month (or its starting state). */
function tradeFor(nations: Loaded[]): Record<string, R.TradeResult> {
  return R.computeTrade(nations.map(n => {
    const pop = n.prev?.population ?? n.ctx.spec.population;
    return {
      code: n.state.code,
      structural: R.structuralOutput(n.ctx, pop),
      tariffs: R.tariffRates(n.ctx.laws),
      foundingTariffs: R.tariffRates(R.foundingLaws(n.state.code)),
    };
  }));
}

async function insertMonth(trx: any, stateId: string, arc: number, m: R.NationSimMonth) {
  await trx('nation_sim_months').insert({
    state_id: stateId,
    arc,
    population: m.population,
    births: m.births,
    deaths: m.deaths,
    migration: m.migration,
    labour_force: m.labourForce,
    unemployment: m.unemployment,
    gdp_yearly: m.gdpYearly,
    jobs: JSON.stringify(m.jobs),
    output: JSON.stringify(m.output),
    buildings: JSON.stringify(m.buildings),
    rating: m.rating.score,
    pillars: JSON.stringify(m.rating.pillars),
    tier: m.rating.tier,
    debt: m.debt,
    budget: JSON.stringify(m.budget),
    trade: JSON.stringify(m.trade),
  }).onConflict(['state_id', 'arc']).ignore();
  // Keep the existing summary columns in step, so nothing shows a stale number.
  await trx('pol_states').where({ id: stateId }).update({ raw_population: m.population, raw_gdp: m.gdpYearly });
}

/**
 * Advance every nation by one month. Trade needs all nations at once, so the
 * world is loaded first; then each nation is written in its own savepoint, so
 * one failure never rolls back another nation (or anyone's politics).
 * Idempotent per arc. Call after the month's national stats are updated.
 * Returns the nations that failed, with their errors (the caller logs and reports them).
 */
export async function stepNationSims(trx: any, arc: number): Promise<{ stateId: string; error: unknown }[]> {
  if (!NATION_SIM_ENABLED) return [];
  const states = await trx('pol_states').whereIn('code', STARTER_NATIONS.map(n => n.polStateCode)).where({ is_active: true });
  const nations: Loaded[] = [];
  for (const state of states) if (getNationForPolState(state.code)) nations.push(await loadNation(trx, state, arc));
  if (nations.length === 0) return [];
  const trade = tradeFor(nations);
  const failures: { stateId: string; error: unknown }[] = [];
  for (const n of nations) {
    if (n.done) continue;
    try {
      await trx.transaction(async (sp: any) => {
        const ctx = { ...n.ctx, trade: trade[n.state.code] ?? R.NO_TRADE };
        const month = n.prev ? R.stepMonth(n.prev, ctx) : R.describe(R.initialState(ctx), ctx);
        await insertMonth(sp, n.state.id, arc, month);
      });
    } catch (error) {
      failures.push({ stateId: n.state.id, error });
    }
  }
  return failures;
}

// ─── The budget decision ────────────────────────────────────────────────────

/**
 * The head of government or the finance minister splits the discretionary
 * budget between the four programmes (the rest is saved). Once per month per
 * nation; it applies from the next monthly step and stays until changed or
 * until its author leaves office.
 */
export async function setBudget(trx: any, stateId: string, me: PlayerPolitics, input: any, arc: number) {
  const mayDecide = me.isPremier || me.post?.post_key === BUDGET_MINISTER_POST;
  if (!mayDecide) throw new AppError('Only the head of government or the finance minister sets the budget.', 403, 'FORBIDDEN');
  const v = R.validateSplit(input);
  if ('error' in v) throw new AppError(v.error, 400, 'BAD_REQUEST');
  const existing = await trx('nation_budgets').where({ state_id: stateId }).forUpdate().first();
  if (existing && num(existing.set_arc) === arc) throw new AppError('The budget has already been set this month.', 409, 'CONFLICT');
  await trx('nation_budgets')
    .insert({ state_id: stateId, split: JSON.stringify(v.split), set_by_character_id: me.character.id, set_arc: arc, updated_at: trx.fn.now() })
    .onConflict('state_id').merge();
  const state = await trx('pol_states').where({ id: stateId }).select('code').first();
  const title = me.isPremier ? headOfGovernmentTitle(state?.code) : 'Finance Minister';
  const top = [...PROGRAMMES].sort((a, b) => v.split[b] - v.split[a])[0];
  const saved = 1 - PROGRAMMES.reduce((a, p) => a + v.split[p], 0);
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'budget',
    headline: `${title} ${me.character.name} sets the budget: ${PROGRAMME_SPECS[top].name} gets the most`,
    body: PROGRAMMES.map(p => `${PROGRAMME_SPECS[p].name} ${Math.round(v.split[p] * 100)}%`).join(', ') + (saved > 0.0005 ? `, ${Math.round(saved * 100)}% saved` : '') + '.',
  });
  return { message: 'Budget set. It takes effect when the month closes.', split: v.split };
}

// ─── Read view ──────────────────────────────────────────────────────────────

export interface SectorView {
  id: SectorId; name: string; jobs: number; jobShare: number; outputYearly: number; outputShare: number;
  buildings: number; buildingName: string;
}

export interface BudgetView {
  revenue: number; taxes: number; tariffs: number;
  spending: number; interest: number; deficit: number; debt: number; debtRatio: number; funded: number;
  lines: { id: string; name: string; amount: number; kind: 'law' | 'programme' | 'interest' | 'running' }[];
  saved: number;
  split: R.Split;
  splitSource: 'player' | 'computer';
  splitBy: string | null;
  setThisMonth: boolean;
  discretionary: number;
  programmes: { id: string; name: string; blurb: string; share: number }[];
}

export interface TradeView {
  balanceYearly: number;
  tariffRevenueYearly: number;
  efficiency: number;
  sectors: { id: SectorId; name: string; exportsYearly: number; importsYearly: number; tariff: number; jobsEffect: number }[];
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
  budget: BudgetView;
  trade: TradeView;
  history: { arc: number; rating: number; unemployment: number; gdpYearly: number; population: number; debtRatio: number | null }[];
}

const HISTORY_MONTHS = 12;
const LAW_LINE_NAMES: Record<string, string> = { welfare: 'Welfare (by law)', healthcare: 'Healthcare (by law)', education: 'Schools (by law)', defense: 'Defence (by law)', running: 'Running the state' };

function budgetView(b: R.BudgetMonth, gdp: number, src: SplitSource, currentArc: number | null): BudgetView {
  const lines: BudgetView['lines'] = [
    ...Object.entries(b.lawSpending).map(([id, amount]) => ({ id, name: LAW_LINE_NAMES[id] ?? id, amount, kind: (id === 'running' ? 'running' : 'law') as 'law' | 'running' })),
    ...PROGRAMMES.map(p => ({ id: p, name: PROGRAMME_SPECS[p].name, amount: b.programmes[p] ?? 0, kind: 'programme' as const })),
    { id: 'interest', name: 'Interest on debt', amount: b.interest, kind: 'interest' as const },
  ];
  return {
    revenue: b.revenue, taxes: b.taxes, tariffs: b.tariffs, spending: b.spending, interest: b.interest,
    deficit: b.deficit, debt: b.debt, debtRatio: b.debtRatio, funded: b.funded, lines, saved: b.saved,
    split: src.split, splitSource: src.source, splitBy: src.byName,
    setThisMonth: src.setArc != null && currentArc != null && src.setArc === currentArc,
    discretionary: Math.round(DISCRETIONARY_SHARE * gdp),
    programmes: PROGRAMMES.map(p => ({ id: p, name: PROGRAMME_SPECS[p].name, blurb: PROGRAMME_SPECS[p].blurb, share: src.split[p] })),
  };
}

function tradeView(t: R.TradeResult, laws: R.Laws): TradeView {
  const rates = R.tariffRates(laws);
  return {
    balanceYearly: t.balance * 12,
    tariffRevenueYearly: t.tariffRevenue * 12,
    efficiency: t.efficiency,
    sectors: TRADABLE_SECTORS.map(s => ({
      id: s, name: SECTOR_SPECS[s].name,
      exportsYearly: (t.exports[s] ?? 0) * 12, importsYearly: (t.imports[s] ?? 0) * 12,
      tariff: rates[s] ?? 0, jobsEffect: (t.mult[s] ?? 1) - 1,
    })),
  };
}

function rowToMonth(row: any, ctx: R.NationSimContext): R.NationSimMonth {
  const tier = R.tierFor(num(row.rating));
  const state = rowToState(row, ctx);
  const trade: R.TradeResult = row.trade ? json(row.trade) : R.NO_TRADE;
  const budget: R.BudgetMonth = row.budget
    ? json(row.budget)
    : { ...R.budgetMonth({ gdpYearly: num(row.gdp_yearly), laws: ctx.laws, debt: state.debt, split: ctx.split!, tariffRevenueMonthly: 0 }), debt: state.debt, debtRatio: num(row.gdp_yearly) > 0 ? state.debt / num(row.gdp_yearly) : 0 };
  return {
    ...state,
    births: num(row.births), deaths: num(row.deaths), migration: num(row.migration),
    labourForce: num(row.labour_force), unemployment: num(row.unemployment),
    output: json(row.output), gdpYearly: num(row.gdp_yearly), buildings: json(row.buildings),
    rating: { score: num(row.rating), pillars: json(row.pillars), tier: row.tier, tierBlurb: tier.blurb },
    budget, trade, efficiency: trade.efficiency ?? 1,
  };
}

function buildView(code: string, m: R.NationSimMonth, arc: number | null, projected: boolean, prior: any | null, history: any[], src: SplitSource, laws: R.Laws, currentArc: number | null): Omit<NationSimView, 'rank'> {
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
    budget: budgetView(m.budget, m.gdpYearly, src, currentArc),
    trade: tradeView(m.trade, laws),
    history: history.map(h => ({
      arc: h.arc, rating: num(h.rating), unemployment: num(h.unemployment), gdpYearly: num(h.gdp_yearly), population: num(h.population),
      debtRatio: h.debt != null && num(h.gdp_yearly) > 0 ? num(h.debt) / num(h.gdp_yearly) : null,
    })).reverse(),
  };
}

/** Every starter nation's economy, budget, trade and world rating, ranked. Read-only. */
export async function nationSimViews(conn: any): Promise<NationSimView[]> {
  if (!NATION_SIM_ENABLED) return [];
  const clock = await conn('world_clock').first();
  const currentArc = clock ? num(clock.pol_current_year) * 12 + (num(clock.pol_current_month, 1) - 1) : null;
  const loaded: Loaded[] = [];
  for (const spec of STARTER_NATIONS) {
    const state = await conn('pol_states').where({ code: spec.polStateCode }).first();
    if (state) loaded.push(await loadNation(conn, state, null));
  }
  // Projected trade for nations with no stored month yet (so a fresh world still shows its trade).
  const projectedTrade = loaded.some(n => !n.prev) ? tradeFor(loaded) : {};
  const out: Omit<NationSimView, 'rank'>[] = [];
  for (const n of loaded) {
    const src = await resolveSplit(conn, n.state.id);
    const rows = await conn('nation_sim_months').where({ state_id: n.state.id }).orderBy('arc', 'desc').limit(HISTORY_MONTHS);
    if (rows.length > 0) {
      out.push(buildView(n.state.code, rowToMonth(rows[0], n.ctx), rows[0].arc, false, rows[1] ?? null, rows, src, n.ctx.laws, currentArc));
    } else {
      // Before the first monthly step: show where the nation starts, without writing anything.
      const ctx = { ...n.ctx, trade: projectedTrade[n.state.code] ?? R.NO_TRADE };
      out.push(buildView(n.state.code, R.describe(R.initialState(ctx), ctx), null, true, null, [], src, n.ctx.laws, currentArc));
    }
  }
  const ranked = R.rankNations(out.map(v => ({ ...v, score: v.rating })));
  return ranked.map(({ score: _s, ...v }) => v);
}
