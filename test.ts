require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/database').default;
async function run() {
  try {
    console.log("=== NPC Companies ===");
    const npcs = await db('companies').where({ is_npc: true, industry_id: 'manufacturing' }).select('id', 'name');
    console.log(`Found ${npcs.length} NPC manufacturing companies.`);

    if (npcs.length > 0) {
      const npcIds = npcs.map(n => n.id);
      
      console.log("\n=== NPC Models ===");
      const models = await db('manufacturing_vehicle_models').whereIn('company_id', npcIds).select('id', 'name', 'status', 'development_status');
      console.log(`Found ${models.length} models. Active+Launched: ${models.filter(m => m.status === 'active' && m.development_status === 'launched').length}`);

      console.log("\n=== NPC Factories ===");
      const factories = await db('manufacturing_factories').whereIn('company_id', npcIds);
      console.log(`Found ${factories.length} factories.`);

      console.log("\n=== NPC Production Lines ===");
      const lines = await db('manufacturing_production_lines').whereIn('factory_id', factories.map(f => f.id));
      console.log(`Found ${lines.length} production lines.`);

      console.log("\n=== NPC Inventory ===");
      const inventory = await db('manufacturing_inventory').whereIn('company_id', npcIds);
      console.log(`Found inventory for ${inventory.length} models. Total units: ${inventory.reduce((sum, i) => sum + Number(i.units_in_stock), 0)}`);

      console.log("\n=== NPC Allocations ===");
      const allocs = await db('manufacturing_market_allocations').whereIn('company_id', npcIds);
      console.log(`Found ${allocs.length} market allocations. Total allocated units: ${allocs.reduce((sum, a) => sum + Number(a.units_allocated), 0)}`);

      console.log("\n=== NPC Sales ===");
      const sales = await db('manufacturing_sales_results')
        .join('manufacturing_vehicle_models', 'manufacturing_vehicle_models.id', 'manufacturing_sales_results.vehicle_model_id')
        .whereIn('manufacturing_vehicle_models.company_id', npcIds)
        .select('manufacturing_sales_results.*');
      console.log(`Found ${sales.length} sales records across all time.`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
