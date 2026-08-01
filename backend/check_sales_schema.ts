import { db } from './src/config/database';

async function main() {
  const indexes = await db.raw(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'dividend_policies';
  `);
  console.log(indexes.rows);
  process.exit(0);
}
main();
