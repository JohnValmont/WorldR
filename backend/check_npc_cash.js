const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function run() {
  const res = await pool.query(`
    SELECT cash_in_hand
    FROM character_finances
    WHERE character_id = 'fe33e9ed-8840-4ad4-b8ce-6fa073101818'
  `);
  console.log(res.rows);
  pool.end();
}
run();
