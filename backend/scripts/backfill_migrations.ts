import { db } from '../src/config/database';

async function backfill() {
  try {
    const sql = `
      INSERT INTO schema_migrations (name)
      VALUES 
          ('0004_manufacturing_foundation.sql'),
          ('0005_add_subsector_to_companies.sql'),
          ('0006_vehicle_development_status.sql'),
          ('0007_vehicle_development_timer.sql'),
          ('0008_market_sales.sql'),
          ('0009_workforce_system.sql'),
          ('0010_engineering_research.sql'),
          ('0011_factory_expansion.sql'),
          ('0012_vehicle_model_lifecycle.sql'),
          ('0013_universalise_automobile.sql'),
          ('0014_population_purchase_likelihood.sql'),
          ('0015_local_brand_awareness.sql'),
          ('0016_local_brand_milestones.sql'),
          ('0017_components_and_procurement.sql'),
          ('0018_universalise_auto_config.sql'),
          ('0019_engineering_depth.sql'),
          ('0020_engineering_consequences.sql'),
          ('0021_engineering_engine.sql'),
          ('0022_fix_balance_rating_length.sql'),
          ('0023_npc_companies.sql'),
          ('0024_sales_reason_code.sql'),
          ('0025_add_safety_score.sql')
      ON CONFLICT (name) DO NOTHING;
    `;
    await db.raw(sql);
    console.log("Backfill complete.");
  } catch (e) {
    console.error("Backfill failed", e);
  } finally {
    await db.destroy();
  }
}

backfill();
