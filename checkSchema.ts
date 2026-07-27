require('ts-node').register();
const db = require('./backend/src/config/database').db;
db.raw("SELECT table_name, column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name IN ('manufacturing_production_lines', 'manufacturing_market_allocations')").then((res: any) => {
  const notNulls = res.rows.filter((r: any) => r.is_nullable === 'NO' && r.column_default === null);
  console.log(notNulls);
}).finally(() => process.exit(0));
