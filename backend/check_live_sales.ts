import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query("SELECT count(*) as count FROM manufacturing_sales_results WHERE world_year = 5 AND world_month = 5");
    console.log("SALES IN M5 Y5:", res.rows[0].count);
    const res4 = await client.query("SELECT count(*) as count FROM manufacturing_sales_results WHERE world_year = 5 AND world_month = 4");
    console.log("SALES IN M4 Y5:", res4.rows[0].count);
    
    // Check if there was any error recorded in logs? Or check if demand was generated.
    const allocations = await client.query("SELECT count(*) as count FROM manufacturing_market_allocations");
    console.log("TOTAL ALLOCATIONS:", allocations.rows[0].count);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
