import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/0083_fix_brand_arc_results_world_year.sql'), 'utf8');
    await client.query(sql);
    console.log("Migration 0083 applied successfully!");
  } catch(e) {
    console.error("Migration 0083 failed:", e);
  } finally {
    await client.end();
  }
}

main();
