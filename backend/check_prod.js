const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function run() {
  try {
    const clock = await pool.query('SELECT * FROM world_clock');
    console.log('Clock:', clock.rows);
    
    // Check knex_migrations to see if 0058 ran
    const migrations = await pool.query('SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 5');
    console.log('Recent Migrations:', migrations.rows);
    
    // Check if min_purchase_shares exists
    const equityCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'equity_placements'`);
    console.log('Equity Columns:', equityCols.rows.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
