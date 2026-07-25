import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkInstances() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query('SELECT * FROM world_instances');
  console.log('Instances:', res.rows);
  await client.end();
}

checkInstances().catch(console.error);
