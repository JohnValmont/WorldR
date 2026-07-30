const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT * FROM dividend_policies WHERE company_id = 'd3af4635-d60c-4fce-a859-2c59fbfa1c38'")
    .then(res => {
      console.log('Dividend Policies:');
      console.table(res.rows);
      client.end();
    })
    .catch(console.error);
});
