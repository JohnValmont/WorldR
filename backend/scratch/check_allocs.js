const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(async () => {
  const companyId = 'd84d37c9-4449-4d1c-a237-33ab7b3e7fba'; // Aldrich Automobiles
  
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

  console.log(`Found ${joinedAllocations.rows.length} allocations`);

  // Just list the raw units_allocated for Sovereign-P1
  for (const row of joinedAllocations.rows) {
    if (row.model_name.includes('Sovereign-P1')) {
       console.log(`Market: ${row.region_market_id} | Allocated: ${row.units_allocated}`);
    }
  }

  client.end();
});
