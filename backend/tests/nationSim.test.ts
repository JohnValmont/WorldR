/**
 * Nations simulation (docs/NATIONS_SIMULATION.md, layers 1 and 2): people, jobs,
 * sectors, buildings and the world rating. Pure rules only, ratio-based.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as R from '../src/api/services/nationSim.rules';
import {
  GDP_REFERENCE_YEARLY, GDP_SIZE_PER_DOUBLING, LAW_JOB_EFFECTS, MAX_POPULATION_CHANGE, NATION_ECONOMIES, PILLAR_WEIGHTS,
  RATING_BALANCE_TOLERANCE, RATING_TIERS, SECTORS, UNEMPLOYMENT_MAX, UNEMPLOYMENT_MIN,
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
  it('protection trades shop jobs for factory jobs', () => {
    const p = after(24, { laws: { tariffs: 'high' } });
    assert.ok(p.jobs.manufacturing > normal.jobs.manufacturing);
    assert.ok(p.jobs.retail < normal.jobs.retail);
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
