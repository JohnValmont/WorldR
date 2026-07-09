process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg'); 
const client = new Client({ 
  connectionString: 'postgresql://postgres.gysrbluopckfbbhytmpe:yJk8y2zV503TjFm3@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require', 
  ssl: { rejectUnauthorized: false } 
}); 
client.connect().then(() => client.query('SELECT * FROM world_clock')).then(res => { console.log(res.rows); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
