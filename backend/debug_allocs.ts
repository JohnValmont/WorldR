import { db } from './src/config/database';

async function run() {
  const compId = '767c2273-94b5-4c11-9675-75b81e7e1510';
  const allocs = await db('manufacturing_market_allocations').where('company_id', compId);
  console.log(`Allocs length: ${allocs.length}`);
  if (allocs.length > 0) {
     console.log(`Alloc units: ${allocs[0].units_allocated}`);
  }
  process.exit(0);
}

run();
