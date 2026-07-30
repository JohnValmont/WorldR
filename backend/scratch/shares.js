const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT * FROM company_shares WHERE company_id = 'd3af4635-d60c-4fce-a859-2c59fbfa1c38' OR company_id = (SELECT id FROM companies WHERE name = 'Aldrich Automobiles')")
    .then(res => {
      console.log('Shares:', res.rows);
      client.end();
    })
    .catch(console.error);
});
