const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
async function check() {
  const companyId = '3c0fb155-3ed0-4e99-8a24-9af4f7b33351';
  const res = await pool.query('SELECT * FROM company_shares WHERE company_id = $1', [companyId]);
  console.table(res.rows);
  const ind = await pool.query('SELECT * FROM ipo_listings WHERE company_id = $1', [companyId]);
  console.table(ind.rows);
  pool.end();
}
check();
