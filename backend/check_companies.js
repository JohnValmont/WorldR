const { db } = require('./src/config/database');
async function run() {
  try {
    const cols = await db.raw(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies'`);
    console.log(cols.rows);
  } finally {
    db.destroy();
  }
}
run();
