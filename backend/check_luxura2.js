const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query("SELECT name FROM manufacturing_vehicle_models WHERE name LIKE 'Luxura%'").then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
