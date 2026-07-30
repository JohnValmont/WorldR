require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT company_id, vehicle_model_id, region_market_id, COUNT(1) as cnt 
    FROM manufacturing_market_allocations 
    GROUP BY company_id, vehicle_model_id, region_market_id 
    HAVING COUNT(1) > 1
  `);
  console.log('Duplicates found:', res.rows.length);
  if (res.rows.length > 0) {
    console.log(res.rows.slice(0, 5));
  }
  await client.end();
}
check().catch(console.error);
