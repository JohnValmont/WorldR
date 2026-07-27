const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. Kill any stuck/aborted connections from the migration failure
  const stuck = await client.query(`
    SELECT pid, state, LEFT(query, 80) as q FROM pg_stat_activity 
    WHERE state IN ('idle in transaction (aborted)', 'idle in transaction')
    AND datname = current_database()`);
  console.log(`Stuck connections: ${stuck.rows.length}`);
  for (const r of stuck.rows) {
    await client.query("SELECT pg_terminate_backend($1)", [r.pid]);
    console.log("  Killed PID", r.pid, "state:", r.state);
  }

  // 2. Check world clock
  const clock = await client.query("SELECT current_year, current_month, next_arc_close_at, status FROM world_clock");
  const c = clock.rows[0];
  const overdueMs = Date.now() - new Date(c.next_arc_close_at).getTime();
  console.log(`\nClock: Y${c.current_year} M${c.current_month} | status: ${c.status} | overdue by: ${Math.round(overdueMs/1000)}s`);

  // 3. Reset next_arc_close_at to force tick to fire NOW
  await client.query("UPDATE world_clock SET next_arc_close_at = NOW() - INTERVAL '1 second' WHERE status = 'active'");
  console.log("Reset next_arc_close_at to now - tick will fire on next backend check");

  // 4. Check schema_migrations for 0054
  const mig = await client.query("SELECT name FROM schema_migrations WHERE name = '0054_deduplicate_vehicle_model_names.sql'");
  console.log(`\n0054 in schema_migrations: ${mig.rows.length > 0 ? 'YES (already applied)' : 'NO (will run on next boot)'}`);

  await client.end();
}
run().catch(console.error);
