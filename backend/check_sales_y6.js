const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. Check manufacturing_sales_results for Y6
  const sales = await client.query(`
    SELECT sr.world_year, sr.world_month, sr.units_sold, sr.revenue, c.name as company_name
    FROM manufacturing_sales_results sr
    JOIN manufacturing_vehicle_models m ON m.id = sr.vehicle_model_id
    JOIN companies c ON c.id = m.company_id
    WHERE sr.world_year >= 5
    ORDER BY sr.world_year, sr.world_month, c.name
    LIMIT 40
  `);
  console.log("=== SALES RESULTS Y5+ ===");
  if (sales.rows.length === 0) console.log("  NO SALES DATA AT ALL!");
  else sales.rows.forEach(r => console.log(`  ${r.company_name} Y${r.world_year} M${r.world_month}: ${r.units_sold} units | $${r.revenue}`));

  // 2. Check arc reports for Y6
  const reports = await client.query(`
    SELECT ar.world_year, ar.world_month, ar.units_sold, ar.gross_revenue, c.name
    FROM manufacturing_arc_reports ar
    JOIN companies c ON c.id = ar.company_id
    WHERE ar.world_year >= 5 AND ar.world_year < 100
    ORDER BY ar.world_year, ar.world_month, c.name
    LIMIT 40
  `);
  console.log("\n=== MONTHLY REPORTS Y5+ ===");
  if (reports.rows.length === 0) console.log("  NO REPORTS AT ALL!");
  else reports.rows.forEach(r => console.log(`  ${r.name} Y${r.world_year} M${r.world_month}: sold=${r.units_sold} revenue=$${r.gross_revenue}`));

  // 3. What is the latest processed month?
  const latest = await client.query(`
    SELECT MAX(world_year) as max_year, MAX(world_month) as max_month
    FROM manufacturing_arc_reports WHERE world_year < 100
  `);
  console.log("\n=== LATEST PROCESSED MONTH ===", latest.rows[0]);

  // 4. World clock
  const clock = await client.query("SELECT current_year, current_month, next_arc_close_at FROM world_clock");
  const c = clock.rows[0];
  const overdue = (Date.now() - new Date(c.next_arc_close_at).getTime()) / 1000;
  console.log(`\n=== WORLD CLOCK ===\n  Y${c.current_year} M${c.current_month} | next_close overdue by: ${Math.round(overdue)}s`);

  await client.end();
}
run().catch(console.error);
