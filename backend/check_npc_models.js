const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const models = await pool.query(`
    SELECT m.name, m.launched_year, m.status, c.name as company_name 
    FROM manufacturing_vehicle_models m
    JOIN companies c ON m.company_id = c.id
    WHERE m.development_status = 'launched'
    ORDER BY m.created_at DESC
    LIMIT 10
  `);
  console.table(models.rows);
  pool.end();
}
check();
