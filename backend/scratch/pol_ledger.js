const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT * FROM pol_ledger_events WHERE payer_character_id = 'e9f297c1-98bd-4e1f-b0a8-af70146aa48c' ORDER BY created_at DESC LIMIT 10")
    .then(res => {
      console.log('Pol Ledger Events:');
      console.table(res.rows);
      client.end();
    })
    .catch(console.error);
});
