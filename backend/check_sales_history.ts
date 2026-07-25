import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query("SELECT world_year, world_month, count(*) as c FROM manufacturing_sales_results GROUP BY world_year, world_month ORDER BY world_year DESC, world_month DESC LIMIT 10");
    console.log("SALES PER MONTH:");
    res.rows.forEach(r => console.log(`Y${r.world_year} M${r.world_month}: ${r.c} sales`));
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
