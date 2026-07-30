const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function check() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'company_finances'");
    console.log('company_finances columns:', res.rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
check();
