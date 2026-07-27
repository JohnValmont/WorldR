const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. What the clock says
  const clock = await client.query(`SELECT current_year, current_month, current_arc FROM world_clock LIMIT 1`);
  console.log("Clock:", clock.rows[0]);

  // 2. What the latest sales results look like
  const latest = await client.query(`
    SELECT world_year, world_month, world_arc, COUNT(*) as rows
    FROM manufacturing_sales_results
    GROUP BY world_year, world_month, world_arc
    ORDER BY world_year DESC, world_month DESC
    LIMIT 5
  `);
  console.log("Latest sales arcs:", latest.rows);
  
  await client.end();
}
run().catch(console.error);
