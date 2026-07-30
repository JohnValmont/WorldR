const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

// Just using a mocked version of the logic to see interest calculation
client.connect().then(async () => {
  const companyId = 'd84d37c9-4449-4d1c-a237-33ab7b3e7fba'; 
  
  const joinedAllocations = await client.query(`
    SELECT a.*, 
           m.name as model_name, m.vehicle_class, m.target_segment, m.development_status, m.sale_price,
           m.manufacturing_cost_per_unit, m.reliability_score, m.performance_score, m.fuel_efficiency_score,
           m.appeal_score, m.cargo_score, m.safety_score,
           rm.population, rm.state_id as market_state_id, rm.average_income, rm.economic_multiplier,
           rm.preference_compact, rm.preference_sedan, rm.preference_utility_van, rm.competition_level,
           rm.market_tier, rm.distribution_strength, rm.avg_household_size, rm.vehicle_ownership_rate,
           rm.baseline_replacement_rate, rm.first_time_buyer_rate, rm.purchase_need_intensity,
           rm.vehicle_price_comfort_ratio, rm.price_sensitivity, rm.preference_economy,
           rm.preference_standard, rm.preference_premium, rm.vehicle_attribute_weights,
           m.launched_year, m.launched_month
    FROM manufacturing_market_allocations a
    JOIN manufacturing_vehicle_models m ON a.vehicle_model_id = m.id
    JOIN manufacturing_region_markets rm ON a.region_market_id = rm.id
    WHERE a.company_id = $1 AND m.development_status IN ('launched', 'discontinued')
  `, [companyId]);

  const MARKET_SEGMENTS = {
      'economy-commuter': { id: 'economy-commuter', populationShare: 0.40, priceCeiling: 18000, priceSensitivity: 1.5, targetFitBonus: 1.4, minAppeal: 0, scoreWeights: { reliability: 0.4, fuel_efficiency: 0.35, performance: 0.05, safety: 0.1, appeal: 0.05, cargo_utility: 0.05 } },
      'family-standard': { id: 'family-standard', populationShare: 0.35, priceCeiling: 32000, priceSensitivity: 1.0, targetFitBonus: 1.3, minAppeal: 0, scoreWeights: { reliability: 0.25, fuel_efficiency: 0.15, performance: 0.1, safety: 0.3, appeal: 0.1, cargo_utility: 0.1 } },
      'premium-luxury': { id: 'premium-luxury', populationShare: 0.15, priceCeiling: 75000, priceSensitivity: 0.4, targetFitBonus: 1.5, minAppeal: 0.6, scoreWeights: { reliability: 0.15, fuel_efficiency: 0.05, performance: 0.3, safety: 0.1, appeal: 0.35, cargo_utility: 0.05 } },
      'commercial-utility': { id: 'commercial-utility', populationShare: 0.10, priceCeiling: 45000, priceSensitivity: 0.8, targetFitBonus: 1.4, minAppeal: 0, scoreWeights: { reliability: 0.4, fuel_efficiency: 0.2, performance: 0.05, safety: 0.05, appeal: 0.0, cargo_utility: 0.3 } }
  };
  
  const allocs = joinedAllocations.rows;
  const companySegmentCount = {};
  for (const alloc of allocs) {
     const seg = (alloc.target_segment || 'unknown').toLowerCase();
     const key = \`\${alloc.company_id}_\${seg}\`;
     companySegmentCount[key] = (companySegmentCount[key] || 0) + 1;
  }
  
  console.log("Cannibalization Counts:");
  console.log(companySegmentCount);
  
  client.end();
});
