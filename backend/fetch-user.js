const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/worldr_db');
client.connect()
  .then(() => client.query("SELECT user_id FROM characters WHERE id = 'f56a6f8c-8fd3-4c6b-9c74-f951d0eaa0aa'"))
  .then(res => { console.log(res.rows[0]); client.end(); })
  .catch(e => { console.error(e); client.end(); });
