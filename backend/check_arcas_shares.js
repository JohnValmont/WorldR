const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const companyId = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351';
  const res = await pool.query('SELECT * FROM company_shares WHERE company_id = $1', [companyId]);
  console.table(res.rows);
  pool.end();
}
check();
