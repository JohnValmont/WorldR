const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT COUNT(*) as c
      FROM share_price_history
      WHERE close_price = 100000000.000000;
    `);
    console.log('Remaining 100M rows:', res.rows[0].c);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
