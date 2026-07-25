import { db } from './src/config/database';
async function run() {
  console.log(await db('manufacturing_sales_results').select('world_year', 'world_month', 'region_market_id', 'units_sold').limit(5));
  db.destroy();
}
run();
