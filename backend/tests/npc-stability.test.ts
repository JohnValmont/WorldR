/**
 * NPC stability: 24 business months with one passive player in Drennia.
 * The rival car makers must not die off en masse and there must always be an
 * active rival.
 *
 * Runs on a THROWAWAY local database (tests/helpers/throwawayDb.ts): created
 * fresh from migrations + seeds and dropped afterwards. This scenario resets
 * every NPC's cash, prices, stock and history and moves world_clock, so it must
 * never run against a database anyone uses. Without a local Postgres it is
 * SKIPPED (never reported as passed).
 */
import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import type { Request, Response, NextFunction } from 'express';
import { withThrowawayDb } from './helpers/throwawayDb';
import { NPC_ROSTER } from '../src/api/constants/npc';

const MONTHS = 24;

const makeReq = (cId: string) => ({ params: { companyId: cId } } as unknown as Request);
const makeRes = () => {
  const r: any = {};
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (d: any) => { r.data = d; return r; };
  return r as Response & { data: any; code: number };
};
const makeNext = () => ((err?: any) => { if (err) throw err; }) as NextFunction;

/** Distinct active NPC companies in one month's rows (rows are per model). */
const activeCompanies = (rows: any[]) => new Set(rows.filter(n => n.company_status === 'active').map(n => n.name)).size;

