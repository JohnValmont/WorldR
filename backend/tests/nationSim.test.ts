/**
 * Nations simulation (docs/NATIONS_SIMULATION.md): people, jobs, sectors,
 * buildings (layers 1-2), the national budget (layer 3), trade between nations
 * (layer 4) and the world rating. Pure rules only, ratio-based.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as R from '../src/api/services/nationSim.rules';
import {
  BASE_SPLIT, DEBT_CEILING_RATIO, DEBT_SAFE_RATIO, DISCRETIONARY_SHARE, GDP_REFERENCE_YEARLY, GDP_SIZE_PER_DOUBLING,
  LAW_JOB_EFFECTS, LAW_SPENDING, MAX_POPULATION_CHANGE, NATION_ECONOMIES, PILLAR_WEIGHTS, PROGRAMMES, RATING_BALANCE_TOLERANCE,
  RATING_TIERS, SECTORS, TARIFF_RATES, TRADABLE_SECTORS, TRADE_MULT_MAX, UNEMPLOYMENT_MAX, UNEMPLOYMENT_MIN,
} from '../src/api/constants/nationSim';
import { DEFAULT_LAWS, STARTER_NATIONS } from '../src/api/constants/nations';
import { NATIONAL_STATS, POLICY_CATALOG } from '../src/api/constants/macroEconomy';

/**
 * How a nation actually starts: its base stats (founding laws have no
 * pol_active_policies rows, so they never move stats) and its founding laws
 * in force (which DO move jobs, through getLawsInForce).
 */
function founding(n: (typeof STARTER_NATIONS)[number]) {
  const laws: Record<string, string> = { ...DEFAULT_LAWS, ...(n.foundingLaws ?? {}) };
  const stats: Record<string, number> = {};
  for (const k of NATIONAL_STATS) stats[k] = n.baseStats?.[k] ?? 50;
  return { spec: R.economySpecFor(n.polStateCode), stats, laws, playerFactoryCapacity: 0 };
}

const DRENNIA = STARTER_NATIONS.find(n => n.polStateCode === 'national')!;

/** Run `months` months under a changed context, starting from the nation's normal start. */
function after(months: number, change: { stats?: Record<string, number>; laws?: Record<string, string>; factory?: number } = {}) {
  const base = founding(DRENNIA);
  const ctx = { ...base, stats: { ...base.stats, ...(change.stats ?? {}) }, laws: { ...base.laws, ...(change.laws ?? {}) }, playerFactoryCapacity: change.factory ?? 0 };
  let m: R.NationSimMonth = R.describe(R.initialState(base), base);
  for (let i = 0; i < months; i++) m = R.stepMonth(m, ctx);
  return m;
}

describe('Data integrity', () => {
  it('pillar weights add up to 1', () => {
    const sum = Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  });
  it('every starter nation has an economy, with jobs for 90-97% of its workers', () => {
    for (const n of STARTER_NATIONS) {
      const spec = NATION_ECONOMIES[n.polStateCode];
      assert.ok(spec, `${n.shortName} has no economy`);
      const sum = SECTORS.reduce((a, s) => a + spec.jobShare[s], 0);
      assert.ok(sum >= 0.90 && sum <= 0.97, `${n.shortName} job shares sum to ${sum}`);
    }
  });
  it('every law that moves jobs is a real law option', () => {
    for (const [cat, opts] of Object.entries(LAW_JOB_EFFECTS)) {
      const def = POLICY_CATALOG.find(c => c.id === cat);
      assert.ok(def, `unknown law ${cat}`);
      for (const opt of Object.keys(opts)) assert.ok(def!.options.some(o => o.id === opt), `unknown option ${cat}.${opt}`);
    }
  });
  it('tiers run from highest to lowest and cover 0', () => {
    for (let i = 1; i < RATING_TIERS.length; i++) assert.ok(RATING_TIERS[i].min < RATING_TIERS[i - 1].min);
    assert.strictEqual(RATING_TIERS[RATING_TIERS.length - 1].min, 0);
  });
});

