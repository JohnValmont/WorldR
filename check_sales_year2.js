const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. What the clock says
  const clock = await client.query(`SELECT * FROM world_clock LIMIT 1`);
  console.log("Clock:", JSON.stringify(clock.rows[0]));

  // 2. What columns does sales_results have?
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='manufacturing_sales_results' ORDER BY ordinal_position`);
  console.log("Cols:", cols.rows.map(r => r.column_name).join(', '));

  // 3. What are the latest 5 distinct year+month in sales?
  const latest = await client.query(`
    SELECT world_year, world_month, COUNT(*) as rows
    FROM manufacturing_sales_results
    GROUP BY world_year, world_month
    ORDER BY world_year DESC, world_month DESC
    LIMIT 5
  `);
  console.log("Latest sales:", JSON.stringify(latest.rows));
  
  await client.end();
}
run().catch(console.error);
