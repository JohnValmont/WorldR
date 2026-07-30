const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
async function run() {
  const sql = fs.readFileSync('database/migrations/0064_lifetime_metrics.sql', 'utf8');
  await pool.query(sql);
  console.log('Applied to local db');
  pool.end();
}
run();