describe('Different but balanced nations', () => {
  const starts = STARTER_NATIONS.map(n => { const c = founding(n); return { n, m: R.describe(R.initialState(c), c) }; });

  it(`starting ratings are within ${RATING_BALANCE_TOLERANCE} points of each other`, () => {
    const scores = starts.map(s => s.m.rating.score);
    assert.ok(Math.max(...scores) - Math.min(...scores) <= RATING_BALANCE_TOLERANCE, `ratings ${scores.join(', ')}`);
  });
  it('all three start in the same tier, with room to climb', () => {
    assert.strictEqual(new Set(starts.map(s => s.m.rating.tier)).size, 1, starts.map(s => s.m.rating.tier).join(', '));
  });
  it('every nation starts with believable unemployment (3-8%)', () => {
    for (const { n, m } of starts) assert.ok(m.unemployment >= 0.03 && m.unemployment <= 0.08, `${n.shortName} ${m.unemployment}`);
  });
  it('they really are different: Eryndor is the most industrial, Westmark the least', () => {
    const share = (code: string) => { const s = starts.find(x => x.n.polStateCode === code)!.m; return R.industryShare(s.jobs, s.population); };
    assert.ok(share('eryndor') > share('national') && share('national') > share('westmark'));
  });
  it('a nation left alone stays steady (rating within 1 point, population within 2% over two years)', () => {
    for (const n of STARTER_NATIONS) {
      const c = founding(n);
      const m0 = R.describe(R.initialState(c), c);
      let m = m0;
      for (let i = 0; i < 24; i++) m = R.stepMonth(m, c);
      assert.ok(Math.abs(m.rating.score - m0.rating.score) <= 1, `${n.shortName} drifted ${m0.rating.score} -> ${m.rating.score}`);
      assert.ok(Math.abs(m.population / m0.population - 1) <= 0.02, `${n.shortName} population ${m0.population} -> ${m.population}`);
    }
  });
});

describe('Jobs react to the economy and the law', () => {
  const normal = after(24);
  it('a recession at least doubles unemployment and costs more than 5 rating points', () => {
    const r = after(24, { stats: { prosperity: 30 } });
    assert.ok(r.unemployment >= 2 * normal.unemployment, `${normal.unemployment} -> ${r.unemployment}`);
    assert.ok(r.rating.score < normal.rating.score - 5, `${normal.rating.score} -> ${r.rating.score}`);
  });
  it('a sustained boom with an open border lifts a nation into Regional power', () => {
    const b = after(36, { stats: { prosperity: 70, human_development: 60 }, laws: { immigration: 'open' } });
    assert.strictEqual(b.rating.tier, 'Regional power', `${b.rating.score}`);
  });
  it('a boom cuts unemployment and grows output by more than 10%', () => {
    const b = after(24, { stats: { prosperity: 70 } });
    assert.ok(b.unemployment < normal.unemployment);
    assert.ok(b.gdpYearly / normal.gdpYearly > 1.10);
  });
  it('a very high minimum wage costs retail jobs and raises unemployment', () => {
    const w = after(24, { laws: { min_wage: 'very_high' } });
    assert.ok(w.jobs.retail / normal.jobs.retail < 0.95);
    assert.ok(w.unemployment > normal.unemployment);
  });
  it('tight money slows building', () => {
    const t = after(24, { laws: { interest_rate: 'tight' } });
    assert.ok(t.jobs.construction / normal.jobs.construction < 0.95);
  });
  it('hiring takes time: one month moves jobs only part of the way', () => {
    const one = after(1, { stats: { prosperity: 30 } });
    const two_years = after(24, { stats: { prosperity: 30 } });
    const start = after(0);
    const moved = (start.jobs.services - one.jobs.services) / (start.jobs.services - two_years.jobs.services);
    assert.ok(moved > 0.05 && moved < 0.3, `one month moved ${moved} of the way`);
  });
  it('player car factories add manufacturing jobs', () => {
    const f = after(12, { factory: 2000 });
    assert.ok(f.jobs.manufacturing > normal.jobs.manufacturing);
  });
  it('unemployment is always reported inside its bounds', () => {
    const jobs = { agriculture: 0, manufacturing: 0, construction: 0, retail: 0, services: 0, energy: 0 };
    assert.strictEqual(R.unemploymentRate(jobs, 1_000_000), UNEMPLOYMENT_MAX);
    assert.strictEqual(R.unemploymentRate({ ...jobs, services: 10_000_000 }, 1_000_000), UNEMPLOYMENT_MIN);
  });
});

