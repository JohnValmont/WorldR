const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. Kill any stuck transactions
  const stuck = await client.query("SELECT pid FROM pg_stat_activity WHERE state = 'idle in transaction (aborted)' AND datname = current_database()");
  for (const row of stuck.rows) {
    await client.query("SELECT pg_terminate_backend($1)", [row.pid]);
    console.log("Killed stuck PID:", row.pid);
  }

  // 2. Remove the bad Y842 arc reports that are blocking NPC processing
  const del = await client.query("DELETE FROM manufacturing_arc_reports WHERE world_year > 100 RETURNING id, company_id, world_year, world_month");
  console.log(`\nDeleted ${del.rowCount} bad arc reports (Y842+):`);
  del.rows.forEach(r => console.log(`  ID:${r.id} company:${r.company_id} Y${r.world_year} M${r.world_month}`));

  // 3. Reset the next_arc_close_at to NOW so tick fires immediately on next boot
  const upd = await client.query("UPDATE world_clock SET next_arc_close_at = NOW() - INTERVAL '1 second' WHERE status = 'active' RETURNING current_year, current_month, next_arc_close_at");
  console.log("\nReset world clock:", upd.rows[0]);

  // 4. Also remove 0054 from schema_migrations if it exists (it shouldnt since it failed, but just in case)
  const migCheck = await client.query("SELECT name FROM schema_migrations WHERE name = '0054_deduplicate_vehicle_model_names.sql'");
  console.log("\n0054 in schema_migrations:", migCheck.rows.length > 0 ? "YES - will remove" : "NO - clean");
  if (migCheck.rows.length > 0) {
    await client.query("DELETE FROM schema_migrations WHERE name = '0054_deduplicate_vehicle_model_names.sql'");
    console.log("Removed 0054 from schema_migrations so fixed version will apply on next boot");
  }

  await client.end();
  console.log("\nDone. Trigger a Render redeploy to apply the fixed migration and restart the tick.");
}
run().catch(console.error);
