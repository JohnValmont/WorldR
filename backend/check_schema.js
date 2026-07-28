const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query(`SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'manufacturing_market_allocations' AND column_name = 'id'`).then(res => { console.table(res.rows); pool.end(); });
