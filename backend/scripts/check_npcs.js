const { db } = require('../src/config/database');

async function run() {
  try {
    const data = await db('companies as c')
      .join('manufacturing_npc_state as ns', 'c.id', 'ns.company_id')
      .join('manufacturing_vehicle_models as m', 'ns.vehicle_model_id', 'm.id')
      .join('manufacturing_production_lines as p', 'm.id', 'p.assigned_vehicle_model_id')
      .join('manufacturing_factories as f', 'p.factory_id', 'f.id')
      .join('manufacturing_inventory as i', 'm.id', 'i.vehicle_model_id')
      .where('c.is_npc', true)
      .select('c.name', 'm.name as model', 'ns.last_units_sold', 'p.target_units_per_month', 'f.capacity_per_arc', 'i.units_in_stock', 'm.sale_price');
    console.table(data);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
