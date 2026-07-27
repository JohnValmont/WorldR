const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // What months exist in arc_reports?
  const months = await client.query(`
    SELECT world_year, world_month, COUNT(DISTINCT company_id) as companies
    FROM manufacturing_arc_reports WHERE world_year < 100
    GROUP BY world_year, world_month
    ORDER BY world_year, world_month`);
  console.log("=== PROCESSED MONTHS ===");
  months.rows.forEach(r => console.log(`  Y${r.world_year} M${r.world_month}: ${r.companies} companies`));

  // Current companies count (active, non-deleted)
  const cos = await client.query("SELECT COUNT(*) as n FROM companies WHERE status = 'active'");
  console.log(`\nActive companies: ${cos.rows[0].n}`);

  // Clock
  const clock = await client.query("SELECT current_year, current_month, next_arc_close_at FROM world_clock");
  const r = clock.rows[0];
  const secsLeft = (new Date(r.next_arc_close_at).getTime() - Date.now()) / 1000;
  console.log(`\nWorld clock: Y${r.current_year} M${r.current_month}`);
  console.log(`Next month closes in: ${Math.round(secsLeft/3600*10)/10} hours`);

  await client.end();
}
run().catch(console.error);
