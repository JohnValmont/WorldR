import knex from 'knex';
import config from '../knexfile';
const db = knex(config.development);

async function run() {
  const res = await db.raw('SELECT m.name as model, c.name as company, r.units_sold, r.world_month FROM manufacturing_sales_results r JOIN manufacturing_vehicle_models m ON m.id = r.vehicle_model_id JOIN companies c ON c.id = m.company_id ORDER BY r.world_month DESC, r.units_sold DESC');
  console.table(res.rows);
  process.exit(0);
}
run();
