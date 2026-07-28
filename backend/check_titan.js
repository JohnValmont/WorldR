const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query(`
  SELECT m.name as model_name, c.name as company_name, c.is_npc
  FROM manufacturing_vehicle_models m
  JOIN companies c ON c.id = m.company_id
  WHERE m.name LIKE '%Titan-C1%'
  ORDER BY m.created_at ASC
`).then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
