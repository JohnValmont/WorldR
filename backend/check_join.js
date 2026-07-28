const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query(`
  SELECT r.world_year, r.world_month, m.id as model_id, m.name as model_name, c.name as company_name, sum(r.units_sold) as total_sold
  FROM manufacturing_sales_results r
  JOIN manufacturing_vehicle_models m ON m.id = r.vehicle_model_id
  JOIN companies c ON c.id = m.company_id
  WHERE r.world_year = 6 AND r.world_month = 11
  GROUP BY r.world_year, r.world_month, m.id, m.name, c.name
  HAVING sum(r.units_sold) > 0
  ORDER BY sum(r.units_sold) DESC
  LIMIT 5
`).then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
