const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query("SELECT world_year, world_month FROM manufacturing_sales_results ORDER BY world_year DESC, world_month DESC LIMIT 1").then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
