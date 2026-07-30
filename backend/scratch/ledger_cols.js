const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'company_ledger'")
    .then(res => {
      console.log('Columns:', res.rows.map(r => r.column_name));
      client.query("SELECT * FROM company_ledger l JOIN companies c ON l.company_id = c.id WHERE c.owner_character_id = 'e9f297c1-98bd-4e1f-b0a8-af70146aa48c' ORDER BY l.created_at DESC LIMIT 5")
        .then(res2 => {
          console.log(res2.rows.map(r => r.description + ' - ' + r.amount).join('\n'));
          client.end();
        });
    })
    .catch(console.error);
});
