require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'");
  console.log(res.rows[0].count);
  await client.end();
}
run();
