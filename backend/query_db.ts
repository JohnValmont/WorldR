import { db } from './src/database/db';

async function run() {
  try {
    const clock = await db('world_clock').first();
    console.log('CLOCK:', clock);

    // Let's also check the last reports for Y9
    const reports = await db('manufacturing_arc_reports').where({ world_year: 9 }).orderBy('world_month', 'desc').limit(5);
    console.log('REPORTS:', reports.map(r => ({ y: r.world_year, m: r.world_month, comp: r.company_id })));
    
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
