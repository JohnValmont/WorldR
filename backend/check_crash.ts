import { Client } from 'pg';
import { runWorldTick } from './src/api/services/worldTick.service'; // I will just run a minimal manual test

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const clockRes = await client.query(`SELECT * FROM world_clock WHERE world_instance_id = 'prod-world-1'`);
    const clock = clockRes.rows[0];
    
    console.log("Current Clock:", clock.current_year, clock.current_month);
    
    // I can't easily require the whole backend without setting up the environment.
    // Let me just look at the Render logs!
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
