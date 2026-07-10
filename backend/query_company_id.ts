import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const comp = await client.query(`SELECT id, name FROM companies WHERE name ILIKE '%aldrich%'`);
    console.log(comp.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
