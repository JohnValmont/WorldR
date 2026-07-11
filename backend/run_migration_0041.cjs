const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    await client.connect();
    const sql = fs.readFileSync(path.join(__dirname, '../database/migrations/0041_fix_engineering_balance_rating.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 0041 applied successfully on Supabase.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
run();
