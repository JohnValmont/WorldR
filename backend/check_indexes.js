const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.gysrbluopckfbbhytmpe:yJk8y2zV503TjFm3@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});
client.connect().then(async () => {
  const res = await client.query("SELECT indexname FROM pg_indexes WHERE tablename = 'manufacturing_sales_results'");
  console.log('INDEXES:', res.rows);
  client.end();
}).catch(e => console.log('DB ERROR:', e.message));
