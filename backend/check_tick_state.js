const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. World clock
  const clock = await client.query("SELECT current_year, current_month, status, next_arc_close_at FROM world_clock LIMIT 1");
  console.log("=== WORLD CLOCK ===");
  console.log(clock.rows[0]);

  // 2. Latest arc reports
  const reports = await client.query(
    "SELECT world_year, world_month, COUNT(*) as companies FROM manufacturing_arc_reports GROUP BY world_year, world_month ORDER BY world_year DESC, world_month DESC LIMIT 12"
  );
  console.log("\n=== ARC REPORTS (most recent) ===");
  reports.rows.forEach(r => console.log(`  Y${r.world_year} M${r.world_month}: ${r.companies} companies processed`));

  // 3. Latest sales results
  const sales = await client.query(
    "SELECT world_year, world_month, SUM(units_sold) as total_units, SUM(revenue) as total_revenue FROM manufacturing_sales_results GROUP BY world_year, world_month ORDER BY world_year DESC, world_month DESC LIMIT 12"
  );
  console.log("\n=== SALES RESULTS (most recent) ===");
  sales.rows.forEach(r => console.log(`  Y${r.world_year} M${r.world_month}: ${r.total_units} units, $${parseInt(r.total_revenue).toLocaleString()}`));

  // 4. Check if any locks on world_clock
  const locks = await client.query(
    "SELECT pid, state, query FROM pg_stat_activity WHERE query ILIKE '%world_clock%' AND state != 'idle'"
  );
  console.log("\n=== ACTIVE world_clock QUERIES ===");
  if (locks.rows.length === 0) console.log("  None");
  else locks.rows.forEach(r => console.log("  PID:", r.pid, "| State:", r.state, "| Q:", r.query?.substring(0, 100)));

  // 5. Check schema_migrations to see if 0054 ran
  const migs = await client.query("SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 5");
  console.log("\n=== LATEST MIGRATIONS ===");
  migs.rows.forEach(r => console.log(" ", r.name));

  await client.end();
}
run().catch(console.error);
