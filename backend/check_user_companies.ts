import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT 
        c.id as company_id,
        c.name as company_name,
        cf.available_cash,
        cf.company_value,
        bal.principal_amount,
        bal.facility_type
      FROM companies c
      JOIN company_finances cf ON c.id = cf.company_id
      LEFT JOIN banking_active_loans bal ON c.id::text = bal.borrower_id::text
      ORDER BY c.created_at DESC
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
