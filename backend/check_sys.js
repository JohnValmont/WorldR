const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function run() {
  const res = await pool.query(`
    SELECT u.email, c.id, c.name
    FROM characters c
    JOIN users u ON u.id = c.user_id
    WHERE u.email = 'system_npc@worldr.game'
  `);
  console.log(res.rows);
  pool.end();
}
run();
