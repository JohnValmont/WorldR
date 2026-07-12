const knex = require('knex');
const config = require('./knexfile');
const db = knex(config.development);

async function run() {
  try {
    const res = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturing_engineering_programmes'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
