const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query("SELECT id, name, is_npc, owner_character_id FROM companies WHERE name = 'Arcas Engineering'");
  console.table(res.rows);
  pool.end();
}
check();
