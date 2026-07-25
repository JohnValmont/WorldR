import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'company_debt_facilities'
      );
    `);
    console.log("company_debt_facilities exists:", res.rows[0].exists);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
