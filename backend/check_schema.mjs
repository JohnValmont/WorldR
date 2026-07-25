import { Client } from 'pg';

const client = new Client({
  user: 'worldr_user',
  host: 'localhost',
  database: 'worldr',
  password: 'worldr_password',
  port: 5432
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'manufacturing_vehicle_models';
  `);
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
