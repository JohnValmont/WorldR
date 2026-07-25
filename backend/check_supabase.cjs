const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => client.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'manufacturing_vehicle_models' AND character_maximum_length <= 100;")).then(res => { console.table(res.rows); client.end(); }).catch(console.error);
