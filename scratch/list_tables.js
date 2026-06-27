const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/worldr_db');
client.connect().then(async () => {
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(res.rows.map(r => r.table_name).join(', '));
  client.end();
});