describe('People move', () => {
  it('an open border and a boom grow the population faster than a closed border', () => {
    const open = after(24, { stats: { prosperity: 65 }, laws: { immigration: 'open' } });
    const closed = after(24, { stats: { prosperity: 65 }, laws: { immigration: 'closed' } });
    assert.ok(open.population > closed.population);
  });
  it('people leave a collapsing country even when the border is closed', () => {
    const s = R.stepPopulation(10_000_000, { prosperity: 20, human_development: 50 }, 0.25, 'closed');
    assert.ok(s.migration < 0);
  });
  it('population never moves more than the monthly cap', () => {
    for (const [prosperity, unemp] of [[100, 0.02], [0, 0.35]]) {
      const s = R.stepPopulation(10_000_000, { prosperity, human_development: 50 }, unemp, 'open');
      assert.ok(Math.abs(s.population / 10_000_000 - 1) <= MAX_POPULATION_CHANGE + 1e-9);
    }
  });
});

describe('World rating', () => {
  it('size is log-scaled: doubling GDP adds a fixed number of points, not double', () => {
    const a = R.gdpSizeScore(GDP_REFERENCE_YEARLY);
    const b = R.gdpSizeScore(GDP_REFERENCE_YEARLY * 2);
    assert.strictEqual(a, 50);
    assert.ok(Math.abs(b - a - GDP_SIZE_PER_DOUBLING) < 1e-9);
  });
  it('tiers follow the thresholds', () => {
    assert.strictEqual(R.tierFor(85).name, 'Superpower');
    assert.strictEqual(R.tierFor(65).name, 'Great power');
    assert.strictEqual(R.tierFor(55).name, 'Regional power');
    assert.strictEqual(R.tierFor(54.9).name, 'Middle power');
    assert.strictEqual(R.tierFor(45).name, 'Middle power');
    assert.strictEqual(R.tierFor(10).name, 'Minor state');
  });
  it('superpower needs near-perfect play; a good nation is not one by default', () => {
    const c = founding(DRENNIA);
    const start = R.describe(R.initialState(c), c);
    assert.notStrictEqual(start.rating.tier, 'Superpower');
    assert.notStrictEqual(start.rating.tier, 'Great power');
    const great: Record<string, number> = {};
    for (const k of NATIONAL_STATS) great[k] = 90;
    const top = R.nationRating({ stats: great, gdpYearly: GDP_REFERENCE_YEARLY * 4, unemployment: 0.03, jobs: start.jobs, population: start.population, defenceLaw: 'very_high' });
    assert.ok(top.score >= 80, `max play scores ${top.score}`);
  });
  it('ranks highest first', () => {
    const ranked = R.rankNations([{ id: 'a', score: 50 }, { id: 'b', score: 60 }, { id: 'c', score: 55 }]);
    assert.deepStrictEqual(ranked.map(r => [r.id, r.rank]), [['b', 1], ['c', 2], ['a', 3]]);
  });
  it('buildings follow the workforce', () => {
    const m = after(0);
    for (const s of SECTORS) assert.ok(m.buildings[s] > 0, `${s} has no buildings`);
  });
});

// ─── Three nations together (trade needs partners) ──────────────────────────

