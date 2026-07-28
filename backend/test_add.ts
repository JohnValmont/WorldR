import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE manufacturing_market_brand_arc_results ADD COLUMN world_year INTEGER`);
    console.log("Column added successfully!");
  } catch(e) {
    console.error("Failed:", e);
  } finally {
    await client.end();
  }
}

main();
