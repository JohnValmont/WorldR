const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query(`
  SELECT r.world_year, r.world_month, sum(r.units_sold) as total_sold
  FROM manufacturing_sales_results r
  JOIN manufacturing_vehicle_models m ON m.id = r.vehicle_model_id
  WHERE m.name = 'Luxura Grand V8'
  GROUP BY r.world_year, r.world_month
`).then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
