const { db } = require('./src/config/database');
async function run() {
  try {
    const cols = await db.raw(`SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name IN ('companies', 'company_finances', 'manufacturing_vehicle_models')`);
    console.log(cols.rows);
  } finally {
    db.destroy();
  }
}
run();
