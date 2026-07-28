const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query(`SELECT s.name as state_name, c.polling_arc, c.phase, c.start_arc, c.status FROM pol_cycles c JOIN pol_states s ON c.state_id = s.id`)
  .then(res => { console.table(res.rows); pool.end(); })
  .catch(console.error);
