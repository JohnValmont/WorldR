const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, '../database/migrations/0054_gearcity_logistics.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('Migration 0054 applied successfully');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
