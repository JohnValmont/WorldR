const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%share%' OR table_name LIKE '%stock%' OR table_name LIKE '%exchange%' OR table_name LIKE '%public%')
  `);
  console.log(res.rows);
  pool.end();
}
check();
