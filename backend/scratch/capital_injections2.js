const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  client.query("SELECT l.entry_type, l.amount, l.description, l.created_at FROM company_ledger l JOIN companies c ON l.company_id = c.id WHERE c.owner_character_id = 'e9f297c1-98bd-4e1f-b0a8-af70146aa48c' AND l.amount > 0 AND (l.description ILIKE '%capital%' OR l.description ILIKE '%equity%' OR l.description ILIKE '%inject%') ORDER BY l.created_at DESC LIMIT 10")
    .then(res => {
      console.log('Capital Injections:');
      console.table(res.rows);
      client.end();
    })
    .catch(console.error);
});
