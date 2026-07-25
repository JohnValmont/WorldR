const { db } = require('./src/config/database');
async function test() {
  const r = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manufacturing_sales_results'");
  console.log(r.rows);
  process.exit(0);
}
test();
