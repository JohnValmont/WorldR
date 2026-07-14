const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/worldr_db');
client.connect()
  .then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturing_factories'"))
  .then(res => { 
    console.log(res.rows); 
    process.exit(0); 
  })
  .catch(e => { console.error(e); process.exit(1); });
