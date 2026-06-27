const { Client } = require('pg'); 
const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'); 
client.connect().then(async () => { 
  await client.query("UPDATE manufacturing_vehicle_models SET development_completes_at_arc = 1, development_completes_at_orbit = 1 WHERE development_status = 'in_development'"); 
  console.log('DB Updated'); 
  client.end(); 
});
