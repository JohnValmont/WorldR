const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT c.name, f.last_arc_profit, h.eps, h.analyst_estimate, h.profit_surprise_pct, h.game_year, h.game_month, h.close_price, h.open_price
    FROM companies c
    JOIN company_finances f ON c.id = f.company_id
    JOIN share_price_history h ON c.id = h.company_id
    WHERE c.name IN ('Arcas Engineering', 'Veridian Motors', 'Apex Automobili', 'Valuecorp', 'HaulPro')
    ORDER BY c.name, h.game_year DESC, h.game_month DESC
  `);
  console.table(res.rows);
  pool.end();
}
check();
