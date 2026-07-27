const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const clock = await client.query("SELECT * FROM world_clock LIMIT 1");
  console.log("FULL CLOCK:");
  const row = clock.rows[0];
  Object.entries(row).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  await client.end();
}
run().catch(console.error);
