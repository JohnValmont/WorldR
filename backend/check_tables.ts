import { db } from './src/config/database';

async function run() {
  try {
    const tables = await db.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    console.log(tables.rows.map((r: any) => r.table_name).filter((t: string) => t.includes('manufacturing')));
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}
run();
