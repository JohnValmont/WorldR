const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT c.name, cs.shares, cs.avg_cost_basis, sph.close_price, sph.market_cap
      FROM companies c
      JOIN company_shares cs ON cs.company_id = c.id
      JOIN (
        SELECT company_id, close_price, market_cap
        FROM share_price_history
        WHERE game_year = 4 AND game_month = 1 -- Latest recorded before my clamp
      ) sph ON sph.company_id = c.id
      WHERE c.name = 'Veridian Motors'
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
