const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  // Find a company with a launched active model
  const res = await pool.query(`
    SELECT m.id, m.company_id, c.name, m.launched_year
    FROM manufacturing_vehicle_models m
    JOIN companies c ON m.company_id = c.id
    WHERE m.status = 'active' AND m.development_status = 'launched'
    LIMIT 1
  `);
  console.log("Found model to test:", res.rows[0]);
  pool.end();
}
check();
