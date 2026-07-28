import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT 
        world_year, 
        world_month, 
        SUM(units_sold) as total_sold
      FROM manufacturing_sales_results r 
      JOIN companies c ON r.company_id = c.id 
      WHERE c.name LIKE '%Aldrich%' 
        AND world_year >= 5 
      GROUP BY world_year, world_month 
      ORDER BY world_year DESC, world_month DESC;
    `);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
