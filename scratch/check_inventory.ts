import { db } from '../backend/src/db'; 

async function run() {
  const inventory = await db('manufacturing_inventory').select('*');
  console.log("Inventory:", inventory);
  
  const allocs = await db('manufacturing_market_allocations').select('*');
  console.log("Allocations:", allocs);
  
  const sales = await db('manufacturing_sales_results').select('*');
  console.log("Sales:", sales);
  
  const production = await db('manufacturing_production_lines').select('*');
  console.log("Production Lines:", production);
  
  process.exit(0);
}
run();
