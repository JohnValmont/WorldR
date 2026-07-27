import knex from 'knex';
import dotenv from 'dotenv';
dotenv.config();
const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });
async function run() {
  const tables = await db.raw('SELECT tablename FROM pg_tables WHERE schemaname=''public''');
  console.dir(tables.rows.map((r:any) => r.tablename).filter((t:string) => t.includes('arc') || t.includes('report') || t.includes('manuf')));
  process.exit(0);
}
run();
