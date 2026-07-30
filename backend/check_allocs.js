const { Client } = require('pg');
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`SELECT a.monthly_target FROM manufacturing_market_allocations a JOIN companies c ON a.company_id = c.id WHERE c.name = 'Veridian Motors' LIMIT 5`);
  console.log(res.rows);
  client.end();
}
run().catch(console.error);
