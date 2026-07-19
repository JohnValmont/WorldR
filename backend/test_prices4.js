const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT c.name, 
           (SELECT close_price FROM share_price_history WHERE company_id = c.id ORDER BY game_year DESC, game_month DESC LIMIT 1) as price,
           (SELECT market_cap FROM share_price_history WHERE company_id = c.id ORDER BY game_year DESC, game_month DESC LIMIT 1) as market_cap,
           f.company_value as book_value,
           f.available_cash
    FROM companies c
    JOIN company_finances f ON c.id = f.company_id
    WHERE c.is_npc = true AND c.is_exchange_listed = true
    ORDER BY c.name
  `);
  console.table(res.rows);
  pool.end();
}
check();
