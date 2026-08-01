const knex = require('knex');
const fs = require('fs');

const db = knex({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5432/worldr_db'
});

async function run() {
  try {
    const sql = fs.readFileSync('d:\\WorldR\\backend\\database\\migrations\\0050_banking_system.sql', 'utf8');
    await db.raw(sql);
    console.log('Migration 0050_banking_system applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    db.destroy();
  }
}
run();
