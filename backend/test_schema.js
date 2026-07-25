const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/WorldR/backend/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'pol_parties'").then(res => { console.log(res.rows); pool.end(); });
