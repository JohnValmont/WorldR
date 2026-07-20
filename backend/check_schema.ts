import { db } from './src/api/config/db';

async function main() {
  const lines = await db.raw('SELECT column_name FROM information_schema.columns WHERE table_name = ?', ['manufacturing_production_lines']);
  console.log('Production lines:', lines.rows.map((r: any) => r.column_name));

  process.exit(0);
}
main().catch(console.error);
