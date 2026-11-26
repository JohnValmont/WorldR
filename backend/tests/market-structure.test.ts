import * as assert from 'node:assert';
import { test } from 'node:test';
import type { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { openThrowawayDb } from './helpers/throwawayDb';

// Phase 4b market structure: one market's totals, average price, saturation and
// each company's share; never a competitor's model, ids or prices.
// It writes companies, models and sales and moves the world clock, so it builds
// its own throwaway database (helpers/throwawayDb.ts) and skips when no local
// Postgres is available. src/config/* is imported only after DATABASE_URL
// points at that database.
type Analytics = typeof import('../src/api/services/analytics.service').AnalyticsService;

// Clock at the start of year 2: the last completed month is year 1, month 12
// (the service wraps month 0 to 12, so this also checks the year boundary).
const CLOCK = { current_year: 2, current_month: 1 };
const TARGET = { year: 1, month: 12 };

async function runScenario(db: Knex, AnalyticsService: Analytics) {
  const country = await db('countries').where('name', 'Drennia').first();
  if (!country) throw new Error('Drennia not found');
  const worldId = country.world_instance_id;

  const company1 = await db('companies').where({ industry_id: 'manufacturing', country_id: country.id }).first();
  if (!company1) throw new Error('No manufacturing company found to test with');

  // A second company just for this test, cloned from company1
  const company2Id = randomUUID();
  await db('companies').insert({ ...company1, id: company2Id, name: 'Competitor Motors' });

  await db('world_clock').update(CLOCK);

  const model1 = randomUUID();
  const model2 = randomUUID();
  const marketId = 'drennport-consumer-market';
  const baseModel = {
    world_instance_id: worldId,
    target_segment: 'Consumer',
    vehicle_class: 'Sedan',
    platform_type: 'Unibody',
    power_unit_type: 'ICE',
    drivetrain_type: 'FWD',
    interior_tier: 'Basic',
    safety_tier: 'Basic',
    development_status: 'Completed',
    status: 'active',
    created_at_world_year: CLOCK.current_year,
    created_at_world_month: CLOCK.current_month,
    created_at_world_day: 0,
  };

  await db('manufacturing_vehicle_models').insert([
    {
      ...baseModel, id: model1, company_id: company1.id, name: 'Player Car',
      sale_price: 20000, manufacturing_cost_per_unit: 12000,
      reliability_score: 50, performance_score: 50, fuel_efficiency_score: 50, appeal_score: 50, cargo_score: 50,
    },
    {
      ...baseModel, id: model2, company_id: company2Id, name: 'Competitor Car',
      sale_price: 15000, manufacturing_cost_per_unit: 10000,
      reliability_score: 40, performance_score: 40, fuel_efficiency_score: 60, appeal_score: 40, cargo_score: 40,
    },
  ]);

  // Sales in the last completed month
  await db('manufacturing_sales_results').insert([
    {
      company_id: company1.id, world_instance_id: worldId, vehicle_model_id: model1, region_market_id: marketId,
      world_year: TARGET.year, world_month: TARGET.month,
      units_sold: 200, sale_price: 20000, revenue: 4000000, market_share_estimate: 0.40, main_reason_code: 'Sold Out',
    },
    {
      company_id: company2Id, world_instance_id: worldId, vehicle_model_id: model2, region_market_id: marketId,
      world_year: TARGET.year, world_month: TARGET.month,
      units_sold: 300, sale_price: 15000, revenue: 4500000, market_share_estimate: 0.60, main_reason_code: 'Sold Out',
    },
  ]);

  const structure = await AnalyticsService.getMarketStructure(country.id);

  assert.strictEqual(structure.month.month, TARGET.month, 'Month matches the last completed month');
  assert.ok(structure.segments.length > 0, 'Should return segments');

  const segment: any = structure.segments.find((s: any) => s.segmentId === marketId);
  assert.ok(segment, 'Consumer market segment should exist');

  // Totals: 200 + 300 units, 4,000,000 + 4,500,000 revenue, 8,500,000 / 500 average
  assert.strictEqual(segment.totalUnitsSold, 500, 'Total units correctly aggregated');
  assert.strictEqual(segment.totalRevenue, 8500000, 'Total revenue correctly aggregated');
  assert.strictEqual(segment.averageSalePrice, 17000, 'Average sale price correctly calculated');

  // Every unit sold was a sold-out sale -> Underserved
  assert.strictEqual(segment.saturationSignal, 'Underserved', 'Saturation signal correctly determined');

  // Company share of the market IS shown on purpose: the Manufacturing Desk's
  // "Regional Market Share" chart is drawn from segment.companies (name + share).
  const shares = new Map<string, number>(segment.companies.map((c: any) => [c.companyName, Number(c.marketShare)]));
  assert.strictEqual(segment.companies.length, 2, 'One entry per company that sold here');
  assert.ok(Math.abs((shares.get('Competitor Motors') ?? 0) - 60) < 1e-9, 'Competitor share = 300 / 500 units');
  assert.ok(Math.abs((shares.get(company1.name) ?? 0) - 40) < 1e-9, 'Own share = 200 / 500 units');

  // Everything else about a competitor stays hidden: which car, its ids, its price.
  const stringified = JSON.stringify(segment);
  assert.ok(!stringified.includes('Competitor Car'), 'Competitor model name must not be exposed');
  assert.ok(!stringified.includes(company2Id), 'Competitor company ID must not be exposed');
  assert.ok(!stringified.includes(model2), 'Competitor model ID must not be exposed');
  assert.ok(!stringified.includes('15000'), 'Competitor sale price must not be exposed');
  assert.ok(segment.marketShareEstimate === undefined, 'Per-sale market share estimates must not be exposed');
  assert.ok(segment.models === undefined, 'Models array must not be exposed');
}

test('Market structure: market totals and company shares, never a competitor\'s model, ids or price', async (t) => {
  const tmp = await openThrowawayDb('market_structure');
  if ('skip' in tmp) { t.skip(tmp.skip); return; }
  process.env.DATABASE_URL = tmp.url;
  const { db, runMigrationsAndSeeds } = await import('../src/config/database');
  try {
    const { AnalyticsService } = await import('../src/api/services/analytics.service');
    await runMigrationsAndSeeds();
    await runScenario(db, AnalyticsService);
  } finally {
    await db.destroy();
    await tmp.drop();
  }
});
