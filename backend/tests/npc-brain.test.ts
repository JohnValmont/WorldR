import { decideNpcActions, NpcBrainInput, expansionMarkets } from '../src/api/services/npcBrain.service';
import { ZERO_DEMAND_FACELIFT_MONTHS, NPC_MAX_PRICE_TO_COST, NPC_FACTORY_TYPE_ID } from '../src/api/constants/npc';
import { STAFF_ROLES } from '../src/api/constants/manufacturing';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('NPC Brain - decideNpcActions (Pure)', () => {
  const baseInput: NpcBrainInput = {
    salePrice: 25000,
    costPerUnit: 15000,
    targetUnits: 100,
    factoryCapacity: 200,
    marketingTier: 'none',
    awareness: 10,
    availableCash: 5000000,
    lastRevenue: 2500000,
    unitsSoldLastArc: 100,
    unitsAllocatedLastArc: 100,
    marketShareThisArc: 0.05,
    marketShareLastArc: 0.10,
    reasonCode: null,
    zeroDemandStreak: 0,
    modelAgeMonths: 5,
    unitsProducedLastArc: 100,
    inventoryInStock: 0,
  };

  it('B1: UNDERCUT/LOSING - drops price if losing share', () => {
    // Losing share AND not selling through (hysteresis: cut only if sold/allocated < 0.9)
    const input = { ...baseInput, marketShareThisArc: 0.05, marketShareLastArc: 0.10, reasonCode: 'Weak Distribution', unitsSoldLastArc: 80, unitsAllocatedLastArc: 100 };
    const output = decideNpcActions(input);
    assert.ok(output.newSalePrice < input.salePrice);
    assert.ok(output.newSalePrice / input.salePrice < 1);
    assert.ok(output.newSalePrice >= input.costPerUnit * 1.05);
  });

  it('B2: SOLD OUT - raises price and production', () => {
    // Priced below the B2 cap, so there is room to raise.
    const input = { ...baseInput, salePrice: 18000, reasonCode: 'Sold Out', unitsSoldLastArc: 100, unitsAllocatedLastArc: 100, targetUnits: 100 };
    const output = decideNpcActions(input);
    assert.ok(output.newSalePrice > input.salePrice);
    assert.ok(output.newTargetUnits > input.unitsSoldLastArc);
  });

  it('B3: LOW AWARENESS - upgrades marketing if affordable', () => {
    const input = { ...baseInput, reasonCode: 'Low Brand Awareness', marketingTier: 'local', availableCash: 5000000, lastRevenue: 1000000 };
    const output = decideNpcActions(input);
    assert.strictEqual(output.newMarketingTier, 'regional');
  });

  it('B3: LOW AWARENESS - holds tier if insufficient cash/revenue', () => {
    const input = { ...baseInput, reasonCode: 'Low Brand Awareness', marketingTier: 'local', availableCash: 10000, lastRevenue: 50000 };
    const output = decideNpcActions(input);
    assert.strictEqual(output.newMarketingTier, 'local');
  });

  it('B4: ZERO DEMAND - sets faceliftFlag only after streak threshold', () => {
    let input = { ...baseInput, reasonCode: 'Zero Demand', zeroDemandStreak: ZERO_DEMAND_FACELIFT_MONTHS - 2 };
    let output = decideNpcActions(input);
    assert.strictEqual(output.faceliftFlag, false);
    assert.strictEqual(output.newZeroDemandStreak, ZERO_DEMAND_FACELIFT_MONTHS - 1);

    input = { ...baseInput, reasonCode: 'Zero Demand', zeroDemandStreak: ZERO_DEMAND_FACELIFT_MONTHS - 1 };
    output = decideNpcActions(input);
    assert.strictEqual(output.faceliftFlag, true);
    assert.strictEqual(output.newZeroDemandStreak, ZERO_DEMAND_FACELIFT_MONTHS);
  });

  it('PRICE FLOOR - price never drops below costPerUnit * 1.05', () => {
    const input = { ...baseInput, marketShareThisArc: 0.05, marketShareLastArc: 0.10, salePrice: 15500, costPerUnit: 15000 };
    const output = decideNpcActions(input);
    assert.ok(output.newSalePrice >= 15000 * 1.05);
  });
});

