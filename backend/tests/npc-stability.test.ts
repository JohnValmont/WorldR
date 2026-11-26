/**
 * NPC stability: 24 business months in Drennia with the seeded computer car
 * makers and one passive player. The NPCs must not die out, must not sell cars
 * they never built, must keep prices under the Rule B2 cap, and no single one
 * may take over the market.
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

const MONTHS = 24;
/** At least this share of the NPCs active in month 1 must still be active at the end. */
const MIN_SURVIVAL_RATIO = 0.5;
/** No NPC may sell more than this share of all cars sold in Drennia over the last RUNAWAY_WINDOW months. */
const MAX_NPC_SHARE = 0.6;
const RUNAWAY_WINDOW = 6;
/** Rule B2 (npcBrain.decideNpcActions): price never above 2.5 x cost per unit. */
const PRICE_CAP_MULTIPLE = 2.5;
/** Prices are stored as whole currency units, so the cap may be exceeded by rounding (20,187.5 -> 20,188). */
const PRICE_ROUNDING = 1;

interface NpcMonth {
  id: string; name: string; status: string; cash: number;
  price: number; cost: number; produced: number; sold: number; stock: number;
}

async function npcMonth(db: Knex, countryId: string, year: number, month: number): Promise<NpcMonth[]> {
  const rows = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.is_npc': true, 'c.country_id': countryId })
    .select(
      'c.id', 'c.name', 'c.status', 'f.available_cash as cash',
      db.raw('(select max(m.sale_price) from manufacturing_vehicle_models m where m.company_id = c.id and m.status = ?) as price', ['active']),
      db.raw('(select max(m.manufacturing_cost_per_unit) from manufacturing_vehicle_models m where m.company_id = c.id and m.status = ?) as cost', ['active']),
      db.raw('(select coalesce(sum(s.units_produced), 0) from manufacturing_model_snapshots s where s.company_id = c.id and s.world_year = ? and s.world_month = ?) as produced', [year, month]),
      db.raw('(select coalesce(sum(r.units_sold), 0) from manufacturing_sales_results r where r.company_id = c.id and r.world_year = ? and r.world_month = ?) as sold', [year, month]),
      db.raw('(select coalesce(sum(i.units_in_stock), 0) from manufacturing_inventory i where i.company_id = c.id) as stock'),
    )
    .orderBy('c.name');
  return rows.map((r: any) => ({
    id: r.id, name: r.name, status: r.status, cash: Number(r.cash),
    price: Number(r.price), cost: Number(r.cost),
    produced: Number(r.produced), sold: Number(r.sold), stock: Number(r.stock),
  }));
}

async function unitsSoldInCountry(db: Knex, countryId: string, year: number, month: number): Promise<number> {
  const row = await db('manufacturing_sales_results as r')
    .join('companies as c', 'c.id', 'r.company_id')
    .where({ 'c.country_id': countryId, 'r.world_year': year, 'r.world_month': month })
    .sum({ n: 'r.units_sold' }).first();
  return Number(row?.n ?? 0);
}

