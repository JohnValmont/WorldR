const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const when = await client.query(
    "SELECT ar.company_id, ar.world_year, ar.world_month, ar.created_at, c.name " +
    "FROM manufacturing_arc_reports ar LEFT JOIN companies c ON c.id = ar.company_id " +
    "WHERE ar.world_year > 100 ORDER BY ar.created_at ASC LIMIT 10"
  );
  console.log("Y842 REPORTS - CREATED AT:");
  when.rows.forEach(r => console.log(`  ${r.name} Y${r.world_year} M${r.world_month} at ${r.created_at}`));

  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'manufacturing_arc_reports' ORDER BY ordinal_position");
  console.log("\narc_reports COLUMNS:", cols.rows.map(r => r.column_name).join(", "));

  await client.end();
}
run().catch(console.error);
