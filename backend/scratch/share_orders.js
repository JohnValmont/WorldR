const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT * FROM share_orders WHERE character_id = 'e9f297c1-98bd-4e1f-b0a8-af70146aa48c'")
    .then(res => {
      console.log('Share Orders:', res.rows);
      client.end();
    })
    .catch(console.error);
});