type Change = { laws?: Record<string, string>; split?: R.Split };
/** Run the whole world for `months`, each nation from its normal start, with optional changes per nation (by pol_states.code). */
function worldAfter(months: number, changes: Record<string, Change> = {}) {
  const ctxOf = (n: (typeof STARTER_NATIONS)[number]): R.NationSimContext => {
    const f = founding(n);
    const c = changes[n.polStateCode] ?? {};
    return { ...f, laws: { ...f.laws, ...(c.laws ?? {}) }, split: c.split };
  };
  let states = STARTER_NATIONS.map(n => R.initialState(founding(n)) as R.NationSimState);
  let months_: R.NationSimMonth[] = [];
  for (let m = 0; m < months; m++) {
    const ctxs = STARTER_NATIONS.map(ctxOf);
    const trade = R.computeTrade(STARTER_NATIONS.map((n, i) => ({
      code: n.polStateCode, structural: R.structuralOutput(ctxs[i], states[i].population),
      tariffs: R.tariffRates(ctxs[i].laws), foundingTariffs: R.tariffRates(R.foundingLaws(n.polStateCode)),
    })));
    months_ = STARTER_NATIONS.map((n, i) => R.stepMonth(states[i], { ...ctxs[i], trade: trade[n.polStateCode] }));
    states = months_;
  }
  return Object.fromEntries(STARTER_NATIONS.map((n, i) => [n.polStateCode, months_[i]])) as Record<string, R.NationSimMonth>;
}

describe('Layer 4: trade between nations', () => {
  const normal = worldAfter(24);

  it('every tariff option sets a rate for every traded sector', () => {
    for (const [opt, rates] of Object.entries(TARIFF_RATES)) {
      for (const s of TRADABLE_SECTORS) assert.ok(typeof rates[s] === 'number', `${opt}.${s}`);
    }
  });
  it('trade adds up: what the world exports, the world imports', () => {
    const total = Object.values(normal).reduce((a, m) => a + m.trade.balance, 0);
    const volume = Object.values(normal).reduce((a, m) => a + Math.abs(m.trade.balance), 0);
    assert.ok(Math.abs(total) <= volume * 0.001 + 2, `net world balance ${total}`);
  });
  it('the nations really trade: Westmark imports goods, Eryndor exports them', () => {
    assert.ok(normal.westmark.trade.balance < 0);
    assert.ok(normal.eryndor.trade.balance > 0);
  });
  it('at the founding tariffs trade changes nothing at home', () => {
    for (const m of Object.values(normal)) {
      for (const s of TRADABLE_SECTORS) assert.strictEqual(m.trade.mult[s], 1);
      assert.strictEqual(m.trade.efficiency, 1);
      for (const v of Object.values(m.trade.consumerMult)) assert.strictEqual(v, 1);
    }
  });
  it('an importer that raises tariffs gains factory jobs and revenue; its supplier loses factory jobs', () => {
    const w = worldAfter(24, { westmark: { laws: { tariffs: 'high' } } });
    assert.ok(w.westmark.jobs.manufacturing / normal.westmark.jobs.manufacturing > 1.05);
    assert.ok(w.westmark.trade.tariffRevenue > normal.westmark.trade.tariffRevenue);
    assert.ok(w.eryndor.jobs.manufacturing / normal.eryndor.jobs.manufacturing < 0.97);
    assert.ok(w.eryndor.unemployment > normal.eryndor.unemployment);
  });
  it('protection costs at home: dearer goods cut shop jobs and protected work is less efficient', () => {
    const w = worldAfter(24, { westmark: { laws: { tariffs: 'high' } } });
    assert.ok(w.westmark.jobs.retail < normal.westmark.jobs.retail);
    assert.ok(w.westmark.trade.efficiency < 1);
  });
  it('a tariff on goods a nation does not import does nothing (Eryndor exports everything it trades)', () => {
    const w = worldAfter(24, { eryndor: { laws: { tariffs: 'free_trade' } } });
    assert.ok(Math.abs(w.eryndor.gdpYearly / normal.eryndor.gdpYearly - 1) < 0.001);
    assert.strictEqual(w.eryndor.jobs.retail, normal.eryndor.jobs.retail);
  });
  it('opening up helps an importer\'s shoppers', () => {
    const w = worldAfter(24, { national: { laws: { tariffs: 'free_trade' } } });
    assert.ok(w.national.jobs.retail >= normal.national.jobs.retail);
    assert.ok(w.national.trade.efficiency >= 1);
  });
  it('trade effects are capped', () => {
    const w = worldAfter(12, { westmark: { laws: { tariffs: 'high' } }, national: { laws: { tariffs: 'high' } } });
    for (const m of Object.values(w)) for (const s of TRADABLE_SECTORS) assert.ok((m.trade.mult[s] ?? 1) <= TRADE_MULT_MAX);
  });
});

