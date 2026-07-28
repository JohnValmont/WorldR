const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query("SELECT world_year, world_month, count(*) FROM manufacturing_sales_results WHERE world_year > 6 GROUP BY world_year, world_month").then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
