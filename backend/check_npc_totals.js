const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT c.name, SUM(cs.shares) as total_shares, sph.market_cap
      FROM companies c
      JOIN company_shares cs ON cs.company_id = c.id
      JOIN (
        SELECT company_id, market_cap, ROW_NUMBER() OVER(PARTITION BY company_id ORDER BY game_year DESC, game_month DESC) as rn
        FROM share_price_history
      ) sph ON sph.company_id = c.id AND sph.rn = 1
      WHERE c.is_npc = true
      GROUP BY c.name, sph.market_cap
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