describe('Layer 3: the national budget', () => {
  const laws = R.foundingLaws('national');

  it('every spending law option has a cost', () => {
    for (const [cat, opts] of Object.entries(LAW_SPENDING)) {
      const def = POLICY_CATALOG.find(c => c.id === cat);
      assert.ok(def, `unknown law ${cat}`);
      for (const o of def!.options) assert.ok(typeof opts[o.id] === 'number', `no cost for ${cat}.${o.id}`);
    }
  });
  it('a split must be shares between 0 and 1 that add up to at most the whole', () => {
    assert.ok('error' in R.validateSplit({ industry: 0.6, welfare: 0.6, interior: 0, defence: 0 }));
    assert.ok('error' in R.validateSplit({ industry: -0.1, welfare: 0, interior: 0, defence: 0 }));
    assert.ok('error' in R.validateSplit(null));
    const ok = R.validateSplit({ industry: 0.5, welfare: 0.2, interior: 0.1, defence: 0.1 });
    assert.ok('split' in ok);
  });
  it('the base split changes nothing', () => {
    assert.deepStrictEqual(Object.values(R.programmeJobMult(BASE_SPLIT)).filter(v => v !== 1), []);
    assert.deepStrictEqual(Object.values(R.programmePillarBonus(BASE_SPLIT)).filter(v => Math.abs(v) > 1e-9), []);
  });
  it('a computer government spends the whole budget and never goes to extremes', () => {
    for (const platform of [{ labour: 100, investment: 0, stability: 0 }, { labour: 0, investment: 100, stability: 100 }, undefined]) {
      const s = R.npcSplit(platform as any);
      const sum = PROGRAMMES.reduce((a, p) => a + s[p], 0);
      assert.ok(Math.abs(sum - 1) < 0.01, `sums to ${sum}`);
      for (const p of PROGRAMMES) assert.ok(Math.abs(s[p] - BASE_SPLIT[p]) <= 0.16, `${p} ${s[p]}`);
    }
  });
  it('moving money is a trade-off: more for defence means less for the other programmes', () => {
    const b = R.programmePillarBonus({ industry: 0.1, welfare: 0.1, interior: 0.1, defence: 0.7 });
    assert.ok((b.military ?? 0) > 0);
    assert.ok((b.people ?? 0) < 0 && (b.stability ?? 0) < 0 && (b.industry ?? 0) < 0);
  });
  it('saving the whole programme budget cuts the deficit by exactly that budget', () => {
    const gdp = 300e9, debt = 150e9;
    const spend = R.budgetMonth({ gdpYearly: gdp, laws, debt, split: BASE_SPLIT, tariffRevenueMonthly: 0 });
    const save = R.budgetMonth({ gdpYearly: gdp, laws, debt, split: { industry: 0, welfare: 0, interior: 0, defence: 0 }, tariffRevenueMonthly: 0 });
    assert.ok(Math.abs((spend.deficit - save.deficit) / (DISCRETIONARY_SHARE * gdp) - 1) < 0.001);
  });
  it('a month adds one twelfth of the yearly deficit to the debt', () => {
    const b = R.budgetMonth({ gdpYearly: 300e9, laws, debt: 150e9, split: BASE_SPLIT, tariffRevenueMonthly: 0 });
    assert.ok(Math.abs((b.debt - 150e9) / (b.deficit / 12) - 1) < 0.001);
  });
  it('higher taxes raise more', () => {
    assert.ok(R.taxShare({ ...laws, income_tax: 'flat_high' }) > R.taxShare(laws));
  });
  it('tariff revenue goes into the budget', () => {
    const a = R.budgetMonth({ gdpYearly: 300e9, laws, debt: 0, split: BASE_SPLIT, tariffRevenueMonthly: 0 });
    const b = R.budgetMonth({ gdpYearly: 300e9, laws, debt: 0, split: BASE_SPLIT, tariffRevenueMonthly: 1e9 });
    assert.strictEqual(b.revenue - a.revenue, 12e9);
  });
  it('over the debt ceiling nobody lends: programmes are cut to what taxes leave', () => {
    const b = R.budgetMonth({ gdpYearly: 100e9, laws: { ...laws, welfare: 'ubi_full', income_tax: 'none' }, debt: (DEBT_CEILING_RATIO + 0.1) * 100e9, split: BASE_SPLIT, tariffRevenueMonthly: 0 });
    assert.ok(b.funded < 1);
  });
  it('debt only hurts the Economy score above the safe line', () => {
    assert.strictEqual(R.debtPenalty(DEBT_SAFE_RATIO), 0);
    assert.ok(R.debtPenalty(DEBT_SAFE_RATIO + 0.5) > 0);
  });
  it('putting everything into one programme is not a free win (rating within 1 point after two years)', () => {
    const normal = worldAfter(24);
    const allIn = worldAfter(24, { national: { split: { industry: 1, welfare: 0, interior: 0, defence: 0 } } });
    assert.ok(Math.abs(allIn.national.rating.score - normal.national.rating.score) <= 1, `${normal.national.rating.score} -> ${allIn.national.rating.score}`);
    assert.ok(allIn.national.unemployment < normal.national.unemployment, 'but it does create jobs');
  });
  it('spending far beyond your means ends in collapse (UBI with no income tax, ten years)', () => {
    const w = worldAfter(120, { national: { laws: { welfare: 'ubi_full', income_tax: 'none' } } });
    assert.ok(w.national.budget.debtRatio > DEBT_CEILING_RATIO);
    assert.ok(w.national.rating.score < 40, `${w.national.rating.score}`);
  });
  it('the three nations start with different books but none is in crisis', () => {
    const w = worldAfter(1);
    for (const m of Object.values(w)) {
      assert.ok(m.budget.deficit / m.gdpYearly < 0.05, `deficit ${m.budget.deficit / m.gdpYearly}`);
      assert.ok(m.budget.debtRatio < DEBT_SAFE_RATIO);
    }
    assert.ok(new Set(Object.values(w).map(m => Math.sign(m.budget.deficit))).size > 1, 'some run surpluses, some deficits');
  });
});

