const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT c.name, c.is_exchange_listed, c.legal_structure_id
    FROM companies c
    WHERE c.name = 'Arcas Engineering'
  `);
  console.table(res.rows);
  pool.end();
}
check();
