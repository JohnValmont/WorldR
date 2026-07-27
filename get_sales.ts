import { db } from './backend/src/api/lib/db';
async function run() {
  const reports = await db('manufacturing_arc_reports')
    .orderBy([
      { column: 'world_year', order: 'desc' },
      { column: 'world_month', order: 'desc' }
    ])
    .limit(10);
  console.log(reports);
  process.exit(0);
}
run();
