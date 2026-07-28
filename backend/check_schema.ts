import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  await client.connect();

  // Check columns on brand arc results table
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'manufacturing_market_brand_arc_results' 
    ORDER BY ordinal_position
  `);
  console.log('brand_arc_results columns:', colRes.rows.map((r: any) => r.column_name));

  // Check how many companies have is_exchange_listed = true
  const exRes = await client.query(`SELECT count(*) FROM companies WHERE is_exchange_listed = true`);
  console.log('Exchange listed companies:', exRes.rows[0]);

  // Check all companies
  const allRes = await client.query(`SELECT id, name, is_npc, is_exchange_listed, status FROM companies WHERE status = 'active' ORDER BY is_npc, name`);
  console.log('All active companies:');
  for (const r of allRes.rows) {
    console.log(`  ${r.name} | npc:${r.is_npc} | listed:${r.is_exchange_listed}`);
  }

  await client.end();
}

check().catch(console.error);
