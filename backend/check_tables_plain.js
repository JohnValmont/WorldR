require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log(res.rows.map(r => r.table_name).filter(t => t.includes('manufacturing') || t.includes('vehicle')));
  await client.end();
}
run();
