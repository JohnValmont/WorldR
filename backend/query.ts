import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const userId = '2607039';
    const charId = '096a7184-0eb3-4ef4-ac69-8d113525b14e';
    
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables available:', tables.join(', '));
    
    if (tables.includes('companies')) {
      const companies = await client.query("SELECT * FROM companies WHERE owner_character_id = $1", [charId]);
      console.log('\n--- COMPANIES OWNED ---');
      console.log(companies.rows);
      
      for (const comp of companies.rows) {
        if (tables.includes('company_finances')) {
          const finances = await client.query("SELECT * FROM company_finances WHERE company_id = $1", [comp.id]);
          console.log('\n--- FINANCES for', comp.name, '---');
          console.log(finances.rows);
        }
        
        if (tables.includes('financial_transactions')) {
          const txs = await client.query("SELECT * FROM financial_transactions WHERE from_account_id = $1 OR to_account_id = $1 ORDER BY created_at DESC LIMIT 10", [comp.id]);
          console.log('\n--- TRANSACTIONS for', comp.name, '---');
          console.log(txs.rows);
        }
        
        if (tables.includes('manufacturing_factories')) {
           const factories = await client.query("SELECT * FROM manufacturing_factories WHERE company_id = $1", [comp.id]);
           console.log('\n--- FACTORIES for', comp.name, '---');
           console.log(factories.rows);
        }
      }
    }
    
    if (tables.includes('financial_transactions')) {
      const txs = await client.query("SELECT * FROM financial_transactions WHERE from_account_id = $1 OR to_account_id = $1 ORDER BY created_at DESC LIMIT 10", [charId]);
      console.log('\n--- TRANSACTIONS for Character ---');
      console.log(txs.rows);
    }

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

main();
