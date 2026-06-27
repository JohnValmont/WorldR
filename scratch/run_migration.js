const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client('postgres://postgres:postgres@localhost:5432/worldr_db');

client.connect().then(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'database/migrations/0006_vehicle_development_status.sql'),
    'utf8'
  );
  await client.query(sql);
  console.log('Migration 0006 applied successfully.');

  const result = await client.query(
    "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='manufacturing_vehicle_models' AND column_name='development_status'"
  );
  console.log('Column check:', JSON.stringify(result.rows));
  await client.end();
}).catch(err => {
  console.error('Migration failed:', err.message);
  client.end();
});
