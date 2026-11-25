/**
 * Company goals (services/businessGoals.rules.ts, constants/businessGoals.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BUSINESS_GOALS, NEXT_GOALS_SHOWN } from '../src/api/constants/businessGoals';
import { businessGoals, goalView, profitStreak, type BusinessGoalFacts } from '../src/api/services/businessGoals.rules';

const zero = Object.fromEntries(BUSINESS_GOALS.map(g => [g.key, 0])) as BusinessGoalFacts;
const spec = (k: string) => BUSINESS_GOALS.find(g => g.key === k)!;

describe('Company goals', () => {
  it('every goal has ascending tiers, so each tier is harder than the last', () => {
    for (const g of BUSINESS_GOALS) {
      assert.ok(g.tiers.length >= 1, g.key);
      for (let i = 1; i < g.tiers.length; i++) assert.ok(g.tiers[i] > g.tiers[i - 1], `${g.key} tier ${i}`);
    }
  });

  it('a brand-new company has earned nothing and is shown a few next goals', () => {
    const v = businessGoals(zero);
    assert.strictEqual(v.earned, 0);
    assert.strictEqual(v.total, BUSINESS_GOALS.reduce((s, g) => s + g.tiers.length, 0));
    assert.strictEqual(v.next.length, NEXT_GOALS_SHOWN);
  });

  it('reaching a tier raises the level and moves the target to the next tier', () => {
    const g = spec('cars_sold');
    const v = goalView(g, g.tiers[0]);
    assert.strictEqual(v.level, 1);
    assert.strictEqual(v.target, g.tiers[1]);
    assert.strictEqual(v.progress, 0);
  });

  it('progress is the share of the way from the last tier to the next', () => {
    const g = spec('cars_sold');
    const half = g.tiers[0] + (g.tiers[1] - g.tiers[0]) / 2;
    assert.ok(Math.abs(goalView(g, half).progress - 0.5) < 1e-9);
  });

  it('a maxed goal has no target and is never suggested as next', () => {
    const g = spec('own_factory');
    const v = goalView(g, 1);
    assert.strictEqual(v.maxed, true);
    assert.strictEqual(v.target, null);
    assert.ok(!businessGoals({ ...zero, own_factory: 1 }).next.includes('own_factory'));
  });

  it('the goals suggested next are the ones closest to their next tier', () => {
    const cars = spec('cars_sold');
    const v = businessGoals({ ...zero, cars_sold: cars.tiers[0] * 0.9 });
    assert.strictEqual(v.next[0], 'cars_sold');
  });

  it('bad input (negative, NaN) counts as zero', () => {
    assert.strictEqual(goalView(spec('company_value'), -5).value, 0);
    assert.strictEqual(goalView(spec('company_value'), NaN).value, 0);
  });

  it('the profit streak counts back from the latest month and stops at the first loss', () => {
    assert.strictEqual(profitStreak([10, 5, -1, 20]), 2);
    assert.strictEqual(profitStreak([-1, 5, 5]), 0);
    assert.strictEqual(profitStreak([]), 0);
    assert.strictEqual(profitStreak([0, 5]), 0, 'break-even is not a profit');
  });
});
