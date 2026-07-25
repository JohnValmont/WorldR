const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function run() {
  await client.connect();
  const c_res = await client.query("SELECT id, name FROM characters");
  console.log("Characters:", c_res.rows);

  const comp_res = await client.query("SELECT id, name, owner_character_id FROM companies");
  console.log("Companies:", comp_res.rows);
  await client.end();
}
run().catch(err => console.error(err));
