import { db } from './config/database'; 

async function run() {
  const s = await db('manufacturing_sales_results').where({ company_id: '8c94413a-54b7-464b-ae31-0afe27b60362' }).first();
  console.log("Sales:", s);
  process.exit(0);
}
run();
