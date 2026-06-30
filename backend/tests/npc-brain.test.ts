import { decideNpcActions, NpcBrainInput } from '../src/api/services/npcBrain.service';
import { ZERO_DEMAND_FACELIFT_MONTHS } from '../src/api/constants/npc';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';

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
  };

  it('B1: UNDERCUT/LOSING - drops price if losing share', () => {
    const input = { ...baseInput, marketShareThisArc: 0.05, marketShareLastArc: 0.10, reasonCode: 'Weak Distribution' };
    const output = decideNpcActions(input);
    assert.ok(output.newSalePrice < input.salePrice);
    assert.ok(output.newSalePrice / input.salePrice < 1);
    assert.ok(output.newSalePrice >= input.costPerUnit * 1.05);
  });

  it('B2: SOLD OUT - raises price and production', () => {
    const input = { ...baseInput, reasonCode: 'Sold Out', unitsSoldLastArc: 100, unitsAllocatedLastArc: 100, targetUnits: 100 };
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
