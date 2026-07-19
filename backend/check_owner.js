const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const characterId = '532330e5-1a04-4f4b-a7b6-3b392ca19d7c';
  const res = await pool.query('SELECT cs.company_id, cs.shares, c.name FROM company_shares cs JOIN companies c ON cs.company_id = c.id WHERE cs.holder_character_id = $1', [characterId]);
  console.table(res.rows);
  pool.end();
}
check();
