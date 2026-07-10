import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const compId = 'da85639c-8f28-4abe-ab19-a51ae86128c0';
    const inv = await client.query(`SELECT * FROM manufacturing_inventory WHERE company_id = $1`, [compId]);
    console.log(inv.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
