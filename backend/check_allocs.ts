import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT 
        a.id, a.company_id, a.vehicle_model_id, a.units_allocated, 
        m.name as model_name, m.development_status,
        c.name as company_name
      FROM manufacturing_market_allocations a
      JOIN manufacturing_vehicle_models m ON a.vehicle_model_id = m.id
      JOIN manufacturing_region_markets rm ON a.region_market_id = rm.id
      JOIN companies c ON a.company_id = c.id
      WHERE c.name LIKE '%Aldrich%'
      AND m.development_status IN ('launched', 'discontinued');
    `);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
