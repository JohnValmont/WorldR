const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  const states = await client.query("SELECT * FROM pol_states WHERE is_active = true LIMIT 1");
  const stateId = states.rows[0].id;
  
  const cycle = await client.query("SELECT * FROM pol_cycles WHERE state_id = $1 AND status = 'open' LIMIT 1", [stateId]);
  console.log("Current Open Cycle:", cycle.rows[0]);

  const clock = await client.query("SELECT * FROM world_clock LIMIT 1");
  const year = clock.rows[0].pol_current_year ?? 1;
  const month = clock.rows[0].pol_current_month ?? 1;
  const currentArc = year * 12 + (month - 1);
  console.log("Current Arc:", currentArc);
  
  // We want May Year 6 in UI.
  // The UI displays the world_clock current_year/month, or pol_current_year/month.
  // Year 6, May is arc: 6 * 12 + (5 - 1) = 72 + 4 = 76.
  // We should set polling_arc to 76.
  
  await client.query("UPDATE pol_cycles SET polling_arc = 76, formation_end_arc = 78, phase = 'governing' WHERE id = $1", [cycle.rows[0].id]);
    
  console.log("Set polling arc to 76");

  await client.end();
}
run().catch(console.error);
