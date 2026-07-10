import { db } from './src/config/database';

async function check() {
  const records = await db('company_records').orderBy('created_at', 'desc').limit(10);
  console.log(records);
  process.exit(0);
}
check();
