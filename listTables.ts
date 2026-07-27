require('ts-node').register();
const db = require('./backend/src/config/database').db;
db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then((res: any) => {
  console.log(res.rows.map((r: any) => r.table_name));
}).finally(() => process.exit(0));
