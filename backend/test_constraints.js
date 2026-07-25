const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/WorldR/backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT constraint_name, table_name, column_name FROM information_schema.key_column_usage WHERE table_name = 'pol_legacy_records'").then(res => { console.log(res.rows); pool.end(); });
