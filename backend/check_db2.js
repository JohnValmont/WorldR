const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
  await client.connect();
  const res = await client.query("SELECT id, name, legal_structure_id, is_npc FROM companies");
  console.log(res.rows);
  const res2 = await client.query("SELECT * FROM legal_structures");
  console.log(res2.rows);
  process.exit(0);
}
run().catch(console.error);