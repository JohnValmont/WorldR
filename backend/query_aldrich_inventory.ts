import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const compId = 'd84d37c9-4449-4d1c-a237-33ab7b3e7fba';
    const inv = await client.query(`SELECT * FROM manufacturing_inventory WHERE company_id = $1`, [compId]);
    console.log(inv.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
