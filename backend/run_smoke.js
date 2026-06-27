require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const migrationsDir = 'd:/WorldR/database/migrations';
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    // Create schema_migrations if needed
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map(r => r.name));

    for (const file of files) {
      if (!applied.has(file)) {
        console.log('Running', file);
        const sql = fs.readFileSync(`${migrationsDir}/${file}`, 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      }
    }
    
    console.log('Running smoke test');
    const smokeSql = fs.readFileSync('d:/WorldR/tools/smoke_test_universalise.sql', 'utf8');
    await client.query(smokeSql);
    
    console.log('Smoke test passed');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
