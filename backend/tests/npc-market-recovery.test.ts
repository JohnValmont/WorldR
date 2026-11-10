/**
 * Behaviour tests for the NPC car-market collapse fix (Nov 2026).
 *
 * Live symptom: ~84 cars/month sold against ~10,000 buyers/month of demand,
 * NPC prices at ~30x launch price, sales stuck at ~3 cars per market.
 * All assertions are RATIO-based (AGENTS.md engineering rules).
 */
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  decideNpcActions,
  NpcBrainInput,
  splitUnitsByWeight,
  aggregateReasonCode,
  nextGenerationName,
  modelAgeInMonths,
} from '../src/api/services/npcBrain.service';
import { NPC_FORECAST_CONFIDENCE } from '../src/api/constants/npc';

const COST = 17050;          // HaulPro roster build cost (31000 * 0.55)
const LAUNCH_PRICE = 31000;
const CAPACITY = 1500;
// Monthly buyer interest per market for a commercial van at ~$31-43k,
// shaped like Drennia's 8 markets (Kingscrown biggest, Greenmere smallest).
const MARKET_DEMAND = [664, 229, 211, 131, 36, 25, 20, 9].map(x => x * 2);

function baseInput(overrides: Partial<NpcBrainInput> = {}): NpcBrainInput {
  return {
    salePrice: LAUNCH_PRICE, costPerUnit: COST, targetUnits: 30, factoryCapacity: CAPACITY,
    marketingTier: 'regional', awareness: 60, availableCash: 50_000_000, lastRevenue: 1_000_000,
    unitsSoldLastArc: 24, unitsAllocatedLastArc: 24, marketShareThisArc: 0.1, marketShareLastArc: 0.1,
    reasonCode: 'Sold Out', zeroDemandStreak: 0, modelAgeMonths: 5, unitsProducedLastArc: 24,
    inventoryInStock: 0, ...overrides,
  };
}

/** Closed loop: decide -> allocate -> sell, starting from the live "3 per market" spiral. */
function simulate(months: number, useForecast: boolean, useWeightedSplit: boolean) {
  let price = LAUNCH_PRICE, target = 24, inventory = 0;
  let weights: (number | undefined)[] = MARKET_DEMAND.map(() => undefined);
  const soldByMonth: number[] = [];
  let maxPriceToCost = 0;
  for (let m = 0; m < months; m++) {
    const available = inventory + target;
    const alloc = useWeightedSplit
      ? splitUnitsByWeight(available, weights)
      : MARKET_DEMAND.map((_, i) => Math.floor(target / MARKET_DEMAND.length) + (i === 0 ? inventory : 0));
    const sold = alloc.map((a, i) => Math.min(a, MARKET_DEMAND[i]));
    const S = sold.reduce((a, b) => a + b, 0);
    const A = alloc.reduce((a, b) => a + b, 0);
    inventory = available - S;
    const rows = sold.map((s, i) => ({ units_sold: s, main_reason_code: s >= alloc[i] && alloc[i] > 0 ? 'Sold Out' : 'Balanced' }));
    const out = decideNpcActions(baseInput({
      salePrice: price, unitsSoldLastArc: S, unitsAllocatedLastArc: A, inventoryInStock: inventory,
      reasonCode: aggregateReasonCode(rows),
      demandForecast: useForecast ? MARKET_DEMAND.reduce((a, b) => a + b, 0) : undefined,
    }));
    price = out.newSalePrice;
    target = out.newTargetUnits;
    weights = MARKET_DEMAND.slice();
    maxPriceToCost = Math.max(maxPriceToCost, price / COST);
    soldByMonth.push(S);
  }
  return { soldByMonth, maxPriceToCost };
}

describe('NPC market recovery — production escapes the low-volume spiral', () => {
  const totalDemand = MARKET_DEMAND.reduce((a, b) => a + b, 0);
  const reachable = Math.min(CAPACITY, totalDemand * NPC_FORECAST_CONFIDENCE);

  it('reaches at least 90% of the demand-led target within 3 months', () => {
    const { soldByMonth } = simulate(6, true, true);
    assert.ok(soldByMonth[2] / reachable >= 0.9, `month-3 sales ${soldByMonth[2]} vs reachable ${reachable}`);
  });

  it('sells at least 3x more by month 3 than the old even-split, sales-only rules', () => {
    const fixed = simulate(6, true, true).soldByMonth[2];
    const old = simulate(6, false, false).soldByMonth[2];
    assert.ok(fixed / Math.max(1, old) >= 3, `fixed ${fixed} vs old ${old}`);
  });

  it('never plans more than factory capacity', () => {
    const { soldByMonth } = simulate(24, true, true);
    assert.ok(Math.max(...soldByMonth) / CAPACITY <= 1.0001);
  });
});

