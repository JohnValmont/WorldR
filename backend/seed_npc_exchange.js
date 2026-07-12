/**
 * Seed: NPC Exchange Listing
 * 
 * Marks active NPC companies as exchange-listed, seeds their cap table
 * (all 1,000,000 shares to system_npc), and writes an opening price bar
 * to share_price_history anchored at company_value / 1,000,000.
 * 
 * Safe to re-run — uses ON CONFLICT DO NOTHING.
 */
require('dotenv').config();
const knex = require('knex')({ client: 'pg', connection: process.env.DATABASE_URL });

const TOTAL_SHARES = 1_000_000;
const MAX_FLOAT_PCT = 0.30; // max 30% of shares can ever be publicly floated

async function main() {
  // 1. Get system_npc character
  const sysUser = await knex('users').where({ email: 'system_npc@worldr.game' }).first();
  if (!sysUser) { console.error('system_npc user not found — run NPC spawn first'); process.exit(1); }
  const sysChar = await knex('characters').where({ user_id: sysUser.id }).orderBy('created_at', 'asc').first();
  if (!sysChar) { console.error('system_npc character not found'); process.exit(1); }

  const clock = await knex('world_clock').first();
  const year = clock?.current_year ?? 1;
  const month = clock?.current_month ?? 1;

  // 2. Get all active NPC companies
  const npcCompanies = await knex('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.is_npc': true, 'c.status': 'active' })
    .select('c.id', 'c.name', 'f.company_value', 'f.last_arc_profit');

  console.log(`Found ${npcCompanies.length} NPC companies`);

  for (const co of npcCompanies) {
    const companyValue = Number(co.company_value) || 500_000;
    const sharePrice = Math.max(0.01, companyValue / TOTAL_SHARES);

    // 3. Mark as exchange-listed
    await knex('companies').where({ id: co.id }).update({ is_exchange_listed: true });

    // 4. Seed cap table — all shares to system_npc (treasury)
    const existing = await knex('company_shares').where({ company_id: co.id, holder_character_id: sysChar.id }).first();
    if (!existing) {
      await knex('company_shares').insert({
        company_id: co.id,
        holder_character_id: sysChar.id,
        shares: TOTAL_SHARES,
        avg_cost_basis: sharePrice,
      });
      console.log(`  [${co.name}] seeded ${TOTAL_SHARES.toLocaleString()} shares @ $${sharePrice.toFixed(4)}`);
    } else {
      console.log(`  [${co.name}] cap table already exists — skipping`);
    }

    // 5. Write opening price bar if not already present
    const existingBar = await knex('share_price_history').where({ company_id: co.id }).first();
    if (!existingBar) {
      const profit = Number(co.last_arc_profit) || 0;
      const eps = profit / TOTAL_SHARES;
      const pe = eps > 0 ? sharePrice / (eps * 12) : null;
      await knex('share_price_history').insert({
        company_id: co.id,
        game_year: year,
        game_month: month,
        open_price: sharePrice,
        high_price: sharePrice,
        low_price: sharePrice,
        close_price: sharePrice,
        volume_shares: 0,
        market_cap: sharePrice * TOTAL_SHARES,
        eps,
        pe_ratio: pe != null ? Number(pe.toFixed(2)) : null,
        analyst_estimate: profit,
        profit_surprise_pct: 0,
      });
      console.log(`  [${co.name}] opening price bar written: $${sharePrice.toFixed(4)}`);
    } else {
      console.log(`  [${co.name}] price history already exists — skipping`);
    }
  }

  console.log('\nDone. All NPC companies are now exchange-listed.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
