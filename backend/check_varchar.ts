import { db } from './src/config/database';

async function run() {
  try {
    const columns = await db.raw(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'manufacturing_vehicle_models'
        AND data_type = 'character varying'
        AND character_maximum_length = 100
    `);
    console.log(JSON.stringify(columns.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}
run();
