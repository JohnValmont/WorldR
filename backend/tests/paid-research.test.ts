import { db } from '../src/config/database';
import { AnalyticsService } from '../src/api/services/analytics.service';
import { randomUUID } from 'crypto';
import assert from 'assert';

async function runTest() {
  const country = await db('countries').where('name', 'Drennia').first();
  if (!country) throw new Error('Drennia not found');
  const worldId = country.world_instance_id;

  const company1 = await db('companies').where({ industry_id: 'manufacturing' }).first();
  if (!company1) throw new Error('No manufacturing company found to test with');
  
  // Create a mock competitor
  const company2Id = randomUUID();
  const company2Data = {
    ...company1,
    id: company2Id,
    name: 'Competitor Motors'
  };
  await db('companies').insert(company2Data);

  // Set exactly $50,000 for company1
  const prevFinances = await db('company_finances').where({ company_id: company1.id }).first();
  if (prevFinances) {
    await db('company_finances').where({ company_id: company1.id }).update({ available_cash: 50000 });
  } else {
    await db('company_finances').insert({ company_id: company1.id, available_cash: 50000, company_value: 100000 });
  }

  const model2 = randomUUID();
  const marketId = 'drennport-consumer-market';
  
  const clock = await db('world_clock').first();
  const worldOrbit = clock.current_orbit;
  const worldArc = clock.current_arc;

  try {
    // Insert competitor model
    await db('manufacturing_vehicle_models').insert([
      {
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
        created_at_world_orbit: worldOrbit,
        created_at_world_arc: worldArc,
        created_at_world_mark: 0
      }
    ]);

    // Insert sales results for target arc
    let targetArc = worldArc - 1;
    let targetOrbit = worldOrbit;
    if (targetArc === 0) {
      targetArc = 36;
      targetOrbit -= 1;
    }

    await db('manufacturing_sales_results').insert([
      {
        company_id: company2Id,
        world_instance_id: worldId,
        vehicle_model_id: model2,
        region_market_id: marketId,
        world_orbit: targetOrbit,
        world_arc: targetArc,
        units_sold: 300,
        sale_price: 15000,
        revenue: 4500000,
        market_share_estimate: 0.60,
        main_reason_code: 'Sold Out'
      }
    ]);

    // Test 1: Fail to buy Tier 2 ($100,000)
    let errorThrown = false;
    try {
      await AnalyticsService.purchaseMarketResearch(company1.id, marketId, 2);
    } catch (e: any) {
      errorThrown = true;
      assert.ok(e.message.includes('Insufficient funds'), 'Should throw insufficient funds error');
    }
    assert.ok(errorThrown, 'Expected an error when buying Tier 2');

    // Verify cash is untouched
    let finCheck = await db('company_finances').where({ company_id: company1.id }).first();
    assert.strictEqual(Number(finCheck.available_cash), 50000, 'Cash should not be deducted on failure');

    // Test 2: Succeed to buy Tier 1 ($25,000)
    const resultsTier1 = await AnalyticsService.purchaseMarketResearch(company1.id, marketId, 1);
    
    // Verify cash is exactly $25,000
    finCheck = await db('company_finances').where({ company_id: company1.id }).first();
    assert.strictEqual(Number(finCheck.available_cash), 25000, 'Exactly $25,000 should be deducted');

    // Verify data filtering for Tier 1
    const competitorData = resultsTier1.find((r: any) => r.company_name === 'Competitor Motors');
    assert.ok(competitorData, 'Competitor should be in results');
    assert.strictEqual(competitorData.sale_price, null, 'Tier 1 must nullify sale price');
    assert.strictEqual(competitorData.reliability_score, null, 'Tier 1 must nullify specs');
    assert.strictEqual(competitorData.market_share_estimate, 0.60, 'Tier 1 should expose market share');

    console.log('✅ Paid Market Research behavior tests passed.');
  } finally {
    // Cleanup
    await db('manufacturing_sales_results').whereIn('vehicle_model_id', [model2]).delete();
    await db('manufacturing_vehicle_models').whereIn('id', [model2]).delete();
    await db('companies').where({ id: company2Id }).delete();
    if (prevFinances) {
      await db('company_finances').where({ company_id: company1.id }).update({ available_cash: prevFinances.available_cash });
    }
    process.exit(0);
  }
}

runTest().catch(console.error);
