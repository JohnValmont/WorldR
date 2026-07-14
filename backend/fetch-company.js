const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/worldr_db');
client.connect()
  .then(() => client.query("SELECT id, name FROM companies WHERE name ILIKE '%Aldrich%' LIMIT 1"))
  .then(res => { 
    if (res.rows.length) {
      console.log('COMPANY_ID:', res.rows[0].id, res.rows[0].name); 
    } else {
      console.log('Not found');
    }
    process.exit(0); 
  })
  .catch(e => { console.error(e); process.exit(1); });
