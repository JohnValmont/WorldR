import { Client } from 'pg';
import * as path from 'path';

const PROD_DB = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client(PROD_DB);
  await client.connect();

  console.log('--- Checking live DB ---\n');

  // 1. Check brand_arc_results columns
  const colRes = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'manufacturing_market_brand_arc_results' ORDER BY ordinal_position
  `);
  console.log('brand_arc_results columns:', colRes.rows.map((r: any) => r.column_name).join(', '));

  // 2. Check world_year column presence specifically
  const hasWorldYear = colRes.rows.some((r: any) => r.column_name === 'world_year');
  console.log('Has world_year column:', hasWorldYear);

  // 3. All companies
  const companies = await client.query(`
    SELECT id, name, is_npc, is_exchange_listed, status FROM companies ORDER BY is_npc, name
  `);
  console.log('\nAll companies in DB:');
  for (const r of companies.rows) {
    console.log(`  [${r.status}] ${r.name} | npc:${r.is_npc} | listed:${r.is_exchange_listed}`);
  }

  // 4. World clock
  const clock = await client.query('SELECT current_year, current_month, status, next_arc_close_at FROM world_clock LIMIT 1');
  console.log('\nWorld clock:', clock.rows[0]);

  // 5. Apply migration 0083 if needed
  if (!hasWorldYear) {
    console.log('\nApplying migration 0083 (add world_year to brand_arc_results)...');
    try {
      await client.query(`
        ALTER TABLE manufacturing_market_brand_arc_results
          ADD COLUMN IF NOT EXISTS world_year INTEGER;

        UPDATE manufacturing_market_brand_arc_results
          SET world_year = 0
          WHERE world_year IS NULL;

        ALTER TABLE manufacturing_market_brand_arc_results
          ALTER COLUMN world_year SET NOT NULL;

        ALTER TABLE manufacturing_market_brand_arc_results
          ALTER COLUMN world_year SET DEFAULT 0;

        ALTER TABLE manufacturing_market_brand_arc_results
          DROP CONSTRAINT IF EXISTS unique_brand_arc_result;

        ALTER TABLE manufacturing_market_brand_arc_results
          ADD CONSTRAINT unique_brand_arc_result
          UNIQUE (company_id, region_market_id, world_year, world_month);
      `);
      console.log('Migration 0083 applied successfully!');
    } catch (e: any) {
      console.error('Migration 0083 failed:', e.message);
    }
  } else {
    console.log('\nMigration 0083 already applied. Skipping.');
  }

  await client.end();
}

main().catch(console.error);
