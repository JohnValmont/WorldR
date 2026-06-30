import { db } from '../src/config/database';

async function run() {
  try {
    const res = await db.raw(`SELECT column_name FROM information_schema.columns WHERE table_name='manufacturing_vehicle_models' ORDER BY 1;`);
    console.log(res.rows.map((r: any) => r.column_name).join('\n'));
  } finally {
    db.destroy();
  }
}
run();
