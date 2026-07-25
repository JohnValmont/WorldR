const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function run() {
  const res = await pool.query(`
    SELECT o.id, o.side, o.price, o.quantity, o.status, c.name
    FROM share_orders o
    JOIN companies c ON o.company_id = c.id
    WHERE o.is_npc = true
    ORDER BY o.created_at DESC
    LIMIT 20
  `);
  console.log(res.rows);
  pool.end();
}
run();
