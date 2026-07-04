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
  
  // Create a second mock company just for this test by cloning company1
  const company2Id = randomUUID();
  const company2Data = {
    ...company1,
    id: company2Id,
    name: 'Competitor Motors'
  };
  await db('companies').insert(company2Data);

  const model1 = randomUUID();
  const model2 = randomUUID();
  const marketId = 'drennport-consumer-market';
  
  const clock = await db('world_clock').first();
  const worldYear = clock.current_year;
  const worldMonth = clock.current_month;

  try {
    // Insert models
    await db('manufacturing_vehicle_models').insert([
      {
        id: model1,
        company_id: company1.id,
        world_instance_id: worldId,
        name: 'Player Car',
        target_segment: 'Consumer',
        vehicle_class: 'Sedan',
        platform_type: 'Unibody',
        power_unit_type: 'ICE',
        drivetrain_type: 'FWD',
        interior_tier: 'Basic',
        safety_tier: 'Basic',
        development_status: 'Completed',
        sale_price: 20000,
        manufacturing_cost_per_unit: 12000,
        reliability_score: 50,
        performance_score: 50,
        fuel_efficiency_score: 50,
        appeal_score: 50,
        cargo_score: 50,
        status: 'active',
        created_at_world_year: worldYear,
        created_at_world_month: worldMonth,
        created_at_world_day: 0
      },
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
        created_at_world_year: worldYear,
        created_at_world_month: worldMonth,
        created_at_world_day: 0
      }
    ]);

    // Insert sales results for target month (assuming target month is currentMonth - 1)
    let targetMonth = worldMonth - 1;
    let targetYear = worldYear;
    if (targetMonth === 0) {
      targetMonth = 36;
      targetYear -= 1;
    }

    await db('manufacturing_sales_results').insert([
      {
        company_id: company1.id,
        world_instance_id: worldId,
        vehicle_model_id: model1,
        region_market_id: marketId,
        world_year: targetYear,
        world_month: targetMonth,
        units_sold: 200,
        sale_price: 20000,
        revenue: 4000000,
        market_share_estimate: 0.40,
        main_reason_code: 'Sold Out'
      },
      {
        company_id: company2Id,
        world_instance_id: worldId,
        vehicle_model_id: model2,
        region_market_id: marketId,
        world_year: targetYear,
        world_month: targetMonth,
        units_sold: 300,
        sale_price: 15000,
        revenue: 4500000,
        market_share_estimate: 0.60,
        main_reason_code: 'Sold Out'
      }
    ]);

    // Fetch Market Structure
    const structure = await AnalyticsService.getMarketStructure(country.id);

    // Verify
    assert.strictEqual(structure.month.month, targetMonth, 'Month matches target');
    assert.ok(structure.segments.length > 0, 'Should return segments');

    const segment = structure.segments.find((s: any) => s.segmentId === marketId);
    assert.ok(segment, 'Consumer market segment should exist');

    // Total units: 200 + 300 = 500
    assert.strictEqual(segment.totalUnitsSold, 500, 'Total units correctly aggregated');

    // Total revenue: 4,000,000 + 4,500,000 = 8,500,000
    assert.strictEqual(segment.totalRevenue, 8500000, 'Total revenue correctly aggregated');

    // Average price: 8,500,000 / 500 = 17,000
    assert.strictEqual(segment.averageSalePrice, 17000, 'Average sale price correctly calculated');

    // Saturation signal: 500 units / 500 units sold out = 1.0 > 0.4 -> Underserved
    assert.strictEqual(segment.saturationSignal, 'Underserved', 'Saturation signal correctly determined');

    // Security/Anonymization checks
    const stringified = JSON.stringify(segment);
    assert.ok(!stringified.includes('Competitor Motors'), 'Competitor company name must not be exposed');
    assert.ok(!stringified.includes('Competitor Car'), 'Competitor model name must not be exposed');
    assert.ok(!stringified.includes(company2Id), 'Competitor company ID must not be exposed');
    assert.ok(!stringified.includes(model2), 'Competitor model ID must not be exposed');
    assert.ok(segment.marketShareEstimate === undefined, 'Individual market shares must not be exposed');
    assert.ok(segment.models === undefined, 'Models array must not be exposed');

    console.log('✅ Market Structure behavior tests passed.');
    console.log('Aggregated Output for UI:', segment);

  } finally {
    // Cleanup
    await db('manufacturing_sales_results').whereIn('vehicle_model_id', [model1, model2]).delete();
    await db('manufacturing_vehicle_models').whereIn('id', [model1, model2]).delete();
    await db('companies').where({ id: company2Id }).delete();
    process.exit(0);
  }
}

runTest().catch(console.error);