describe('NPC pricing stays bounded over a long game', () => {
  it('price never exceeds 2.5x build cost across 600 months of sell-outs', () => {
    const { maxPriceToCost } = simulate(600, true, true);
    assert.ok(maxPriceToCost <= 2.5 + 1e-9, `max price/cost ratio ${maxPriceToCost}`);
  });

  it('price never exceeds 2.5x launch build cost even if every month sells out (fixed cost)', () => {
    let price = LAUNCH_PRICE;
    for (let m = 0; m < 600; m++) {
      price = decideNpcActions(baseInput({ salePrice: price, reasonCode: 'Sold Out' })).newSalePrice;
    }
    assert.ok(price / COST <= 2.5 + 1e-9);
    assert.ok(price / LAUNCH_PRICE < 1.5, 'a $31k van should stay well under 1.5x its launch price');
  });
});

describe('splitUnitsByWeight', () => {
  it('always allocates exactly the total', () => {
    for (const total of [0, 1, 7, 100, 1499]) {
      const parts = splitUnitsByWeight(total, [5, 3, 1, 0.5]);
      assert.strictEqual(parts.reduce((a, b) => a + b, 0), total);
    }
  });

  it('allocates in proportion to buyer interest', () => {
    const parts = splitUnitsByWeight(1000, [800, 200]);
    assert.ok(Math.abs(parts[0] / parts[1] - 4) < 0.05);
  });

  it('gives markets with no history a smaller but non-zero share', () => {
    const parts = splitUnitsByWeight(100, [100, undefined]);
    assert.ok(parts[1] > 0 && parts[1] / parts[0] < 1);
  });
});

describe('aggregateReasonCode', () => {
  it('no rows means no history', () => assert.strictEqual(aggregateReasonCode([]), null));
  it('zero units everywhere is Zero Demand', () => {
    assert.strictEqual(aggregateReasonCode([{ main_reason_code: 'Balanced', units_sold: 0 }, { main_reason_code: 'Sold Out', units_sold: 0 }]), 'Zero Demand');
  });
  it('majority sold out is Sold Out even if the first market was not', () => {
    const rows = [
      { main_reason_code: 'Balanced', units_sold: 58 },
      { main_reason_code: 'Sold Out', units_sold: 3 },
      { main_reason_code: 'Sold Out', units_sold: 3 },
    ];
    assert.strictEqual(aggregateReasonCode(rows), 'Sold Out');
  });
  it('a single sold-out first market no longer hides the rest', () => {
    const rows = [
      { main_reason_code: 'Sold Out', units_sold: 3 },
      { main_reason_code: 'Balanced', units_sold: 1 },
      { main_reason_code: 'Balanced', units_sold: 1 },
    ];
    assert.strictEqual(aggregateReasonCode(rows), 'Balanced');
  });
});

describe('nextGenerationName', () => {
  it('numbers generations properly past V', () => {
    assert.strictEqual(nextGenerationName('Falcon'), 'Falcon II');
    assert.strictEqual(nextGenerationName('Falcon IV'), 'Falcon V');
    assert.strictEqual(nextGenerationName('Falcon V'), 'Falcon VI');
  });
  it('heals names broken by the old logic', () => {
    assert.strictEqual(nextGenerationName('Apex Automobili Vortex Vanguard V V V V V V V V V V V V III'), 'Apex Automobili Vortex Vanguard VI');
  });
  it('keeps non-numeral suffixes intact', () => {
    assert.strictEqual(nextGenerationName('Titan-C1 4 FL'), 'Titan-C1 4 FL II');
  });
});

describe('modelAgeInMonths', () => {
  it('counts across year boundaries (old code ignored the year)', () => {
    assert.strictEqual(modelAgeInMonths(27, 11, 30, 2), 27);
    assert.strictEqual(modelAgeInMonths(27, 2, 30, 2), 36);
    assert.strictEqual(modelAgeInMonths(30, 2, 30, 2), 0);
  });
});
