const fs = require('fs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
async function run() {
  try {
    const sql = fs.readFileSync('../database/migrations/0055_normalize_npc_shares.sql', 'utf8');
    await pool.query(sql);
    console.log('SUCCESS running 0055_normalize_npc_shares.sql');
  } catch (e) {
    console.error('FAILED running 0055_normalize_npc_shares.sql', e);
  } finally {
    pool.end();
  }
}
run();