test('NPC car makers stay alive, honest and competitive over 24 months', { timeout: 300_000 }, async (t) => {
  await withScratchDatabase(t, 'npc_stability', async (db) => {
    const npcMarket = await db('manufacturing_market_allocations as a')
      .join('companies as c', 'c.id', 'a.company_id')
      .where({ 'c.is_npc': true, 'c.country_id': 'drennia' })
      .first('a.region_market_id');
    assert.ok(npcMarket, 'the seeded Drennia NPCs sell somewhere');

    // A passive player selling an ordinary budget car in the NPCs' own market.
    const player = await insertPlayerCarMaker(db, {
      model: {
        vehicle_class: 'Compact Car', target_segment: 'Budget', sale_price: 15000, manufacturing_cost_per_unit: 10000,
        reliability_score: 50, performance_score: 50, fuel_efficiency_score: 50, appeal_score: 50, cargo_score: 50, safety_score: 50,
      },
      factoryCapacity: 200, lineTarget: 100, marketId: npcMarket.region_market_id, marketingTier: 'local',
    });

    const startStock = new Map((await npcMonth(db, player.countryId, 1, 1)).map(n => [n.id, n.stock]));
    const months: { i: number; npcs: NpcMonth[]; countrySold: number }[] = [];
    for (let i = 1; i <= MONTHS; i++) {
      await quietly(() => processMonth(db, player.companyId, i));
      const { year, month } = clockAt(i);
      months.push({ i, npcs: await npcMonth(db, player.countryId, year, month), countrySold: await unitsSoldInCountry(db, player.countryId, year, month) });
    }

    for (const m of months.filter(m => [1, 2, 3, 6, 12, 18, 24].includes(m.i))) {
      console.info(`--- Month ${m.i} (all Drennia cars sold: ${m.countrySold}) ---`);
      console.table(m.npcs.map(n => ({ NPC: n.name, Status: n.status, Cash: Math.round(n.cash), Price: n.price, Produced: n.produced, Sold: n.sold, Stock: n.stock })));
    }

    const first = months[0].npcs;
    const last = months[MONTHS - 1].npcs;
    assert.ok(first.length >= 2, `Drennia should start with several NPC car makers, found ${first.length}`);

    // 1. No mass extinction.
    const activeAtStart = first.filter(n => n.status === 'active').length;
    const activeAtEnd = last.filter(n => n.status === 'active').length;
    assert.ok(activeAtEnd / activeAtStart >= MIN_SURVIVAL_RATIO,
      `only ${activeAtEnd} of ${activeAtStart} NPCs still active after ${MONTHS} months`);

    // 2. The market is never empty: every month some NPC is active and sells cars.
    for (const m of months) {
      const active = m.npcs.filter(n => n.status === 'active');
      const sold = active.reduce((s, n) => s + n.sold, 0);
      assert.ok(active.length > 0 && sold > 0, `month ${m.i}: no active NPC sold a car (${active.length} active, ${sold} sold)`);
    }

    // 3. Inventory-aware (Ghost Car fix): an NPC never sells more than it built plus its starting stock.
    for (const npc of first) {
      const built = months.reduce((s, m) => s + (m.npcs.find(n => n.id === npc.id)?.produced ?? 0), 0);
      const sold = months.reduce((s, m) => s + (m.npcs.find(n => n.id === npc.id)?.sold ?? 0), 0);
      const available = built + (startStock.get(npc.id) ?? 0);
      assert.ok(sold <= available, `${npc.name} sold ${sold} cars but only ever had ${available}`);
    }

    // 4. Rule B2 price cap holds every month.
    for (const m of months) {
      for (const n of m.npcs) {
        if (!n.cost) continue;
        assert.ok(n.price <= n.cost * PRICE_CAP_MULTIPLE + PRICE_ROUNDING,
          `month ${m.i}: ${n.name} priced at ${(n.price / n.cost).toFixed(2)}x cost (cap ${PRICE_CAP_MULTIPLE}x)`);
      }
    }

    // 5. No runaway: no NPC dominates Drennia's car sales over the last months.
    const window = months.slice(-RUNAWAY_WINDOW);
    const windowTotal = window.reduce((s, m) => s + m.countrySold, 0);
    assert.ok(windowTotal > 0, `nobody sold a car in Drennia in the last ${RUNAWAY_WINDOW} months`);
    for (const npc of last) {
      const npcSold = window.reduce((s, m) => s + (m.npcs.find(n => n.id === npc.id)?.sold ?? 0), 0);
      assert.ok(npcSold / windowTotal <= MAX_NPC_SHARE,
        `${npc.name} sold ${(100 * npcSold / windowTotal).toFixed(1)}% of Drennia's cars in the last ${RUNAWAY_WINDOW} months (max ${MAX_NPC_SHARE * 100}%)`);
    }

    // 6. Solvency: every surviving NPC is solvent, and the field as a whole is profitable.
    for (const n of last.filter(n => n.status === 'active')) {
      assert.ok(n.cash >= 0, `${n.name} is active with negative cash (${n.cash})`);
    }
    const cashStart = first.reduce((s, n) => s + n.cash, 0);
    const cashEnd = last.reduce((s, n) => s + n.cash, 0);
    assert.ok(cashEnd / cashStart > 1, `the NPCs together ended with less cash than after month 1 (${(cashEnd / cashStart).toFixed(2)}x)`);
  });
});
