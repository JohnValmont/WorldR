const { db } = require('../src/config/database');

async function run() {
  const charCols = await db.raw("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'characters'");
  console.log('CHARACTERS:', charCols.rows);

  const compCols = await db.raw("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'companies'");
  console.log('COMPANIES:', compCols.rows);
  
  process.exit(0);
}
run();
