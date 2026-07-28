import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT * FROM schema_migrations ORDER BY name DESC LIMIT 10;
    `);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
