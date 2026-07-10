import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const compId = 'da85639c-8f28-4abe-ab19-a51ae86128c0';
    const sales = await client.query(`SELECT world_year, world_month, units_sold, created_at FROM manufacturing_sales_results WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5`, [compId]);
    console.log(sales.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
