const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function check() {
  const res = await pool.query(`
    SELECT c.name, SUM(s.shares) as total_shares
    FROM companies c
    JOIN company_shares s ON c.id = s.company_id
    WHERE c.name IN ('Arcas Engineering', 'Veridian Motors', 'Apex Automobili', 'Valuecorp', 'HaulPro')
    GROUP BY c.name
  `);
  console.table(res.rows);
  pool.end();
}
check();
