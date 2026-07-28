const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
pool.query("SELECT id, name, created_at, status FROM characters WHERE name = 'Aldric Varn'").then(res => { console.table(res.rows); pool.end(); }).catch(console.error);
