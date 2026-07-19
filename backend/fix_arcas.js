const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function fix() {
  const companyId = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351';
  await pool.query(`BEGIN`);
  try {
    await pool.query(`UPDATE companies SET legal_structure_id = 'private-company', is_exchange_listed = false WHERE id = $1`, [companyId]);
    const ipo = await pool.query(`SELECT id FROM ipo_listings WHERE company_id = $1`, [companyId]);
    if (ipo.rows.length > 0) {
      await pool.query(`DELETE FROM ipo_indications WHERE ipo_id = $1`, [ipo.rows[0].id]);
      await pool.query(`DELETE FROM ipo_listings WHERE id = $1`, [ipo.rows[0].id]);
    }
    await pool.query(`DELETE FROM share_price_history WHERE company_id = $1`, [companyId]);
    await pool.query(`COMMIT`);
    console.log('Fixed Arcas Engineering IPO bug!');
  } catch(e) {
    await pool.query(`ROLLBACK`);
    console.error(e);
  }
  pool.end();
}
fix();
