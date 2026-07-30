const { Client } = require('pg');
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const inv = await client.query(`
    SELECT m.name as model, i.units_in_stock 
    FROM manufacturing_inventory i 
    JOIN manufacturing_vehicle_models m ON i.vehicle_model_id = m.id 
    JOIN companies c ON m.company_id = c.id 
    WHERE c.name = 'HaulPro'
  `);
  console.log('\n--- INVENTORY (HaulPro) ---');
  console.table(inv.rows);
  client.end();
}

run().catch(console.error);
