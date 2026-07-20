const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function run() {
  const res = await pool.query(`
    SELECT c.name, cs.holder_character_id, cs.shares, c.owner_character_id
    FROM companies c
    JOIN company_shares cs ON cs.company_id = c.id
    WHERE c.is_npc = true AND c.is_exchange_listed = true
  `);
  console.log(res.rows);
  pool.end();
}
run();
