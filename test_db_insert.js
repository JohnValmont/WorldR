const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'worldr_db',
  }
});

async function run() {
  try {
    const clock = await db('world_clock').first();
    const company = await db('companies').where('industry_id', 'manufacturing').first();
    if (!company) { console.log('No company'); return; }
    
    await db('manufacturing_vehicle_models').insert({
      world_instance_id: company.world_instance_id,
      company_id: company.id,
      name: 'Test Vehicle Crash',
      vehicle_class: 'Compact Car',
      platform_type: 'economy',
      power_unit_type: 'small-i4',
      drivetrain_type: 'fwd',
      interior_tier: 'basic',
      safety_tier: 'standard',
      production_quality: 'standard',
      manufacturing_cost_per_unit: 10000,
      reliability_score: 50,
      performance_score: 50,
      fuel_efficiency_score: 50,
      appeal_score: 50,
      cargo_score: 50,
      safety_score: 50,
      target_segment: 'budget',
      sale_price: 15000,
      development_cost_discount: 0,
      status: 'active',
      development_status: 'in_development',
      engineering_priorities: '{}',
      engineering_budget_alloc: '{}',
      engineering_complexity: 50,
      manufacturing_complexity: 50,
      assembly_complexity: 50,
      vehicle_weight_kg: 1200,
      manufacturing_friendliness: 50,
      engineering_risk: 50,
      prototype_confidence: 50,
      dev_stage: 'engineering',
      planned_dev_time_arcs: 4,
      engineering_assessment: '{}',
      engineering_balance_rating: 'Target Market Conflict: Budget quality + premium interior',
      stage_engineering_completes_orbit: 1,
      stage_engineering_completes_arc: 1,
      stage_prototype_completes_orbit: 1,
      stage_prototype_completes_arc: 1,
      stage_testing_completes_orbit: 1,
      stage_testing_completes_arc: 1,
      created_at_world_orbit: 1,
      created_at_world_arc: 1,
      created_at_world_mark: 1,
      development_started_at_orbit: 1,
      development_started_at_arc: 1,
      development_completes_at_orbit: 1,
      development_completes_at_arc: 1,
    });
    console.log('Inserted successfully.');
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
