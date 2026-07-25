const db = require('./backend/src/config/database').default;

async function run() {
  try {
    const instance = await db('world_instances').where({ status: 'active' }).first();
    if (!instance) return;

    const topPlayerModel = await db('manufacturing_sales_results as r')
      .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
      .join('companies as c', 'c.id', 'm.company_id')
      .where('r.world_instance_id', instance.id)
      .where('r.world_year', 5)
      .where('r.world_month', 10)
      .where('c.is_npc', false)
      .select('m.*', 'c.name as player_company_name')
      .sum('r.units_sold as total_sold')
      .groupBy('m.id', 'c.name', 'c.is_npc')
      .orderByRaw('SUM(r.units_sold) DESC')
      .first();

    console.log(topPlayerModel ? topPlayerModel.name : "No model found");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
