const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
  await client.connect();
  const sql = require('fs').readFileSync('d:/WorldR/backend/database/migrations/0017_logistics_contracts.sql', 'utf-8');
  await client.query(sql);
  console.log('done');
  process.exit(0);
}
run().catch(console.error);