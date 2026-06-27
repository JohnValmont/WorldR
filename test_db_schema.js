const knex = require('knex');
require('dotenv').config({ path: 'backend/.env' });

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL
});

async function run() {
  try {
    const tableInfo = await db.raw("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'manufacturing_vehicle_models'");
    console.log(tableInfo.rows);
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
