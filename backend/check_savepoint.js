const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    console.log("Testing SAVEPOINT support via Supavisor...");
    await client.query("BEGIN");
    await client.query("SAVEPOINT sp1");
    await client.query("SELECT 1");
    await client.query("RELEASE SAVEPOINT sp1");
    await client.query("COMMIT");
    console.log("SAVEPOINT works OK");
  } catch(e) {
    console.log("SAVEPOINT failed:", e.message);
    try { await client.query("ROLLBACK"); } catch(_) {}
  }
  
  // Also check current pool_mode
  try {
    const res = await client.query("SHOW transaction_isolation");
    console.log("isolation:", res.rows[0]);
    const mode = await client.query("SELECT current_setting('pgbouncer.pool_mode', true) as pool_mode");
    console.log("pool_mode:", mode.rows[0]);
  } catch(e) {
    console.log("pool_mode check:", e.message);
  }
  
  await client.end();
}
run().catch(console.error);
