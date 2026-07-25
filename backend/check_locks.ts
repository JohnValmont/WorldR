import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkLocks() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query(`
    SELECT pid, state, query, wait_event_type, wait_event, state_change
    FROM pg_stat_activity
    WHERE state = 'active' OR wait_event_type IS NOT NULL;
  `);
  console.log('Active queries/locks:', res.rows);
  
  await client.end();
}

checkLocks().catch(console.error);
