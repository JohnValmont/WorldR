const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  try {
    const res = await pool.query("SELECT available_cash FROM company_finances WHERE company_id = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351'");
    console.log('Company Cash directly:', res.rows[0].available_cash);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
check();
