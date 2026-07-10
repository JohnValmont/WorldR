import { db } from './src/config/database';

async function check() {
  const res = await db.raw("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%company%'");
  console.log(res.rows);
  process.exit(0);
}
check();
