require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%manufacturing%' OR table_name LIKE '%vehicle%'
  `);
  console.log(res.rows);
  await client.end();
}
run();
