const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT c.name, f.available_cash, f.debt, f.company_value, f.last_arc_profit
    FROM companies c
    JOIN company_finances f ON c.id = f.company_id
    WHERE c.name = 'Arcas Engineering'
  `);
  console.table(res.rows);
  pool.end();
}
check();
