import { db } from './src/config/database';

async function main() {
  const auto = await db('companies').where('name', 'like', '%Aldrich Automobiles%').first();
  if (!auto) return console.log('auto not found');
  
  const payments = await db('dividend_payments').where({ company_id: auto.id });
  console.log(`Found ${payments.length} dividend payments from Aldrich Automobiles.`);
  
  for (const p of payments) {
    console.log(`Year ${p.game_year} Month ${p.game_month} | Holder Char: ${p.holder_character_id} | Holder Co: ${p.holder_company_id} | Amount: $${p.amount}`);
  }
  process.exit(0);
}
main();
