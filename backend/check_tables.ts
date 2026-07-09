import { db } from './src/config/database';

async function run() {
  const res = await db.raw('SELECT tablename FROM pg_tables WHERE tablename LIKE ''company%''');
  console.log(res.rows);
  process.exit(0);
}

run().catch(console.error);