import { db } from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/0054_gearcity_logistics.sql'), 'utf8');
  try {
    await db.raw(sql);
    console.log('Migration 0054 applied successfully via Knex');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
