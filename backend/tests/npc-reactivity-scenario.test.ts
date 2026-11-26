/**
 * NPC reactivity (brain rule B1): when a rival floods the incumbent's market
 * with a cheaper car and takes its market share, the incumbent (Valuecorp)
 * cuts its price.
 *
 * Runs five real business months through processManufacturingArc on a
 * THROWAWAY local database (tests/helpers/throwawayDb.ts): it is created fresh
 * from migrations + seeds and dropped afterwards, so the rows this scenario
 * rewrites (Valuecorp's cash, prices, stock, world_clock, a region market) never
 * touch a database anyone uses. Without a local Postgres it is SKIPPED.
 *
 * What happens in the scenario (fresh world, Nov 2026 rules):
 *   months 1-3  a dummy player sells a Budget car at $100,000 in Valuecorp's
 *               market. In month 3 Valuecorp's espionage rule copies that car
 *               (the player sold 100+ Budget cars) and the copy REPLACES its own
 *               car: the old "Valuecorp Standard" is discontinued and never
 *               repriced again. The copy's price is pulled down to the B2 cap
 *               (1.6 x build cost) and it sells out.
 *   months 4-5  the dummy drops to $10,000 with 300,000 cars and full awareness.
 *               Valuecorp's share collapses, so B1 cuts its price.
 * We therefore follow Valuecorp's ACTIVE car by id and check it is the same car
 * before and after; the old test read an arbitrary Valuecorp row (often the
 * frozen discontinued one) and reported "Ratio: 1.00".
 */
import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import type { Request, Response, NextFunction } from 'express';
import { withThrowawayDb } from './helpers/throwawayDb';
import { PRICE_STEP } from '../src/api/constants/npc';

const makeReq = (cId: string) => ({ params: { companyId: cId } } as unknown as Request);
const makeRes = () => {
  const r: any = {};
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (d: any) => { r.data = d; return r; };
  return r as Response & { data: any; code: number };
};
const makeNext = () => ((err?: any) => { if (err) throw err; }) as NextFunction;

