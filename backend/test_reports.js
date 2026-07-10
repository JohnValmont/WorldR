require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'manufacturing_arc_reports'");
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
run();
