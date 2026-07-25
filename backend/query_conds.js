const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM pol_jurisdiction_conditions LIMIT 1");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run().catch(err => console.error(err));
