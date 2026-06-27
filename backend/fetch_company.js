const { Client } = require('pg'); 
const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'); 
client.connect().then(async () => { 
  const res = await client.query("SELECT company_id FROM manufacturing_vehicle_models WHERE name = 'Arc Test Model 1'");
  console.log('Company ID:', res.rows[0].company_id); 
  
  // Actually, I'll just update the status directly so we can test the UI first.
  await client.query("UPDATE manufacturing_vehicle_models SET development_status = 'ready_to_launch' WHERE name = 'Arc Test Model 1'");
  console.log('Status updated to ready_to_launch');
  
  client.end(); 
});
