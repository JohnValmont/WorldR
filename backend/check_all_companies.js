const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });

async function check() {
  try {
    const res = await pool.query("SELECT id, name FROM companies");
    const names = res.rows.map(r => r.name);
    console.log("All companies in DB:", names.join(', '));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
