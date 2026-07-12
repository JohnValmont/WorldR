/**
 * Update NPC share counts to realistic scale:
 * - Top 2 (HaulPro, Veridian): 20,000,000 shares
 * - Others (Apex, Valuecorp):  10,000,000 shares
 * 
 * Also recalculates opening price bar accordingly.
 * Safe to re-run.
 */
require('dotenv').config();
const knex = require('knex')({ client: 'pg', connection: process.env.DATABASE_URL });

const SHARE_COUNTS = {
  '0a8c0f0b-23aa-4692-b4b3-89b08784174b': 20_000_000, // Veridian Motors
  'f36169fb-78b6-41af-b234-969193c68e5c': 20_000_000, // HaulPro
  'd2949b6c-a552-435b-b93a-09684b0760c6': 10_000_000, // Apex Automobili
  '00d99945-0731-428a-997f-f26626fc8722': 10_000_000, // Valuecorp
};

async function main() {
  const sysUser = await knex('users').where({ email: 'system_npc@worldr.game' }).first();
  const sysChar = await knex('characters').where({ user_id: sysUser.id }).orderBy('created_at', 'asc').first();

  const npcCompanies = await knex('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.is_npc': true, 'c.status': 'active' })
    .select('c.id', 'c.name', 'f.company_value', 'f.last_arc_profit');

  for (const co of npcCompanies) {
    const totalShares = SHARE_COUNTS[co.id];
    if (!totalShares) { console.log(`  [${co.name}] no share count defined — skipping`); continue; }

    const companyValue = Number(co.company_value) || 1_000_000;
    const sharePrice   = Math.round((companyValue / totalShares) * 10000) / 10000;

    // 1. Update treasury holding in company_shares
    await knex('company_shares')
      .where({ company_id: co.id, holder_character_id: sysChar.id })
      .update({ shares: totalShares, avg_cost_basis: sharePrice });

    // 2. Wipe all price history and rewrite the opening bar at the correct price
    await knex('share_price_history').where({ company_id: co.id }).delete();
    const clock = await knex('world_clock').first();
    const profit = Number(co.last_arc_profit) || 0;
    const eps    = profit / totalShares;
    const pe     = eps > 0 ? sharePrice / (eps * 12) : null;
    await knex('share_price_history').insert({
      company_id:          co.id,
      game_year:           clock?.current_year ?? 1,
      game_month:          clock?.current_month ?? 1,
      open_price:          sharePrice,
      high_price:          sharePrice,
      low_price:           sharePrice,
      close_price:         sharePrice,
      volume_shares:       0,
      market_cap:          sharePrice * totalShares,
      eps,
      pe_ratio:            pe != null ? Number(pe.toFixed(2)) : null,
      analyst_estimate:    profit,
      profit_surprise_pct: 0,
    });

    // 3. Cancel any stale share orders from the old 1M era
    await knex('share_orders')
      .where({ company_id: co.id, status: 'open' })
      .update({ status: 'cancelled' });

    console.log(`  [${co.name}] → ${(totalShares/1_000_000).toFixed(0)}M shares @ $${sharePrice.toFixed(4)} | mktcap $${(sharePrice * totalShares / 1_000_000).toFixed(2)}M`);
  }

  console.log('\nDone.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
