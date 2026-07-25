require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'manufacturing_vehicle_models'
      AND data_type = 'character varying'
  `);
  console.log(res.rows);
  await client.end();
}
run();
