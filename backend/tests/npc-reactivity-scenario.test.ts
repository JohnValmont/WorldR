/**
 * NPC reactivity, end to end: when a cheaper, better competitor enters its
 * segment, the incumbent budget NPC (Valuecorp) answers with a lower price.
 *
 * Months 1-3: a player car maker exists but builds and offers nothing, so
 * Valuecorp trades on its own. Month 4: the player sells a better budget car at
 * UNDERCUT x Valuecorp's price, with national marketing and full brand
 * awareness in Valuecorp's market.
 *
 * Timing: an NPC decides its price at the START of a month from the previous
 * months' sales (npcBrain.runNpcBrainForCompany). Its month-4 price was set
 * before the competitor sold anything; its month-5 price is the first one that
 * can react. So the test compares the price Valuecorp actually charged in
 * month 5 with month 4 (manufacturing_sales_results.sale_price, weighted by
 * units), across all its models: Valuecorp may answer with a Rule B1 price cut
 * or by copying the player's car at the player's price (industrial espionage,
 * which retires its own model). Either is a reaction; holding or raising the
 * price is not. Rule B1's own arithmetic is unit-tested in npc-brain.test.ts.
 *
 * SAFETY: runs on its own throwaway database (tests/helpers/scratchDatabase.ts)
 * on a LOCAL Postgres; skipped when none is reachable. Nothing in the
 * developer's database is read or changed.
 */
import * as assert from 'node:assert';
import { test } from 'node:test';
import type { Knex } from 'knex';
import { withScratchDatabase, quietly } from './helpers/scratchDatabase';
import { clockAt, insertPlayerCarMaker, processMonth } from './helpers/monthRunner';

/** The competitor's first selling month. */
const ENTRY_MONTH = 4;
/** Cars a month the competitor builds and offers once it enters (far above Valuecorp's 500-car factory). */
const COMPETITOR_UNITS = 5000;
/** The competitor's price as a share of Valuecorp's price when it enters. */
const UNDERCUT = 0.7;

interface CompanyMonth { month: number; sold: number; avgPrice: number; models: string }

/** What a company sold in month i and the units-weighted price it actually charged. */
async function companyMonth(db: Knex, companyId: string, i: number): Promise<CompanyMonth> {
  const { year, month } = clockAt(i);
  const rows = await db('manufacturing_sales_results as r')
    .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
    .where({ 'r.company_id': companyId, 'r.world_year': year, 'r.world_month': month })
    .select('r.units_sold', 'r.sale_price', 'm.name');
  const sold = rows.reduce((s: number, r: any) => s + Number(r.units_sold), 0);
  const revenueAtListPrice = rows.reduce((s: number, r: any) => s + Number(r.units_sold) * Number(r.sale_price), 0);
  const models = [...new Set(rows.filter((r: any) => Number(r.units_sold) > 0).map((r: any) => r.name))].join(', ');
  return { month: i, sold, avgPrice: sold > 0 ? revenueAtListPrice / sold : 0, models };
}

