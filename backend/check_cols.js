const { db } = require('./src/config/database');
async function run() {
  try {
    const cols = await db.raw(`SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('company_id', 'character_id', 'owner_character_id') AND table_schema = 'public'`);
    console.log(cols.rows);
  } finally {
    db.destroy();
  }
}
run();
