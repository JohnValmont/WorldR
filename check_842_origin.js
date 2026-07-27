const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Check manufacturing_arc_reports -- does world_year=842 appear there too?
  const arcRep = await client.query(`SELECT world_year, world_month, COUNT(*) FROM manufacturing_arc_reports GROUP BY world_year, world_month ORDER BY world_year DESC, world_month DESC LIMIT 8`);
  console.log("Arc reports:", JSON.stringify(arcRep.rows));

  // Check world_clock history or any table with arc number 842
  const arcReports842 = await client.query(`SELECT world_year, world_month, company_id FROM manufacturing_arc_reports WHERE world_year > 100 LIMIT 10`);
  console.log("Arc reports year>100:", JSON.stringify(arcReports842.rows));

  // What is total months ticked? current_year=6, current_month=5 => 6*12+5 = 77 months. Why 842?
  // Check if any other table has 842
  const wc = await client.query(`SELECT * FROM world_clock LIMIT 1`);
  const totalMonths = wc.rows[0].current_year * 12 + wc.rows[0].current_month;
  console.log("Total months from clock:", totalMonths, "(should never be 842)");

  await client.end();
}
run().catch(console.error);