async function scenario(db: Knex) {
  // Imported only now, so src/config/database opens its pool on the throwaway db.
  const { ManufacturingController }: typeof import('../src/api/controllers/manufacturing.controller') = require('../src/api/controllers/manufacturing.controller');

  const country = await db('countries').where('name', 'Drennia').first();
  assert.ok(country, 'Drennia not found in the fresh database');
  const worldId = country.world_instance_id;

  const market = await db('manufacturing_region_markets').where('id', 'drennport-consumer-market').first();
  assert.ok(market, 'drennport-consumer-market not found');

  const userId = Date.now();
  const charId = randomUUID();
  const playerCompanyId = randomUUID();
  const modelId = randomUUID();
  const factoryId = randomUUID();
  const lineId = randomUUID();

  // ── Passive player company in Drennia ──
  await db('users').insert({ id: userId, email: `test_${Date.now()}@test.com`, password_hash: '123' });
  await db('characters').insert({ id: charId, user_id: userId, world_instance_id: worldId, name: 'Passive Player', motherland_country_id: country.id, age: 26, created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 });
  await db('companies').insert({ id: playerCompanyId, world_instance_id: worldId, owner_character_id: charId, industry_id: 'manufacturing', country_id: country.id, headquarters_state_id: 'drennia-drennport', legal_structure_id: 'private-company', currency_id: country.currency_id, name: 'Player Corp 2 ' + Date.now(), status: 'active', created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 });
  await db('company_finances').insert({ company_id: playerCompanyId, currency_id: country.currency_id, available_cash: 50000000, debt: 0, company_value: 0, last_arc_profit: 0 });
  await db('manufacturing_vehicle_models').insert({
    id: modelId, company_id: playerCompanyId, world_instance_id: worldId, name: 'Player Box', vehicle_class: 'compact',
    platform_type: 'compact_chassis_a', power_unit_type: 'ice_inline_4', drivetrain_type: 'fwd',
    interior_tier: 'standard', safety_tier: 'standard', production_quality: 'standard',
    manufacturing_cost_per_unit: 10000, reliability_score: 50, performance_score: 50, fuel_efficiency_score: 50, appeal_score: 50, cargo_score: 50, safety_score: 50,
    target_segment: 'Economy', sale_price: 15000, development_status: 'launched', dev_stage: 'ready_to_launch', status: 'active',
    created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1,
  });
  await db('manufacturing_factories').insert({ id: factoryId, company_id: playerCompanyId, world_instance_id: worldId, country_id: country.id, state_id: 'drennia-drennport', factory_type_id: 'medium-plant', name: 'Player Factory', capacity_per_month: 200, lease_cost_per_month: 10000, maintenance_cost_per_month: 2000, status: 'active', created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 });
  await db('manufacturing_production_lines').insert({ id: lineId, factory_id: factoryId, company_id: playerCompanyId, world_instance_id: worldId, assigned_vehicle_model_id: modelId, target_units_per_month: 100, status: 'active' });
  await db('manufacturing_market_allocations').insert({ company_id: playerCompanyId, vehicle_model_id: modelId, world_instance_id: worldId, region_market_id: market.id, units_allocated: 100, marketing_tier: 'local' });

  // ── NPC starting point: roster seed capital, roster price and plan, no history ──
  const npcs = await db('companies').where({ is_npc: true });
  for (const npc of npcs) {
    const rosterData = NPC_ROSTER.find(r => r.name === npc.name);
    const seedCap = rosterData ? rosterData.seedCapital : 1500000;

    await db('manufacturing_inventory').where({ company_id: npc.id }).del();
    await db('manufacturing_sales_results').where({ company_id: npc.id }).andWhere('world_month', '>', 0).del();
    await db('manufacturing_arc_reports').where({ company_id: npc.id }).del();
    await db('manufacturing_model_snapshots').where({ company_id: npc.id }).del();
    await db('company_finances').where({ company_id: npc.id }).update({ available_cash: seedCap });

    if (rosterData?.targetUnitsPerArc) {
      await db('manufacturing_production_lines').where({ company_id: npc.id }).update({ target_units_per_month: rosterData.targetUnitsPerArc });
    }
    if (rosterData?.salePrice) {
      await db('manufacturing_vehicle_models').where({ company_id: npc.id }).update({ sale_price: rosterData.salePrice });
    }
    const seedSales = await db('manufacturing_sales_results').where({ company_id: npc.id, world_month: 0 }).first();
    if (seedSales) {
      await db('manufacturing_npc_state').where({ company_id: npc.id }).update({ last_units_sold: seedSales.units_sold, last_market_share: seedSales.market_share_estimate });
    }
  }

  const clockRow = await db('world_clock').first();
  if (!clockRow) await db('world_clock').insert({ current_year: 1, current_month: 1, current_day: 1, status: 'running' });

  // ── Run the months ──
  const runStats: { month: number; npcs: any[] }[] = [];
  for (let i = 1; i <= MONTHS; i++) {
    const year = Math.floor((i - 1) / 8) + 1;
    const month = ((i - 1) % 8) + 1;
    await db('world_clock').update({ current_year: year, current_month: month });
    await db('manufacturing_arc_reports').where({ world_year: year, world_month: month }).del();

    const res = makeRes();
    await ManufacturingController.processManufacturingArc(makeReq(playerCompanyId), res, makeNext());
    if (res.code >= 400) throw new Error(`Month ${i} failed: ${JSON.stringify(res.data)}`);

    // One row per NPC model (incl. discontinued ones) with this month's results.
    const rows = await db('companies as c')
      .join('company_finances as f', 'f.company_id', 'c.id')
      .leftJoin('manufacturing_vehicle_models as m', 'm.company_id', 'c.id')
      .leftJoin('manufacturing_npc_state as s', function () {
        this.on('s.company_id', '=', 'c.id').andOn('s.vehicle_model_id', '=', 'm.id');
      })
      .leftJoin(
        db('manufacturing_model_snapshots').where({ world_year: year, world_month: month }).select('company_id', 'model_id', 'units_produced').as('snap'),
        function () { this.on('snap.company_id', '=', 'c.id').andOn('snap.model_id', '=', 'm.id'); },
      )
      .leftJoin(
        db('manufacturing_sales_results').where({ world_year: year, world_month: month })
          .groupBy('company_id', 'vehicle_model_id')
          .select('company_id', 'vehicle_model_id', db.raw('SUM(units_sold)::int as units_sold'), db.raw('MIN(main_reason_code) as main_reason_code'))
          .as('sr'),
        function () { this.on('sr.company_id', '=', 'c.id').andOn('sr.vehicle_model_id', '=', 'm.id'); },
      )
      .leftJoin('manufacturing_inventory as inv', function () {
        this.on('inv.company_id', '=', 'c.id').andOn('inv.vehicle_model_id', '=', 'm.id');
      })
      .where('c.is_npc', true)
      .where('c.country_id', country.id)
      .select(
        'c.name', 'c.status as company_status', 'f.available_cash', 'm.name as model', 'm.status as model_status',
        'm.sale_price', 's.last_market_share',
        'snap.units_produced', 'sr.main_reason_code', 'sr.units_sold as current_units_sold', 'inv.units_in_stock',
      )
      .orderBy(['c.name', 'm.name']);
    runStats.push({ month: i, npcs: rows });
  }

  // ── Report ──
  for (const stat of runStats) {
    if (![1, 2, 3, 6, 12, 18, 24].includes(stat.month)) continue;
    console.log(`\n--- MONTH ${stat.month} ---`);
    console.table(stat.npcs.map(n => ({
      NPC: n.name,
      Model: `${n.model} (${n.model_status})`,
      Status: n.company_status,
      Cash: Math.round(Number(n.available_cash)).toLocaleString('en-US'),
      Price: Number(n.sale_price || 0),
      UnitsProduced: Number(n.units_produced || 0),
      UnitsSold: Number(n.current_units_sold || 0),
      Inventory: Number(n.units_in_stock || 0),
      ReasonCode: n.main_reason_code || 'None',
    })));
  }

  // ── Assertions ──
  const initialActive = activeCompanies(runStats[0].npcs);
  assert.ok(initialActive > 0, 'no active Drennia NPC in month 1: the fresh world has no rivals');

  // No mass extinction: at least half of the month-1 rivals are still trading.
  const finalActive = activeCompanies(runStats[MONTHS - 1].npcs);
  assert.ok(
    finalActive >= Math.max(1, Math.floor(initialActive * 0.5)),
    `Survival rate too low: ${finalActive} of ${initialActive} NPCs still active after ${MONTHS} months`,
  );

  // Never empty: every month has at least one active rival.
  for (const stat of runStats) {
    assert.ok(activeCompanies(stat.npcs) > 0, `no active NPC in month ${stat.month}`);
  }
}

test(`NPC stability: rivals survive ${MONTHS} months beside a passive player`, { timeout: 600_000 }, async (t) => {
  await withThrowawayDb(t, ({ db }) => scenario(db));
});
