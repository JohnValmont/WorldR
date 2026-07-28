import { Client } from 'pg';

const PROD_DB = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client(PROD_DB);
  await client.connect();

  console.log('=== Fixing NPC company names ===\n');

  // Rename ALL bankrupt NPC companies to [DISSOLVED] prefix so future spawns get clean names
  const bankruptNpcs = await client.query(`
    SELECT id, name, npc_personality FROM companies 
    WHERE is_npc = true AND status = 'bankrupt' AND name NOT LIKE '[DISSOLVED]%'
    ORDER BY name
  `);
  console.log(`Found ${bankruptNpcs.rows.length} bankrupt NPCs to rename:`);
  for (const r of bankruptNpcs.rows) {
    const newName = `[DISSOLVED] ${r.name}`;
    await client.query(`UPDATE companies SET name = $1, updated_at = now() WHERE id = $2`, [newName, r.id]);
    console.log(`  ${r.name} → ${newName}`);
  }

  // Also rename current "Valuecorp 7" → "Valuecorp" and "Apex Automobili 5" → "Apex Automobili"
  // since those suffixes were caused by the bug, not real respawns
  const cleanups: Record<string, string> = {
    'Valuecorp 7': 'Valuecorp',
    'Apex Automobili 5': 'Apex Automobili',
  };
  console.log('\nCleaning up current active NPC names:');
  for (const [oldName, newName] of Object.entries(cleanups)) {
    const res = await client.query(
      `UPDATE companies SET name = $1, updated_at = now() WHERE name = $2 AND is_npc = true AND status = 'active' RETURNING id`,
      [newName, oldName]
    );
    if (res.rowCount && res.rowCount > 0) {
      // Also rename their vehicle models
      await client.query(
        `UPDATE manufacturing_vehicle_models SET name = REPLACE(name, $1, $2), updated_at = now()
         WHERE company_id = $3`,
        [oldName, newName, res.rows[0].id]
      );
      // And factory names
      await client.query(
        `UPDATE manufacturing_factories SET name = REPLACE(name, $1, $2), updated_at = now()
         WHERE company_id = $3`,
        [oldName, newName, res.rows[0].id]
      );
      console.log(`  ✓ ${oldName} → ${newName} (+ models + factories)`);
    } else {
      console.log(`  (not found): ${oldName}`);
    }
  }

  // Final state
  const active = await client.query(`
    SELECT name, is_exchange_listed FROM companies WHERE is_npc = true AND status = 'active' ORDER BY name
  `);
  console.log('\nActive NPC companies now:');
  for (const r of active.rows) {
    console.log(`  ${r.name} | listed:${r.is_exchange_listed}`);
  }

  await client.end();
}

main().catch(console.error);
