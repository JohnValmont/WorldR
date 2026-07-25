import { db } from './src/db/config';

async function main() {
  const companyId = 'da85639c-8f28-4abe-ab19-a51ae86128c0';
  const latestReport = await db('manufacturing_arc_reports')
    .where({ company_id: companyId })
    .orderBy('world_year', 'desc')
    .orderBy('world_month', 'desc')
    .first();
  console.log("Latest Report ID:", latestReport?.id, "Year:", latestReport?.world_year, "Month:", latestReport?.world_month);
  
  process.exit(0);
}
main();
