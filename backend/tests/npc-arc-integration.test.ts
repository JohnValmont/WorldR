import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import { db } from '../src/config/database';
import { ManufacturingController } from '../src/api/controllers/manufacturing.controller';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

test('NPC Month Integration - Pooled Engine Refactor', async (t) => {

  const worldId = randomUUID();
  const regionId = randomUUID();
  const marketId = randomUUID();
  const countryId = randomUUID();

  const userId = randomUUID();
  const charId = randomUUID();
  const companyId = randomUUID();
  
  const npcUserId = randomUUID();
  const npcCharId = randomUUID();
  const npcCompanyId = randomUUID();

  const modelId = randomUUID();
  const npcModelId = randomUUID();

  const factoryId = randomUUID();
  const lineId = randomUUID();

  // Create mock objects
  const makeReq = (cId: string) => ({ params: { companyId: cId } } as unknown as Request);
  const makeRes = () => {
    const r: any = {};
    r.status = (c: number) => { r.code = c; return r; };
    r.json = (d: any) => { r.data = d; return r; };
    return r as Response & { data: any, code: number };
  };
  const makeNext = () => ((err?: any) => { if (err) throw err; }) as NextFunction;

  await t.test('Setup Database State', async () => {
    const hasDebtFacilities = await db.schema.hasTable('company_debt_facilities');
    if (!hasDebtFacilities) {
      await db.schema.createTable('company_debt_facilities', (table) => {
        table.uuid('id').primary();
        table.uuid('company_id');
        table.string('status');
        table.decimal('principal_amount');
        table.integer('term_months');
        table.integer('months_remaining');
        table.decimal('monthly_payment');
        table.timestamp('created_at');
        table.timestamp('updated_at');
      });
    }
    
    await db('world_instances').insert({ id: worldId, current_year: 1, current_month: 1, name: 'Test World', status: 'active', server_id: 'server1', settings: {} });
    await db('regions').insert({ id: regionId, name: 'Test Region', description: 'Test', geographic_size: 'Medium' });
    await db('manufacturing_region_markets').insert({
        region_market_id: marketId,
        region_id: regionId,
        market_name: 'Test Market',
        market_tier: 'Developed',
        population: 10000000,
        avg_household_size: 2.5,
        vehicle_ownership_rate: 0.8,
        baseline_replacement_rate: 0.05,
        first_time_buyer_rate: 0.01,
        purchase_need_intensity: 1.0,
        economic_multiplier: 1.0,
        vehicle_price_comfort_ratio: 1.0,
        average_income: 50000,
        price_sensitivity: 1.0,
        distribution_strength: 1.0,
        preference_economy: 0.5,
        preference_standard: 0.3,
        preference_premium: 0.2,
        vehicle_attribute_weights: { performance: 0.2, fuel_efficiency: 0.2, reliability: 0.2, safety: 0.2, appeal: 0.1, cargo: 0.1 }
    });
    await db('countries').insert({ id: countryId, world_instance_id: worldId, name: 'Test Country', region_id: regionId, tax_rate_corporate: 0.2, gdp_per_capita: 50000, infrastructure_rating: 80, corruption_index: 10, stability_index: 90, npc_tier: 'Standard' });
    
    // Player Character & Company
    await db('users').insert({ id: userId, email: 'test1@test.com', password_hash: '123' });
    await db('characters').insert({ id: charId, user_id: userId, world_instance_id: worldId, first_name: 'P1', last_name: 'L1', date_of_birth: '2000-01-01', location_country_id: countryId });
    await db('companies').insert({ id: companyId, world_instance_id: worldId, owner_character_id: charId, industry_id: 'manufacturing', country_id: countryId, name: 'Player Corp', status: 'active' });
    await db('company_finances').insert({ company_id: companyId, available_cash: 50000000, debt: 0, company_value: 0, last_arc_profit: 0 });
    
    // NPC Character & Company
    await db('users').insert({ id: npcUserId, email: 'npc1@test.com', password_hash: '123', is_system_account: true });
    await db('characters').insert({ id: npcCharId, user_id: npcUserId, world_instance_id: worldId, first_name: 'NPC1', last_name: 'L1', date_of_birth: '2000-01-01', location_country_id: countryId });
    await db('companies').insert({ id: npcCompanyId, world_instance_id: worldId, owner_character_id: npcCharId, industry_id: 'manufacturing', country_id: countryId, name: 'NPC Corp', status: 'active', is_npc: true, npc_personality: 'balanced' });
    await db('company_finances').insert({ company_id: npcCompanyId, available_cash: 50000000, debt: 0, company_value: 0, last_arc_profit: 0 });
    await db('manufacturing_npc_state').insert({ company_id: npcCompanyId });

    // Player Model, Factory, Line, Alloc, Staff
    await db('manufacturing_vehicle_models').insert({
        id: modelId, company_id: companyId, world_instance_id: worldId,
        model_name: 'P-Car', target_segment: 'standard', vehicle_class: 'Sedan', platform_type: 'Sedan', power_unit_type: 'ICE', drivetrain_type: 'FWD',
        sale_price: 25000, manufacturing_cost_per_unit: 15000, design_cost: 1000000, development_time_arcs: 1, created_at_world_month: 1,
        reliability_score: 50, performance_score: 50, fuel_efficiency_score: 50, safety_score: 50, appeal_score: 50, cargo_score: 50
    });
    await db('manufacturing_factories').insert({
        id: factoryId, company_id: companyId, world_instance_id: worldId, country_id: countryId, factory_name: 'F1', status: 'active',
        capacity_per_month: 10000, lease_cost_per_month: 50000, maintenance_cost_per_month: 10000, quality_score: 80, efficiency_score: 80
    });
    await db('manufacturing_production_lines').insert({
        id: lineId, factory_id: factoryId, company_id: companyId, assigned_vehicle_model_id: modelId, line_name: 'L1',
        target_units_per_month: 5000, operating_cost_per_month: 10000, status: 'active', flexibility_score: 50, automation_level: 50
    });
    await db('manufacturing_market_allocations').insert({
        company_id: companyId, vehicle_model_id: modelId, region_market_id: marketId, units_allocated: 5000, marketing_tier: 'regional', world_instance_id: worldId
    });
    await db('company_staff').insert({
        company_id: companyId, role: 'production-worker', quantity: 1000, wage_per_month: 2000, morale: 80, skill_level: 50
    });
    await db('manufacturing_brand_awareness').insert({ company_id: companyId, region_market_id: marketId, awareness_score: 50, trust_score: 50 });
  });

  let playerTestAUnitsSold = 0;
  let playerTestASalePrice = 0;

  await t.test('TEST A: Single-company parity (pooled engine reduces to old single-company case)', async () => {
    // Check initial cash
    const finA = await db('company_finances').where({ company_id: companyId }).first();
    const startCash = Number(finA.available_cash);

    // Run month (World Month 1, Year 1 is default)
    const res = makeRes();
    await ManufacturingController.processManufacturingArc(makeReq(companyId), res, makeNext());

    const resultData = res.data;
    assert.strictEqual(res.code, 200, 'Month should process successfully');
    
    // Validate output
    const finB = await db('company_finances').where({ company_id: companyId }).first();
    const endCash = Number(finB.available_cash);

    const sr = await db('manufacturing_sales_results').where({ company_id: companyId, world_month: 1 }).first();
    assert.ok(sr, 'Sales result must exist');

    const pLine = await db('manufacturing_production_lines').where({ id: lineId }).first();
    const unitsProduced = 5000;
    
    playerTestAUnitsSold = Number(sr.units_sold);
    playerTestASalePrice = Number(sr.sale_price);
    const revenue = Number(sr.revenue);
    assert.strictEqual(revenue, playerTestAUnitsSold * playerTestASalePrice, 'Revenue must match units * price');
    
    // Recompute costs exactly based on constants and game rules
    const mcost = await db('manufacturing_vehicle_models').where({ id: modelId }).first();
    const productionCost = unitsProduced * Number(mcost.manufacturing_cost_per_unit);
    
    const staff = await db('company_staff').where({ company_id: companyId, role: 'production-worker' }).first();
    const wages = Number(staff.quantity) * Number(staff.wage_per_month);
    
    const leaseCost = 50000;
    const maintenanceCost = 10000;
    
    // Marketing cost for 'regional' tier is 12000
    const marketingCost = 12000;
    const storageCost = 0; // sold out
    const warrantyReserve = 0; // assuming zero defects for simplicity, or we can just fetch it from report
    
    const report = resultData.report;
    assert.strictEqual(report.productionCosts, productionCost, 'Production cost must match');
    assert.strictEqual(report.staffWages, wages, 'Wages must match');
    assert.strictEqual(report.marketingCosts, marketingCost, 'Marketing cost must match (deducted exactly once)');

    const expectedNetProfit = revenue - productionCost - wages - leaseCost - maintenanceCost - marketingCost - storageCost - report.warrantyReserveCost;
    
    const netProfit = resultData.netProfit;
    assert.strictEqual(expectedNetProfit, netProfit, 'Calculated net profit must exactly match the result net profit');

    const diff = endCash - startCash;
    assert.strictEqual(diff, netProfit, 'Ending cash diff must exactly match netProfit');
  });

  await t.test('TEST B: Competition is real (adding NPC cannibalises demand)', async () => {
    // Advance world month
    await db('world_instances').where({ id: worldId }).update({ current_month: 2 });
    
    // Reset player cash just to be clean
    await db('company_finances').where({ company_id: companyId }).update({ available_cash: 50000000 });

    // Seed NPC competitor
    await db('manufacturing_vehicle_models').insert({
        id: npcModelId, company_id: npcCompanyId, world_instance_id: worldId,
        model_name: 'NPC-Car', target_segment: 'standard', vehicle_class: 'Sedan', platform_type: 'Sedan', power_unit_type: 'ICE', drivetrain_type: 'FWD',
        sale_price: 25000, manufacturing_cost_per_unit: 15000, design_cost: 1000000, development_time_arcs: 1, created_at_world_month: 1,
        reliability_score: 50, performance_score: 50, fuel_efficiency_score: 50, safety_score: 50, appeal_score: 50, cargo_score: 50
    });
    const npcFactoryId = randomUUID();
    const npcLineId = randomUUID();
    await db('manufacturing_factories').insert({
        id: npcFactoryId, company_id: npcCompanyId, world_instance_id: worldId, country_id: countryId, factory_name: 'N-F1', status: 'active',
        capacity_per_month: 10000, lease_cost_per_month: 50000, maintenance_cost_per_month: 10000, quality_score: 80, efficiency_score: 80
    });
    await db('manufacturing_production_lines').insert({
        id: npcLineId, factory_id: npcFactoryId, company_id: npcCompanyId, assigned_vehicle_model_id: npcModelId, line_name: 'N-L1',
        target_units_per_month: 5000, operating_cost_per_month: 10000, status: 'active', flexibility_score: 50, automation_level: 50
    });
    await db('manufacturing_market_allocations').insert({
        company_id: npcCompanyId, vehicle_model_id: npcModelId, region_market_id: marketId, units_allocated: 5000, marketing_tier: 'regional', world_instance_id: worldId
    });
    await db('company_staff').insert({
        company_id: npcCompanyId, role: 'production-worker', quantity: 1000, wage_per_month: 2000, morale: 80, skill_level: 50
    });
    await db('manufacturing_brand_awareness').insert({ company_id: npcCompanyId, region_market_id: marketId, awareness_score: 50, trust_score: 50 });

    // Ensure they both have enough allocation for month 2 (it doesn't auto-delete, but let's check)
    // Run month for player (since both are in the same country, the pool handles both)
    const res = makeRes();
    await ManufacturingController.processManufacturingArc(makeReq(companyId), res, makeNext());
    
    assert.strictEqual(res.code, 200, 'Month 2 should process successfully');

    // Fetch new results
    const srPlayer = await db('manufacturing_sales_results').where({ company_id: companyId, world_month: 2 }).first();
    const srNpc = await db('manufacturing_sales_results').where({ company_id: npcCompanyId, world_month: 2 }).first();
    
    assert.ok(srPlayer, 'Player sales result for Month 2 must exist');
    assert.ok(srNpc, 'NPC sales result for Month 2 must exist');

    const playerTestBUnitsSold = Number(srPlayer.units_sold);
    const npcTestBUnitsSold = Number(srNpc.units_sold);

    console.log(`TEST A (Alone) Units Sold: ${playerTestAUnitsSold}`);
    console.log(`TEST B (Competition) Player Units Sold: ${playerTestBUnitsSold}, NPC Units Sold: ${npcTestBUnitsSold}`);
    console.log(`Reason Code: ${srPlayer.reason_code}`);

    // Ratio assert
    const ratio = playerTestBUnitsSold / playerTestAUnitsSold;
    assert.ok(ratio < 1.0, `Cannibalisation failed! Player units sold should drop. Ratio: ${ratio}`);

  });
  
  // Teardown
  after(async () => {
    // Delete world will cascade
    await db('world_instances').where({ id: worldId }).del();
    // Users are not cascaded by world_instance_id, clean them manually
    await db('users').whereIn('id', [userId, npcUserId]).del();
    await db.destroy();
  });
});
