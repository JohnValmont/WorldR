import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const PROD_DB = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client(PROD_DB);
  await client.connect();

  const sql = fs.readFileSync(
    path.join('backend', 'database', 'migrations', '0055_acquisition_auctions.sql'),
    'utf-8'
  );

  console.log('Applying migration 0055: Acquisition Auctions...');
  await client.query(sql);
  console.log('✓ Migration applied successfully.');

  // Verify tables
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('company_acquisitions', 'company_acquisition_bids')
    ORDER BY table_name
  `);
  console.log('Tables created:', tables.rows.map((r: any) => r.table_name));

  await client.end();
}

main().catch(console.error);