describe('NPC B2 price cap (Nov 2026 rebalance)', () => {
  const sellOut: NpcBrainInput = {
    salePrice: 15000, costPerUnit: 10000, targetUnits: 400, factoryCapacity: 500, marketingTier: 'regional',
    awareness: 90, availableCash: 50_000_000, lastRevenue: 6_000_000, unitsSoldLastArc: 485, unitsAllocatedLastArc: 485,
    marketShareThisArc: 0.2, marketShareLastArc: 0.2, reasonCode: 'Sold Out', zeroDemandStreak: 0, modelAgeMonths: 5,
    unitsProducedLastArc: 500, inventoryInStock: 0,
  };

  it('the cap is a real margin limit, above the cost floor', () => {
    assert.ok(NPC_MAX_PRICE_TO_COST > 1.05, 'cap must sit above the 1.05x cost floor');
    assert.ok(NPC_MAX_PRICE_TO_COST < 2.0, 'a 2x+ cap gave NPCs ~50% net margins');
  });

  it('repeated sell-outs climb to the cap and stop there', () => {
    let price = sellOut.salePrice;
    for (let m = 0; m < 120; m++) price = decideNpcActions({ ...sellOut, salePrice: price }).newSalePrice;
    assert.ok(Math.abs(price / sellOut.costPerUnit - NPC_MAX_PRICE_TO_COST) < 1e-9, `ended at ${price / sellOut.costPerUnit}x cost`);
  });

  it('a price already above the cap comes down to it (seeded or copied prices)', () => {
    for (const reasonCode of ['Sold Out', 'Balanced', null]) {
      const out = decideNpcActions({ ...sellOut, salePrice: sellOut.costPerUnit * 2.5, reasonCode });
      assert.ok(out.newSalePrice / sellOut.costPerUnit <= NPC_MAX_PRICE_TO_COST + 1e-9, `${reasonCode}: ${out.newSalePrice / sellOut.costPerUnit}x`);
    }
  });

  it('B1 price cuts below the cap still work', () => {
    const start = sellOut.costPerUnit * 1.4;
    const out = decideNpcActions({ ...sellOut, salePrice: start, reasonCode: 'Balanced', unitsSoldLastArc: 100, unitsAllocatedLastArc: 485 });
    assert.ok(out.newSalePrice < start);
  });
});

describe('NPC cost parity and home market (Nov 2026 rebalance)', () => {
  const ROOT = path.resolve(__dirname, '../..');
  const wageRoles = new Set(STAFF_ROLES.map(r => r.id));

  it('every NPC staff role in the seed and in spawnNpc has a wage', () => {
    const sources = [
      fs.readFileSync(path.join(ROOT, 'database/seeds/0004_npc_drennia_seeds.sql'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'backend/src/api/services/npcBrain.service.ts'), 'utf8'),
    ].join('\n');
    const roles = [
      ...[...sources.matchAll(/INSERT INTO company_staff \(company_id, role, quantity\) VALUES \(v_company_id, '([^']+)'/g)].map(m => m[1]),
      ...[...sources.matchAll(/company_staff'\)\.insert\(\{[^}]*role: '([^']+)'/g)].map(m => m[1]),
    ];
    assert.ok(roles.length >= 10, `found only ${roles.length} staff inserts`);
    for (const r of roles) assert.ok(wageRoles.has(r), `staff role '${r}' is not in STAFF_ROLES, so it is paid nothing`);
  });

  it('seeded NPCs run the NPC factory type, not a workshop stretched to 500 cars', () => {
    const seed = fs.readFileSync(path.join(ROOT, 'database/seeds/0004_npc_drennia_seeds.sql'), 'utf8');
    assert.ok(seed.includes(`WHERE id = '${NPC_FACTORY_TYPE_ID}'`));
    assert.ok(!/Primary Facility', \d/.test(seed), 'factory lease/capacity must come from the factory type, not literals');
  });

  it('B7 expansion only offers markets in the NPC\'s own nation', () => {
    const markets = [
      { id: 'a', country_id: 'drennia' }, { id: 'b', country_id: 'westmark' },
      { id: 'c', country_id: 'drennia' }, { id: 'd', country_id: 'eryndor' }, { id: 'e', country_id: 'drennia' },
    ];
    const picked = expansionMarkets(markets, 'drennia', new Set(['a']), 2);
    assert.deepStrictEqual(picked.map(m => m.id), ['c', 'e']);
    assert.strictEqual(expansionMarkets(markets, 'westmark', new Set(['b']), 2).length, 0);
  });
});
