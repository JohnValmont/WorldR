const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    .then(res => {
      console.log('Tables:', res.rows.map(r => r.table_name));
      client.end();
    })
    .catch(console.error);
});
