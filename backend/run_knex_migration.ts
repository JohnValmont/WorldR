import { db } from './src/config/database';
import * as fs from 'fs';

async function run() {
  const sql = fs.readFileSync('d:/WorldR/backend/database/migrations/0018_fix_character_unique_constraint.sql', 'utf-8');
  await db.raw(sql);
  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);