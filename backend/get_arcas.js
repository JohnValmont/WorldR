const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function check() {
  const res = await pool.query("SELECT * FROM companies WHERE name ILIKE '%Arcas%'");
  if (res.rows.length === 0) {
    console.log('No company found.');
  } else {
    const c = res.rows[0];
    console.log('Company:', c.name);
    console.log('Status:', c.status);
    console.log('NPC?:', c.is_npc);
    
    const finances = await pool.query("SELECT * FROM company_finances WHERE company_id = $1", [c.id]);
    if (finances.rows.length > 0) {
      console.log('Cash:', finances.rows[0].available_cash);
      console.log('Debt:', finances.rows[0].debt);
    }
    
    const models = await pool.query("SELECT * FROM manufacturing_vehicle_models WHERE company_id = $1", [c.id]);
    console.log('Models:', models.rows.map(m => m.name).join(', '));
  }
  pool.end();
}
check();
