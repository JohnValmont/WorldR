import { db } from './src/config/database';

async function main() {
  const policies = await db.raw('SELECT * FROM dividend_policies');
  console.log(policies.rows);
  
  const shares = await db.raw('SELECT * FROM company_shares LIMIT 5');
  console.log('shares', shares.rows);
  process.exit(0);
}
main();
