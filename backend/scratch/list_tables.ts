import { db } from './src/config/database';
async function main() {
  const res = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  console.log(res.rows.map((r: any) => r.tablename));
  process.exit(0);
}
main();
