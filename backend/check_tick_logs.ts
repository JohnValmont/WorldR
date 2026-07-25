import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM world_tick_logs ORDER BY created_at DESC LIMIT 5");
    console.log("LATEST TICK LOGS:");
    res.rows.forEach(r => console.log(r));

    const instances = await client.query("SELECT id, status FROM world_instances WHERE status = 'active'");
    console.log("ACTIVE INSTANCES:", instances.rows);

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
