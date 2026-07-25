const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT c.name, c.is_npc, c.is_exchange_listed
    FROM companies c
    WHERE c.name IN ('Arcas Engineering', 'Veridian Motors', 'Apex Automobili', 'Valuecorp', 'HaulPro')
  `);
  console.table(res.rows);
  pool.end();
}
check();
