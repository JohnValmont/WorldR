const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'pol_%'");
  for (const row of res.rows) {
    await client.query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`);
    console.log(`Dropped ${row.tablename}`);
  }
  
  // Also clean up schema migrations for any pol_ migrations that might exist
  await client.query("DELETE FROM schema_migrations WHERE name LIKE '%politics%' OR name LIKE '%pol_party%'");
  console.log("Cleared schema_migrations");
  
  await client.end();
}

run().catch(console.error);
