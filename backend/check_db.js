const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.gysrbluopckfbbhytmpe:yJk8y2zV503TjFm3@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => {
  client.query("SELECT pid, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state != 'idle'").then(res => {
    console.log(res.rows);
    process.exit(0);
  });
});
