const { Client } = require("pg");
const PROD_URL = "postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?connection_limit=1";

async function run() {
  const client = new Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Inspect the bad rows first
  const bad = await client.query(`SELECT id, company_id, vehicle_model_id, region_market_id, world_year, world_month, units_sold FROM manufacturing_sales_results WHERE world_year > 100`);
  console.log("Bad rows:", JSON.stringify(bad.rows, null, 2));

  if (bad.rows.length > 0) {
    // Current clock is year 6, month 5. These should be year 6 rows.
    // The month values (1-4) suggest they are months 1-4 of year 6.
    const result = await client.query(`
      UPDATE manufacturing_sales_results
      SET world_year = 6
      WHERE world_year > 100
    `);
    console.log("Fixed rows:", result.rowCount);
    
    // Verify
    const verify = await client.query(`SELECT world_year, world_month, COUNT(*) FROM manufacturing_sales_results GROUP BY world_year, world_month ORDER BY world_year DESC, world_month DESC LIMIT 8`);
    console.log("After fix:", JSON.stringify(verify.rows));
  }

  await client.end();
}
run().catch(console.error);
