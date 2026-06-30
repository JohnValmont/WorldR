import { db } from './src/config/database';

async function run() {
  const compId = '767c2273-94b5-4c11-9675-75b81e7e1510';
  const prodLine = await db('manufacturing_production_lines').where('company_id', compId).first();
  console.log(`ProdLine target: ${prodLine?.target_units_per_arc}`);
  process.exit(0);
}

run();
