const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/WorldR/backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const chars = await pool.query("SELECT id, name, user_id FROM characters WHERE status = 'active' LIMIT 5");
  console.log('characters:', chars.rows);
  for (const c of chars.rows) {
    const fin = await pool.query('SELECT cash_in_hand FROM character_finances WHERE character_id = $1', [c.id]);
    console.log('finances for', c.name, ':', fin.rows.length > 0 ? { cash: fin.rows[0].cash_in_hand } : 'MISSING');
    const mem = await pool.query('SELECT party_id FROM pol_party_members WHERE character_id = $1', [c.id]);
    console.log('party_member for', c.name, ':', mem.rows.length > 0 ? mem.rows[0].party_id : 'none');
  }
  const parties = await pool.query('SELECT id, name, abbreviation, is_npc FROM pol_parties LIMIT 10');
  console.log('parties:', parties.rows);
  pool.end();
}
check().catch(e => { console.error(e); pool.end(); });
