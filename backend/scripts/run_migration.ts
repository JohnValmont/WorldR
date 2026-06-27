import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;

async function run() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const sqlPath = path.resolve(__dirname, '../../database/migrations/0020_engineering_consequences.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Migration ran successfully');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

run();
