/**
 * Set premium anchor prices for NPC companies.
 * Top 2 (HaulPro, Veridian): premium range ~$40-45
 * Medium (Apex, Valuecorp): mid range ~$14-19
 * After this, price floats freely with monthly earnings.
 */
require('dotenv').config();
const knex = require('knex')({ client: 'pg', connection: process.env.DATABASE_URL });

const PRICES = {
  '0a8c0f0b-23aa-4692-b4b3-89b08784174b': { name: 'Veridian Motors', price: 38.50, shares: 20_000_000 },
  'f36169fb-78b6-41af-b234-969193c68e5c': { name: 'HaulPro',         price: 44.00, shares: 20_000_000 },
  'd2949b6c-a552-435b-b93a-09684b0760c6': { name: 'Apex Automobili', price: 18.50, shares: 10_000_000 },
  '00d99945-0731-428a-997f-f26626fc8722': { name: 'Valuecorp',       price: 13.75, shares: 10_000_000 },
};

async function main() {
  const clock = await knex('world_clock').first();
  const year  = clock?.current_year  ?? 1;
  const month = clock?.current_month ?? 1;

  for (const [id, cfg] of Object.entries(PRICES)) {
    const { name, price, shares } = cfg;
    const marketCap = price * shares;

    // Update opening price bar
    await knex('share_price_history')
      .where({ company_id: id })
      .update({
        open_price:   price,
        high_price:   price,
        low_price:    price,
        close_price:  price,
        market_cap:   marketCap,
      });

    // Update avg_cost_basis on treasury holding
    await knex('company_shares')
      .where({ company_id: id })
      .update({ avg_cost_basis: price });

    // Also set company_value to reflect market cap (so P/B isn't absurd in UI)
    await knex('company_finances')
      .where({ company_id: id })
      .update({ company_value: marketCap });

    const mktCapStr = marketCap >= 1_000_000_000
      ? `$${(marketCap / 1_000_000_000).toFixed(2)}B`
      : `$${(marketCap / 1_000_000).toFixed(1)}M`;

    console.log(`  [${name}] $${price.toFixed(2)}/share × ${(shares/1_000_000).toFixed(0)}M = ${mktCapStr} mktcap`);
  }

  // Cancel all stale NPC open orders so new MM quotes at correct price are placed next tick
  await knex('share_orders')
    .whereIn('company_id', Object.keys(PRICES))
    .where({ status: 'open' })
    .update({ status: 'cancelled' });

  console.log('\nStale orders cancelled. Done.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