test('Valuecorp answers a cheaper, better competitor with a lower price', { timeout: 300_000 }, async (t) => {
  await withScratchDatabase(t, 'npc_reactivity', async (db) => {
    const valuecorp = await db('companies').where({ name: 'Valuecorp', country_id: 'drennia', is_npc: true }).first();
    assert.ok(valuecorp, 'the seeded world has Valuecorp in Drennia');
    const valuecorpModels = await db('manufacturing_vehicle_models').where({ company_id: valuecorp.id, status: 'active' });
    assert.strictEqual(valuecorpModels.length, 1, 'Valuecorp starts with one model');
    const valuecorpAlloc = await db('manufacturing_market_allocations').where({ vehicle_model_id: valuecorpModels[0].id }).first();
    assert.ok(valuecorpAlloc, 'Valuecorp sells in a Drennia market');
    const marketId = valuecorpAlloc.region_market_id;

    // The competitor exists from month 1 but plans and offers no cars yet.
    const player = await insertPlayerCarMaker(db, {
      model: {
        vehicle_class: 'Compact Car', target_segment: 'Budget', sale_price: 100_000, manufacturing_cost_per_unit: 10_000,
        reliability_score: 95, performance_score: 95, fuel_efficiency_score: 95, appeal_score: 95, cargo_score: 95, safety_score: 95,
      },
      factoryCapacity: COMPETITOR_UNITS, lineTarget: 0, marketId, marketingTier: 'national', cash: 1_000_000_000,
    });
    await db('company_staff').insert([
      { company_id: player.companyId, role: 'factory-worker', quantity: 5000 },
      { company_id: player.companyId, role: 'production-supervisor', quantity: 50 },
      { company_id: player.companyId, role: 'sales-manager', quantity: 50 },
    ]);

    const valuecorpHistory: CompanyMonth[] = [];
    const playerHistory: CompanyMonth[] = [];
    const runMonth = async (i: number) => {
      await quietly(() => processMonth(db, player.companyId, i));
      valuecorpHistory.push(await companyMonth(db, valuecorp.id, i));
      playerHistory.push(await companyMonth(db, player.companyId, i));
    };

    for (let i = 1; i < ENTRY_MONTH; i++) await runMonth(i);

    // The competitor enters: cheaper than Valuecorp, a better car, fully known in Valuecorp's market.
    const valuecorpPriceNow = Number((await db('manufacturing_vehicle_models').where({ company_id: valuecorp.id, status: 'active' }).min({ p: 'sale_price' }).first())?.p);
    await db('manufacturing_vehicle_models').where({ id: player.modelId }).update({ sale_price: Math.round(valuecorpPriceNow * UNDERCUT) });
    await db('manufacturing_production_lines').where({ id: player.lineId }).update({ target_units_per_month: COMPETITOR_UNITS });
    await db('manufacturing_market_allocations').where({ vehicle_model_id: player.modelId }).update({ units_allocated: COMPETITOR_UNITS });
    await db('manufacturing_brand_awareness')
      .insert({ company_id: player.companyId, region_market_id: marketId, awareness: 100, reputation: 100 })
      .onConflict(['company_id', 'region_market_id']).merge();

    await runMonth(ENTRY_MONTH);      // Valuecorp's price here was set before it saw the competitor
    await runMonth(ENTRY_MONTH + 1);  // its first price that can react

    console.info('Valuecorp (avgPrice = units-weighted price actually charged) and the competitor, month by month:');
    console.table(valuecorpHistory.map((v, k) => ({
      month: v.month, valuecorpSold: v.sold, valuecorpPrice: Math.round(v.avgPrice), valuecorpModels: v.models,
      competitorSold: playerHistory[k].sold, competitorPrice: Math.round(playerHistory[k].avgPrice),
    })));

    const atEntry = valuecorpHistory[ENTRY_MONTH - 1];
    const reacted = valuecorpHistory[ENTRY_MONTH];

    // Preconditions: the competitor stayed out, then really entered; Valuecorp kept trading.
    assert.strictEqual(playerHistory.slice(0, ENTRY_MONTH - 1).reduce((s, m) => s + m.sold, 0), 0, 'the competitor sold nothing before it entered');
    assert.ok(playerHistory[ENTRY_MONTH - 1].sold > 0, 'the competitor sold cars once it entered');
    assert.ok(playerHistory[ENTRY_MONTH - 1].avgPrice / atEntry.avgPrice < 1, 'the competitor undercut Valuecorp');
    assert.ok(atEntry.sold > 0 && reacted.sold > 0, `Valuecorp kept selling (${atEntry.sold} then ${reacted.sold} cars)`);

    // The behaviour under test: once it can see the competitor, Valuecorp charges less.
    const ratio = reacted.avgPrice / atEntry.avgPrice;
    assert.ok(ratio < 1, `Valuecorp did not lower its price after being undercut (month ${ENTRY_MONTH + 1} / month ${ENTRY_MONTH} price = ${ratio.toFixed(2)})`);
  });
});
