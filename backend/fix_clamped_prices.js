const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    const res = await pool.query(`
      WITH company_totals AS (
        SELECT company_id, SUM(shares) as total_shares
        FROM company_shares
        GROUP BY company_id
      )
      UPDATE share_price_history sph
      SET 
        open_price = sph.market_cap / ct.total_shares,
        high_price = sph.market_cap / ct.total_shares,
        low_price = sph.market_cap / ct.total_shares,
        close_price = sph.market_cap / ct.total_shares,
        eps = (sph.market_cap / ct.total_shares) / 10
      FROM company_totals ct, companies c
      WHERE sph.company_id = ct.company_id
        AND c.id = sph.company_id
        AND c.is_npc = true
        AND sph.close_price = 100000000.000000;
    `);
    console.log('Fixed:', res.rowCount);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
