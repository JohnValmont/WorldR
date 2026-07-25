const { db } = require('./src/config/database');
async function run() {
  try {
    const cols = await db.raw(`SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'UNIQUE' AND table_name IN ('characters', 'companies')`);
    console.log(cols.rows);
  } finally {
    db.destroy();
  }
}
run();
