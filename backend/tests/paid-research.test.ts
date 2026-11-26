import * as assert from 'node:assert';
import { test } from 'node:test';
import type { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { openThrowawayDb } from './helpers/throwawayDb';

// Phase 4c paid market research: the cash check happens inside the database
// transaction. Tier 2 without enough cash is refused and charges nothing;
// Tier 1 charges exactly its price and hides the competitor's price and specs.
// It writes companies, models, sales and cash and moves the world clock, so it
// builds its own throwaway database (helpers/throwawayDb.ts) and skips when no
// local Postgres is available. src/config/* is imported only after
// DATABASE_URL points at that database.
type Analytics = typeof import('../src/api/services/analytics.service').AnalyticsService;

// Clock at the start of year 2: the last completed month is year 1, month 12
// (the service wraps month 0 to 12, so this also checks the year boundary).
const CLOCK = { current_year: 2, current_month: 1 };
const TARGET = { year: 1, month: 12 };
const START_CASH = 50000;
const TIER1_PRICE = 25000;

async function runScenario(db: Knex, AnalyticsService: Analytics) {
  const country = await db('countries').where('name', 'Drennia').first();
  if (!country) throw new Error('Drennia not found');
  const worldId = country.world_instance_id;

  const company1 = await db('companies').where({ industry_id: 'manufacturing', country_id: country.id }).first();
  if (!company1) throw new Error('No manufacturing company found to test with');

  // A competitor just for this test, cloned from company1
  const company2Id = randomUUID();
  await db('companies').insert({ ...company1, id: company2Id, name: 'Competitor Motors' });

  // The buyer starts with exactly START_CASH
  const finances = await db('company_finances').where({ company_id: company1.id }).first();
  if (finances) {
    await db('company_finances').where({ company_id: company1.id }).update({ available_cash: START_CASH });
  } else {
    await db('company_finances').insert({ company_id: company1.id, available_cash: START_CASH, company_value: 100000 });
  }

  await db('world_clock').update(CLOCK);

  const model2 = randomUUID();
  const marketId = 'drennport-consumer-market';

  await db('manufacturing_vehicle_models').insert({
    id: model2,
    company_id: company2Id,
    world_instance_id: worldId,
    name: 'Competitor Car',
    target_segment: 'Consumer',
    vehicle_class: 'Sedan',
    platform_type: 'Unibody',
    power_unit_type: 'ICE',
    drivetrain_type: 'FWD',
    interior_tier: 'Basic',
    safety_tier: 'Basic',
    development_status: 'Completed',
    sale_price: 15000,
    manufacturing_cost_per_unit: 10000,
    reliability_score: 40,
    performance_score: 40,
    fuel_efficiency_score: 60,
    appeal_score: 40,
    cargo_score: 40,
    status: 'active',
    created_at_world_year: CLOCK.current_year,
    created_at_world_month: CLOCK.current_month,
    created_at_world_day: 0,
  });

  // Competitor sales in the last completed month
  await db('manufacturing_sales_results').insert({
    company_id: company2Id,
    world_instance_id: worldId,
    vehicle_model_id: model2,
    region_market_id: marketId,
    world_year: TARGET.year,
    world_month: TARGET.month,
    units_sold: 300,
    sale_price: 15000,
    revenue: 4500000,
    market_share_estimate: 0.60,
    main_reason_code: 'Sold Out',
  });

  // Tier 2 costs more than the buyer has: refused, nothing charged
  await assert.rejects(
    AnalyticsService.purchaseMarketResearch(company1.id, marketId, 2),
    (e: any) => String(e?.message).includes('Insufficient funds'),
    'Buying Tier 2 without enough cash should throw "Insufficient funds"',
  );
  let finCheck = await db('company_finances').where({ company_id: company1.id }).first();
  assert.strictEqual(Number(finCheck.available_cash), START_CASH, 'Cash should not be deducted on failure');

  // Tier 1 succeeds and charges exactly its price
  const resultsTier1 = await AnalyticsService.purchaseMarketResearch(company1.id, marketId, 1);
  finCheck = await db('company_finances').where({ company_id: company1.id }).first();
  assert.strictEqual(Number(finCheck.available_cash), START_CASH - TIER1_PRICE, `Exactly $${TIER1_PRICE} should be deducted`);

  // Tier 1 hides price and specs, shows market share
  const competitorData: any = resultsTier1.find((r: any) => r.company_name === 'Competitor Motors');
  assert.ok(competitorData, 'Competitor should be in results');
  assert.strictEqual(competitorData.sale_price, null, 'Tier 1 must nullify sale price');
  assert.strictEqual(competitorData.reliability_score, null, 'Tier 1 must nullify specs');
  assert.strictEqual(competitorData.market_share_estimate, 0.60, 'Tier 1 should expose market share');
}

test('Paid market research checks cash in the transaction and strips Tier 1 data', async (t) => {
  const tmp = await openThrowawayDb('paid_research');
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
