const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'manufacturing_sales_results' AND column_name = 'world_year'").then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