async function scenario(db: Knex) {
  // Imported only now: the controller pulls in src/config/database, which must
  // open its pool against the throwaway database, not the original URL.
  const { ManufacturingController }: typeof import('../src/api/controllers/manufacturing.controller') = require('../src/api/controllers/manufacturing.controller');

  const runMonth = async (i: number, playerCompanyId: string) => {
    const year = Math.floor((i - 1) / 8) + 1;
    const month = ((i - 1) % 8) + 1;
    await db('world_clock').update({ current_year: year, current_month: month });
    await db('manufacturing_arc_reports').where({ world_year: year, world_month: month }).del();
    await db('manufacturing_sales_results').where({ world_year: year, world_month: month }).del();
    await db('manufacturing_model_snapshots').where({ world_year: year, world_month: month }).del();
    const res = makeRes();
    await ManufacturingController.processManufacturingArc(makeReq(playerCompanyId), res, makeNext());
    if (res.code >= 400) throw new Error(`Month ${i} failed: ${JSON.stringify(res.data)}`);
    return { year, month };
  };

  const country = await db('countries').where('name', 'Drennia').first();
  assert.ok(country, 'Drennia not found in the fresh database');
  const worldId = country.world_instance_id;

  const market = await db('manufacturing_region_markets').where('id', 'drennport-consumer-market').first();
  assert.ok(market, 'drennport-consumer-market not found');

  const userId = Date.now();
  const charId = randomUUID();
  const playerCompanyId = randomUUID();
  const modelId = randomUUID();
  const factoryId = randomUUID();
  const lineId = randomUUID();

  const clockRow = await db('world_clock').first();
  if (!clockRow) await db('world_clock').insert({ current_year: 1, current_month: 1, current_day: 1, status: 'running' });

  await db('users').insert({ id: userId, email: `test_${Date.now()}@test.com`, password_hash: '123' });
  await db('characters').insert({ id: charId, user_id: userId, world_instance_id: worldId, name: 'Dummy Player', motherland_country_id: country.id, age: 26, created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 });
  await db('companies').insert({ id: playerCompanyId, world_instance_id: worldId, owner_character_id: charId, industry_id: 'manufacturing', country_id: country.id, headquarters_state_id: 'drennia-drennport', legal_structure_id: 'private-company', currency_id: country.currency_id, name: 'Player Corp 2 ' + Date.now(), status: 'active', created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 });
  await db('company_finances').insert({ company_id: playerCompanyId, currency_id: country.currency_id, available_cash: 50000000, debt: 0, company_value: 0, last_arc_profit: 0 });

  // Valuecorp starting point
  const valuecorp = await db('companies').where({ name: 'Valuecorp', world_instance_id: worldId }).first();
  assert.ok(valuecorp, 'Valuecorp not found');
  await db('company_finances').where('company_id', valuecorp.id).update({ available_cash: 1500000 });
  await db('manufacturing_vehicle_models').where('company_id', valuecorp.id).update({ sale_price: 14500, target_segment: 'Budget' });

  const comps = ['comp_engine', 'comp_transmission', 'comp_tyres', 'comp_steel', 'comp_glass', 'comp_electronics'];
  for (const c of comps) {
    await db('manufacturing_component_inventory').insert({ company_id: playerCompanyId, component_id: c, units_in_stock: 9999999, world_instance_id: worldId });
  }

  // High-priced dummy player first; it becomes the cheap super-competitor in month 4.
  await db('manufacturing_vehicle_models').insert({
    id: modelId, company_id: playerCompanyId, world_instance_id: worldId, name: 'Player Box', vehicle_class: 'Compact Car',
    platform_type: 'compact_chassis_a', power_unit_type: 'ice_inline_4', drivetrain_type: 'fwd',
    interior_tier: 'standard', safety_tier: 'standard', production_quality: 'standard',
    manufacturing_cost_per_unit: 10000, reliability_score: 95, performance_score: 95, fuel_efficiency_score: 95, appeal_score: 95, cargo_score: 95, safety_score: 95,
    target_segment: 'Budget', sale_price: 100000, development_status: 'launched', dev_stage: 'ready_to_launch', status: 'active',
    created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1,
  });
  await db('manufacturing_factories').insert({ id: factoryId, company_id: playerCompanyId, world_instance_id: worldId, country_id: country.id, state_id: 'drennia-drennport', factory_type_id: 'medium-plant', name: 'Player Factory', capacity_per_month: 500000, lease_cost_per_month: 10000, maintenance_cost_per_month: 2000, condition: 100, status: 'active', created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 });
  await db('manufacturing_production_lines').insert({ id: lineId, factory_id: factoryId, company_id: playerCompanyId, world_instance_id: worldId, assigned_vehicle_model_id: modelId, target_units_per_month: 300000, status: 'active' });

  const valAlloc = await db('manufacturing_market_allocations').where({ company_id: valuecorp.id }).first('region_market_id');
  const targetRegionId: string = valAlloc ? valAlloc.region_market_id : market.id;

  await db('manufacturing_market_allocations').insert({ company_id: playerCompanyId, vehicle_model_id: modelId, world_instance_id: worldId, region_market_id: targetRegionId, units_allocated: 300000, marketing_tier: 'national' });
  await db('company_staff').insert([
    { company_id: playerCompanyId, role: 'factory-worker', quantity: 2000000 },
    { company_id: playerCompanyId, role: 'production-supervisor', quantity: 10000 },
    { company_id: playerCompanyId, role: 'sales-manager', quantity: 10000 },
  ]);

  // Valuecorp: 10,000 cars in stock allocated to the target market.
  const valLine0 = await db('manufacturing_production_lines').where('company_id', valuecorp.id).first();
  if (valLine0) {
    const targetAlloc = await db('manufacturing_market_allocations').where({ company_id: valuecorp.id, region_market_id: targetRegionId }).first();
    if (targetAlloc) {
      await db('manufacturing_market_allocations').where({ id: targetAlloc.id }).update({ units_allocated: 10000 });
    } else {
      await db('manufacturing_market_allocations').insert({
        world_instance_id: worldId, company_id: valuecorp.id, vehicle_model_id: valLine0.assigned_vehicle_model_id,
        region_market_id: targetRegionId, marketing_tier: 'none', units_allocated: 10000,
      });
    }
    const existingInv = await db('manufacturing_inventory').where({ company_id: valuecorp.id, vehicle_model_id: valLine0.assigned_vehicle_model_id }).first();
    if (existingInv) {
      await db('manufacturing_inventory').where({ id: existingInv.id }).update({ units_in_stock: 10000 });
    } else {
      await db('manufacturing_inventory').insert({
        world_instance_id: worldId, company_id: valuecorp.id, vehicle_model_id: valLine0.assigned_vehicle_model_id,
        units_in_stock: 10000, inventory_value: 0, storage_cost_per_month: 0,
      });
    }
  }

  // ── Months 1-3: incumbent settles in ──
  for (let i = 1; i <= 3; i++) await runMonth(i, playerCompanyId);

  // Valuecorp's car on sale now. It must be exactly one active, launched model
  // (espionage may have swapped its original for a copy in month 3).
  const activeModels = await db('manufacturing_vehicle_models')
    .where({ company_id: valuecorp.id, status: 'active', development_status: 'launched' })
    .select('id', 'name', 'sale_price', 'manufacturing_cost_per_unit');
  assert.equal(activeModels.length, 1, `expected Valuecorp to sell one car, found ${activeModels.length}`);
  const incumbent = activeModels[0];
  const priceBefore = Number(incumbent.sale_price);
  console.log(`Incumbent ${incumbent.name} price before the undercut: ${priceBefore} (build cost ${incumbent.manufacturing_cost_per_unit})`);

  // ── Inject the competitor: well below Valuecorp's price ──
  await db('manufacturing_vehicle_models').where({ id: modelId }).update({ sale_price: 10000, target_segment: 'Budget' });
  await db('manufacturing_production_lines').where({ id: lineId }).update({ target_units_per_month: 300000 });
  await db('manufacturing_market_allocations').where({ company_id: playerCompanyId, vehicle_model_id: modelId }).update({ units_allocated: 300000, marketing_tier: 'national' });

  // Perfect awareness and reputation, so the dummy absorbs the most buyer interest.
  const existingBrand = await db('manufacturing_brand_awareness').where({ company_id: playerCompanyId, region_market_id: targetRegionId }).first();
  if (existingBrand) {
    await db('manufacturing_brand_awareness').where({ id: existingBrand.id }).update({ awareness: 100, reputation: 100 });
  } else {
    await db('manufacturing_brand_awareness').insert({ company_id: playerCompanyId, region_market_id: targetRegionId, awareness: 100, reputation: 100 });
  }

  const valLine = await db('manufacturing_production_lines').where('company_id', valuecorp.id).first();
  if (valLine) await db('manufacturing_production_lines').where('id', valLine.id).update({ target_units_per_month: 100 });

  // Realistic Drennia market size (about 2M people).
  await db('manufacturing_region_markets').where({ id: targetRegionId }).update({
    baseline_replacement_rate: 0.05,
    first_time_buyer_rate: 0.05,
    population: 2100000,
  });

  // ── Months 4-5: the undercut ──
  let finalYear = 1;
  for (let i = 4; i <= 5; i++) finalYear = (await runMonth(i, playerCompanyId)).year;

  const after = await db('manufacturing_vehicle_models').where({ id: incumbent.id }).first('sale_price', 'status');
  assert.equal(after.status, 'active', 'Valuecorp replaced its car during the undercut; the price comparison would not be like for like');
  const priceAfter = Number(after.sale_price);

  const valSales = await db('manufacturing_sales_results')
    .where({ company_id: valuecorp.id, world_year: finalYear })
    .whereIn('world_month', [3, 4, 5])
    .orderBy('world_month')
    .select('world_month', 'region_market_id', 'units_sold', 'sale_price', 'market_share_estimate', 'main_reason_code');
  console.log('Valuecorp sales, months 3-5:', valSales);
  const dummySales = await db('manufacturing_sales_results')
    .where({ company_id: playerCompanyId, world_year: finalYear })
    .whereIn('world_month', [4, 5])
    .orderBy('world_month')
    .select('world_month', 'units_sold', 'market_share_estimate', 'main_reason_code');
  console.log('Dummy sales, months 4-5:', dummySales);

  // The competitor really did take the market (otherwise B1 has nothing to react to).
  assert.ok(dummySales.length > 0 && dummySales.every(s => Number(s.units_sold) > 0), 'the dummy competitor sold nothing in months 4-5');

  const ratio = priceAfter / priceBefore;
  console.log(`Incumbent price after the undercut: ${priceAfter}  (ratio ${ratio.toFixed(3)})`);
  // B1 cuts by PRICE_STEP (or 2.5x that in a panic); either way at least one step.
  assert.ok(ratio <= 1 - PRICE_STEP + 1e-3, `Incumbent failed to cut price by at least one step (${PRICE_STEP * 100}%). Ratio: ${ratio.toFixed(3)}`);
}

test('NPC reactivity: an undercut incumbent cuts its price (B1)', { timeout: 300_000 }, async (t) => {
  await withThrowawayDb(t, ({ db }) => scenario(db));
});
