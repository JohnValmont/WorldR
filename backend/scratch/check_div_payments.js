const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT * FROM dividend_payments WHERE company_id = 'd84d37c9-4449-4d1c-a237-33ab7b3e7fba' ORDER BY paid_at DESC LIMIT 5")
    .then(res => {
      console.log('Dividend Payments for Auto:');
      console.table(res.rows);
      client.end();
    })
    .catch(console.error);
});
