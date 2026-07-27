const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // When were these Y842 reports created?
  const when = await client.query(
    "SELECT company_id, world_year, world_month, created_at, c.name " +
    "FROM manufacturing_arc_reports ar LEFT JOIN companies c ON c.id = ar.company_id " +
    "WHERE ar.world_year > 100 ORDER BY created_at ASC LIMIT 5"
  );
  console.log("=== WHEN WERE Y842 REPORTS CREATED? ===");
  when.rows.forEach(r => console.log(`  ${r.name} Y${r.world_year} M${r.world_month} created at: ${r.created_at}`));

  // Check if there is a created_at column
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'manufacturing_arc_reports' ORDER BY ordinal_position");
  console.log("\n=== arc_reports COLUMNS ===");
  cols.rows.forEach(r => console.log(" ", r.column_name));

  await client.end();
}
run().catch(console.error);
