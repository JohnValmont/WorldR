const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function check() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturing_market_brand_milestones'");
    console.log('milestones columns:', res.rows);
    
    const brandRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturing_brand_awareness'");
    console.log('brand awareness columns:', brandRes.rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
check();