// ─── The economy moves approval (and so votes) ──────────────────────────────

import { approvalVoteMultiplier, computeApproval, economyApprovalAdjustment, type ApprovalEconomy } from '../src/api/services/statecraft.service';
import { ECONOMY_APPROVAL } from '../src/api/constants/nations';

/** Run the world for `months` and return what voters in one nation feel, plus their stats. */
function feltEconomy(code: string, months: number, changes: Record<string, Change & { stats?: Record<string, number> }> = {}) {
  const ctxOf = (n: (typeof STARTER_NATIONS)[number]): R.NationSimContext => {
    const f = founding(n);
    const c = changes[n.polStateCode] ?? {};
    return { ...f, stats: { ...f.stats, ...(c.stats ?? {}) }, laws: { ...f.laws, ...(c.laws ?? {}) }, split: c.split };
  };
  let states = STARTER_NATIONS.map(n => R.initialState(founding(n)) as R.NationSimState);
  const gdp: number[][] = STARTER_NATIONS.map(() => []);
  let last: R.NationSimMonth[] = STARTER_NATIONS.map((n, i) => R.describe(states[i], founding(n)));
  for (let m = 0; m < months; m++) {
    const ctxs = STARTER_NATIONS.map(ctxOf);
    const trade = R.computeTrade(STARTER_NATIONS.map((n, i) => ({
      code: n.polStateCode, structural: R.structuralOutput(ctxs[i], states[i].population),
      tariffs: R.tariffRates(ctxs[i].laws), foundingTariffs: R.tariffRates(R.foundingLaws(n.polStateCode)),
    })));
    last = STARTER_NATIONS.map((n, i) => R.stepMonth(states[i], { ...ctxs[i], trade: trade[n.polStateCode] }));
    last.forEach((x, i) => gdp[i].push(x.gdpYearly));
    states = last;
  }
  const i = STARTER_NATIONS.findIndex(n => n.polStateCode === code);
  const g = gdp[i];
  const back = g.length > ECONOMY_APPROVAL.growthLookbackMonths ? g[g.length - 1 - ECONOMY_APPROVAL.growthLookbackMonths] : null;
  const econ: ApprovalEconomy = { unemployment: last[i].unemployment, growth: back ? last[i].gdpYearly / back - 1 : null, debtRatio: last[i].budget.debtRatio, funded: last[i].budget.funded };
  return { econ, stats: ctxOf(STARTER_NATIONS[i]).stats };
}

