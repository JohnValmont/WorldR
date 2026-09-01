import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load the backend .env (has the real Supabase DATABASE_URL)
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const DB = process.env.DATABASE_URL || '';

async function run() {
  if (!DB) {
    console.error('DATABASE_URL not found in backend/.env');
    process.exit(1);
  }

  const client = new Client({ connectionString: DB });
  await client.connect();
  console.log('Connected to DB.');

  const files = [
    'database/migrations/0087_drennia_district_map.sql',
    'database/migrations/0087_seed_drennia.sql',
  ];

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await client.query(sql);
    console.log(`  ✓ ${path.basename(file)}`);
  }

  await client.end();
  console.log('\nAll done. Tables created and seeded.');
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
