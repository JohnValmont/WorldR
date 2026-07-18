import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function runMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync('d:/WorldR/backend/database/migrations/0048_fix_ledger_arc.sql', 'utf-8');
  await client.query(sql);
  console.log('Migration completed.');
  await client.end();
}

runMigration().catch(console.error);
