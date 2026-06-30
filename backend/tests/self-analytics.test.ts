import * as assert from 'node:assert';
import { db } from '../src/config/database';
import { AnalyticsService } from '../src/api/services/analytics.service';
import { randomUUID } from 'crypto';

async function runTest() {
  const country = await db('countries').where('name', 'Drennia').first();
  if (!country) throw new Error('Drennia not found');
  const worldId = country.world_instance_id;

  const company = await db('companies').where({ industry_id: 'manufacturing' }).first();
  if (!company) throw new Error('No manufacturing company found to test with');
  const companyId = company.id;

  const modelId = randomUUID();
  const modelId2 = randomUUID();
  const marketId = 'drennport-consumer-market';
  const worldOrbit = 1;
  const worldArc = 10;
  
  // Previous arc is 9
  try {
    await db.transaction(async (trx) => {
      // Create mock vehicle models
      await trx('manufacturing_vehicle_models').insert([
        {
          id: modelId,
          company_id: companyId,
          world_instance_id: worldId,
          name: 'Analytics Test Car',
          vehicle_class: 'compact',
          target_segment: 'Budget',
          status: 'active',
          development_status: 'launched',
          platform_type: 'compact-unibody',
          power_unit_type: 'i4-economy',
          drivetrain_type: 'fwd-standard',
          interior_tier: 'basic',
          safety_tier: 'standard',
          manufacturing_cost_per_unit: 10000,
          sale_price: 15000,
          reliability_score: 50,
          performance_score: 50,
          fuel_efficiency_score: 50,
          appeal_score: 50,
          cargo_score: 50,
          created_at_world_orbit: 1,
          created_at_world_arc: 1,
          created_at_world_mark: 1,
        },
        {
          id: modelId2,
          company_id: companyId,
          world_instance_id: worldId,
          name: 'Analytics Test Car 2',
          vehicle_class: 'sedan',
          target_segment: 'Standard',
          status: 'active',
          development_status: 'launched',
          platform_type: 'sedan-unibody',
          power_unit_type: 'i4-standard',
          drivetrain_type: 'fwd-standard',
          interior_tier: 'standard',
          safety_tier: 'standard',
          manufacturing_cost_per_unit: 15000,
          sale_price: 22000,
          reliability_score: 50,
          performance_score: 50,
          fuel_efficiency_score: 50,
          appeal_score: 50,
          cargo_score: 50,
          created_at_world_orbit: 1,
          created_at_world_arc: 1,
          created_at_world_mark: 1,
        }
      ]);

      // Insert previous arc results
      await trx('manufacturing_sales_results').insert([
        {
          company_id: companyId,
          world_instance_id: worldId,
          vehicle_model_id: modelId,
          region_market_id: marketId,
          world_orbit: worldOrbit,
          world_arc: worldArc - 1, // 9
          units_sold: 100,
          sale_price: 15000,
          revenue: 1500000,
          market_share_estimate: 0.10, // 10%
          main_reason_code: 'Balanced'
        },
        {
          company_id: companyId,
          world_instance_id: worldId,
          vehicle_model_id: modelId2,
          region_market_id: marketId,
          world_orbit: worldOrbit,
          world_arc: worldArc - 1, // 9
          units_sold: 50,
          sale_price: 22000,
          revenue: 1100000,
          market_share_estimate: 0.05, // 5%
          main_reason_code: 'Balanced'
        }
      ]);

      // Insert target arc results (simulating current arc = 11, target = 10)
      await trx('manufacturing_sales_results').insert([
        {
          company_id: companyId,
          world_instance_id: worldId,
          vehicle_model_id: modelId,
          region_market_id: marketId,
          world_orbit: worldOrbit,
          world_arc: worldArc, // 10
          units_sold: 150,
          sale_price: 15000,
          revenue: 2250000,
          market_share_estimate: 0.15, // 15%, went up
          main_reason_code: 'Sold Out'
        },
        {
          company_id: companyId,
          world_instance_id: worldId,
          vehicle_model_id: modelId2,
          region_market_id: marketId,
          world_orbit: worldOrbit,
          world_arc: worldArc, // 10
          units_sold: 20,
          sale_price: 22000,
          revenue: 440000,
          market_share_estimate: 0.02, // 2%, went down
          main_reason_code: 'Market Capacity Capped (Cannibalised)'
        }
      ]);

      // Temporarily mock world_clock in the service method using a stub
      // (Since world_clock usually has 1 record, we can temporarily update it)
      await trx('world_clock').update({
        current_orbit: worldOrbit,
        current_arc: worldArc + 1 // So target arc is 10
      });
    });

    const result = await AnalyticsService.getSelfAnalytics(companyId);
    
    assert.strictEqual(result.arc.arc, worldArc, 'Target arc should be 10');
    assert.strictEqual(result.segments.length, 1, 'Should group into 1 segment (marketId)');
    
    const segment = result.segments[0];
    assert.strictEqual(segment.totalUnitsSold, 170, '150 + 20 = 170 units');
    assert.strictEqual(segment.totalRevenue, 2690000, '2250000 + 440000 = 2690000 revenue');
    assert.strictEqual(segment.models.length, 2, 'Should contain 2 models');
    
    // Sum market share: 0.15 + 0.02 = 0.17
    assert.ok(Math.abs(segment.marketShareEstimate - 0.17) < 0.001, 'Should correctly sum market share');
    
    // Previous sum market share: 0.10 + 0.05 = 0.15
    // current (0.17) vs prev (0.15): 0.17 > 0.15 + 0.01 is true, so 'up'
    assert.strictEqual(segment.trend, 'up', 'Trend must be up');
    
    // Verify advisor text logic
    const advisor = AnalyticsService.generateAdvisorText('Sold Out');
    assert.ok(advisor.includes('Demand exceeded supply'), 'Advisor text should match');

    console.log('✅ Self-Analytics aggregation and mapping tests passed.');
  } finally {
    // Cleanup
    await db('manufacturing_sales_results').where({ company_id: companyId }).delete();
    await db('manufacturing_vehicle_models').where({ company_id: companyId }).delete();
    await db.destroy();
  }
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
