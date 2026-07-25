const fs = require('fs');
const { Client } = require('pg');
const dbUrl = 'postgresql://postgres:postgres@localhost:5432/worldr_db';

async function run() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const sql = fs.readFileSync('d:/WorldR/database/migrations/0078_party_creation_rich_data.sql', 'utf8');
    await client.query(sql);
    console.log('Migration 0078 ran successfully');
    
    // Also record it in schema_migrations if the table exists
    try {
      await client.query("INSERT INTO schema_migrations (name) VALUES ('0078_party_creation_rich_data.sql') ON CONFLICT DO NOTHING");
      console.log('Recorded in schema_migrations');
    } catch (e) {
      console.log('Could not record in schema_migrations (might not exist)', e.message);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
