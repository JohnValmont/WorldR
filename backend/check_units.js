const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query("SELECT world_year, world_month, count(*), sum(units_sold) FROM manufacturing_sales_results GROUP BY world_year, world_month ORDER BY world_year DESC, world_month DESC LIMIT 5").then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
