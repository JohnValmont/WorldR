const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT * FROM _aldrich_10m_patch LIMIT 5")
    .then(res => {
      console.log(res.rows);
      client.end();
    })
    .catch(console.error);
});
