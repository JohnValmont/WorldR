const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  try {
    const res = await pool.query(`
      SELECT m.name, p.status as line_status, p.target_units_per_month
      FROM manufacturing_production_lines p
      JOIN manufacturing_vehicle_models m ON p.assigned_vehicle_model_id = m.id
      WHERE m.company_id = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351'
    `);
    console.log('Production lines:', res.rows);
    
    const inv = await pool.query(`
      SELECT m.name, i.units_in_stock
      FROM manufacturing_inventory i
      JOIN manufacturing_vehicle_models m ON i.vehicle_model_id = m.id
      WHERE i.company_id = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351' AND i.units_in_stock > 0
    `);
    console.log('Inventory:', inv.rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
check();
