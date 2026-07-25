import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query('SELECT * FROM world_clock LIMIT 1');
  console.log('Clock:', res.rows[0]);
  console.log('Now:', new Date());
  
  await client.end();
}

check().catch(console.error);
