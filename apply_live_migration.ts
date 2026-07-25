import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/0077_company_debt_facilities.sql'), 'utf8');
    await client.query(sql);
    console.log("Migration 0077 applied successfully!");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}

main();
