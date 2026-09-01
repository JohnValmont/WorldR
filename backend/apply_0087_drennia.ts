import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// ts-node is called from the /backend dir so dotenv is available
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB = process.env.DATABASE_URL || '';

async function run() {
  if (!DB) {
    console.error('DATABASE_URL not set in backend/.env');
    process.exit(1);
  }

  const client = new Client({ connectionString: DB });
  await client.connect();
  console.log('Connected.');

  const migrations = [
    '../database/migrations/0087_drennia_district_map.sql',
    '../database/migrations/0087_seed_drennia.sql',
  ];

  for (const rel of migrations) {
    const file = path.resolve(__dirname, rel);
    console.log(`Applying ${path.basename(file)}...`);
    const sql = fs.readFileSync(file, 'utf8');
    await client.query(sql);
    console.log(`  ✓ done`);
  }

  await client.end();
  console.log('\n✅  Migration 0087 complete.');
}

run().catch(e => { console.error(e.message); process.exit(1); });