describe('The economy moves approval, and so the election', () => {
  it('a brand-new world changes nobody\'s approval by more than a point, and every nation stays within 3 of 50', () => {
    for (const n of STARTER_NATIONS) {
      const { econ, stats } = feltEconomy(n.polStateCode, 0);
      assert.ok(Math.abs(economyApprovalAdjustment(econ).total) <= 1, `${n.shortName} ${economyApprovalAdjustment(econ).total}`);
      assert.ok(Math.abs(computeApproval(stats, econ) - 50) <= 3, `${n.shortName} ${computeApproval(stats, econ)}`);
    }
  });
  it('a steady economy is neutral: no government is punished for doing nothing wrong (ten years)', () => {
    for (const n of STARTER_NATIONS) {
      const { econ } = feltEconomy(n.polStateCode, 120);
      assert.ok(Math.abs(economyApprovalAdjustment(econ).total) <= 1, `${n.shortName} ${JSON.stringify(economyApprovalAdjustment(econ))}`);
    }
  });
  it('a recession costs the government far more than the stats alone, and votes at the election', () => {
    const { econ, stats } = feltEconomy('national', 24, { national: { stats: { prosperity: 30 } } });
    const withEconomy = computeApproval(stats, econ);
    const statsOnly = computeApproval(stats);
    assert.ok(statsOnly - withEconomy >= 8, `${statsOnly} -> ${withEconomy}`);
    assert.ok(approvalVoteMultiplier(withEconomy) < approvalVoteMultiplier(statsOnly) - 0.04);
  });
  it('a boom helps the government', () => {
    const { econ, stats } = feltEconomy('national', 24, { national: { stats: { prosperity: 70 } } });
    assert.ok(computeApproval(stats, econ) > computeApproval(stats));
  });
  it('one nation\'s tariffs can cost another nation\'s government at home', () => {
    const before = feltEconomy('eryndor', 24);
    const after = feltEconomy('eryndor', 24, { westmark: { laws: { tariffs: 'high' } } });
    assert.ok(computeApproval(after.stats, after.econ) < computeApproval(before.stats, before.econ) - 2);
  });
  it('spending far beyond your means costs approval once lenders refuse', () => {
    const { econ } = feltEconomy('national', 120, { national: { laws: { welfare: 'ubi_full', income_tax: 'none' } } });
    assert.ok(economyApprovalAdjustment(econ).debt <= ECONOMY_APPROVAL.debtCeilingPenalty);
  });
  it('bad news counts more than good news of the same size', () => {
    const n = ECONOMY_APPROVAL.unemploymentNorm;
    const bad = economyApprovalAdjustment({ unemployment: n + 0.02, growth: null, debtRatio: 0.5, funded: 1 }).jobs;
    const good = economyApprovalAdjustment({ unemployment: n - 0.02, growth: null, debtRatio: 0.5, funded: 1 }).jobs;
    assert.ok(-bad > good && good > 0);
  });
  it('every part and the total are capped', () => {
    const worst = economyApprovalAdjustment({ unemployment: 0.35, growth: -0.5, debtRatio: 5, funded: 0 });
    assert.ok(worst.jobs >= -ECONOMY_APPROVAL.unemploymentCap && worst.growth >= -ECONOMY_APPROVAL.growthCap && worst.debt >= -ECONOMY_APPROVAL.debtCap);
    assert.strictEqual(worst.total, -ECONOMY_APPROVAL.totalCap);
  });
  it('without a year of history there is no growth term, and with no economy at all nothing changes', () => {
    assert.strictEqual(economyApprovalAdjustment({ unemployment: 0.06, growth: null, debtRatio: 0.5, funded: 1 }).growth, 0);
    assert.strictEqual(computeApproval({}, null), computeApproval({}));
  });
});
