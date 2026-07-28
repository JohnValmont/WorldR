const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query(`
  SELECT c.name, c.is_npc, count(r.id) as sales_count, sum(r.units_sold) as total_units
  FROM manufacturing_sales_results r
  JOIN companies c ON c.id = r.company_id
  WHERE r.world_year = 6 AND r.world_month = 11
  GROUP BY c.name, c.is_npc
`).then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
