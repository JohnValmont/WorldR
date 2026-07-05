import { db } from './src/config/database';

async function run() {
  const shares = await db('company_shares').select('*');
  console.log(shares);
  process.exit(0);
}
run();
