const fs = require('fs');
const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function run() {
  const file = process.argv[2];
  if (!file) throw new Error("Please provide a migration file name (e.g. 0022_fix_balance_rating_length.sql)");
  const sql = fs.readFileSync(`D:\\WorldR\\database\\migrations\\${file}`, 'utf8');
  await db.raw(sql);
  console.log(`Migration ${file} applied successfully to Supabase DB`);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
