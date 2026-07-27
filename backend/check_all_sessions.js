const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== ALL SESSIONS ===");
  const all = await client.query(
    "SELECT pid, state, application_name, backend_type, " +
    "query_start, state_change, LEFT(query, 120) as last_query, " +
    "EXTRACT(EPOCH FROM (now() - state_change)) as seconds_in_state " +
    "FROM pg_stat_activity " +
    "WHERE datname = current_database() " +
    "ORDER BY state, state_change ASC NULLS LAST"
  );
  
  const byState = {};
  all.rows.forEach(r => {
    byState[r.state] = byState[r.state] || [];
    byState[r.state].push(r);
  });
  
  Object.entries(byState).forEach(([state, rows]) => {
    console.log("\n--- State:", state, "(" + rows.length + " sessions) ---");
    rows.forEach(r => {
      console.log("  PID:", r.pid, "| App:", r.application_name, "| In state for:", Math.round(r.seconds_in_state || 0) + "s");
      if (r.last_query) console.log("  LastQ:", r.last_query);
    });
  });
  
  await client.end();
}
run().catch(console.error);
