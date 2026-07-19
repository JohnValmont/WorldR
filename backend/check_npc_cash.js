const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query("SELECT c.name, f.cash_in_hand FROM characters c JOIN character_finances f ON c.id = f.character_id WHERE c.is_npc = true");
  console.table(res.rows);
  pool.end();
}
check();
