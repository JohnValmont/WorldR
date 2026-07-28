/**
 * backfill_npc_shares.ts
 * 
 * For every active, exchange-listed NPC company that has NO company_shares row
 * for its System NPC character, create one with the correct remaining shares
 * (1,000,000 - sum of all player-held shares).
 * 
 * This fixes the cap-table denominator bug that caused all percentages to be > 100%.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import knex from 'knex';

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL, acquireConnectionTimeout: 10000 });

const TOTAL_SHARES = 1_000_000;

async function main() {
  // Find all active, listed NPC companies
  const npcCompanies = await db('companies')
    .where({ is_npc: true, status: 'active', is_exchange_listed: true })
    .select('id', 'name', 'owner_character_id');
  
  console.log(`Found ${npcCompanies.length} active, listed NPC companies`);

  for (const co of npcCompanies) {
    // Sum all shares in company_shares for this company
    const sumRow = await db('company_shares')
      .where({ company_id: co.id })
      .sum('shares as total')
      .first();
    const playerHeld = Number(sumRow?.total ?? 0);

    // Check if System NPC already has a row
    const npcRow = await db('company_shares')
      .where({ company_id: co.id, holder_character_id: co.owner_character_id })
      .first();

    const npcShares = Math.max(0, TOTAL_SHARES - playerHeld);

    if (npcRow) {
      console.log(`✓ ${co.name}: NPC row exists with ${Number(npcRow.shares).toLocaleString()} shares (player held: ${playerHeld.toLocaleString()})`);
      // Fix if the NPC row + playerHeld doesn't add to TOTAL_SHARES
      const expectedNpcShares = Math.max(0, TOTAL_SHARES - (playerHeld - Number(npcRow.shares)));
      if (Number(npcRow.shares) !== expectedNpcShares) {
        console.log(`  → Correcting NPC shares to ${expectedNpcShares.toLocaleString()}`);
        await db('company_shares')
          .where({ company_id: co.id, holder_character_id: co.owner_character_id })
          .update({ shares: expectedNpcShares, updated_at: new Date() });
      }
    } else {
      console.log(`✗ ${co.name}: NPC has NO row. Player-held: ${playerHeld.toLocaleString()}. Seeding NPC row with ${npcShares.toLocaleString()} shares`);
      await db('company_shares').insert({
        company_id: co.id,
        holder_character_id: co.owner_character_id,
        shares: npcShares,
        avg_cost_basis: 0,
      });
      console.log(`  → Inserted NPC share row`);
    }
  }

  // Verify cap-tables now add to TOTAL_SHARES
  console.log('\n=== Verification ===');
  for (const co of npcCompanies) {
    const rows = await db('company_shares as s')
      .leftJoin('characters as ch', 'ch.id', 's.holder_character_id')
      .leftJoin('companies as hco', 'hco.id', 's.holder_company_id')
      .where({ 's.company_id': co.id })
      .where('s.shares', '>', 0)
      .select(db.raw(`COALESCE(ch.name, hco.name) as holder_name`), 's.shares');
    
    const total = rows.reduce((s: number, h: any) => s + Number(h.shares), 0);
    const pct = (total / TOTAL_SHARES * 100).toFixed(1);
    console.log(`${co.name}: ${total.toLocaleString()} / ${TOTAL_SHARES.toLocaleString()} (${pct}%)`);
    for (const r of rows) {
      const p = (Number(r.shares) / TOTAL_SHARES * 100).toFixed(1);
      console.log(`  ${(r.holder_name ?? 'NULL').padEnd(35)} | ${Number(r.shares).toLocaleString().padStart(10)} (${p}%)`);
    }
  }

  await db.destroy();
  console.log('\nDone.');
}
main().catch(e => { console.error(e.message); process.exit(1); });
