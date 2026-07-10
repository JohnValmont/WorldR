import { db } from './src/config/database';

async function check() {
  const sales = await db('manufacturing_sales_results').orderBy('world_month', 'desc').limit(5);
  console.log("SALES:", sales);

  const inventory = await db('manufacturing_inventory').limit(5);
  console.log("INVENTORY:", inventory);

  process.exit(0);
}
check();
