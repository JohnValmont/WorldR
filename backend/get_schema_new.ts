import { db } from './src/config/database';

async function run() {
  const columns = await db.raw(`
    SELECT column_name, data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'manufacturing_vehicle_models'
  `);
  console.log(JSON.stringify(columns.rows, null, 2));
  
  if (columns.rows.length === 0) {
     const tables = await db.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
     console.log(tables.rows.map((r: any) => r.table_name).filter((t: string) => t.includes('manufacturing')));
  }
  await db.destroy();
}
run();
