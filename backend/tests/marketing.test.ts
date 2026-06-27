import { test } from 'node:test';
import assert from 'node:assert';
import { MARKETING, awarenessGain } from '../src/api/constants/marketing';
import { ManufacturingController } from '../src/api/controllers/manufacturing.controller';
import { MARKET_SEGMENTS } from '../src/api/constants/marketSegments';

test('Marketing Engine validates awareness building and demand impact', async (t) => {
  const MARKETING_COSTS: Record<string, number> = {
    none: 0,
    local: 3500,
    regional: 12000,
    national: 35000,
  };

  const simulateAwarenessArcs = (tier: string, arcs: number, initial = 0) => {
    let aw = initial;
    const spend = MARKETING_COSTS[tier];
    for (let i = 0; i < arcs; i++) {
      aw = Math.min(100, Math.max(0, aw * MARKETING.RETENTION + awarenessGain(spend)));
    }
    return aw;
  };

  await t.test('higher sustained tier yields higher steady-state awareness', () => {
    const localSS = simulateAwarenessArcs('local', 50);
    const regionalSS = simulateAwarenessArcs('regional', 50);
    const nationalSS = simulateAwarenessArcs('national', 50);

    assert.ok(localSS > 5, 'Local marketing does something');
    assert.ok(regionalSS > localSS, 'Regional > Local');
    assert.ok(nationalSS > regionalSS, 'National > Regional');
  });

  await t.test('diminishing returns on spend', () => {
    const spendLocal = MARKETING_COSTS['local']; // 3500
    const spendRegional = MARKETING_COSTS['regional']; // 12000
    const spendNational = MARKETING_COSTS['national']; // 35000

    const gainZeroToLocal = awarenessGain(spendLocal) - awarenessGain(0);
    const costZeroToLocal = spendLocal;
    const efficiencyLocal = gainZeroToLocal / costZeroToLocal;

    const gainRegionalToNational = awarenessGain(spendNational) - awarenessGain(spendRegional);
    const costRegionalToNational = spendNational - spendRegional;
    const efficiencyNational = gainRegionalToNational / costRegionalToNational;

    assert.ok(efficiencyLocal > efficiencyNational, 'Initial marketing spend is more efficient than late spend');
  });

  await t.test('awareness decays toward 0 with zero spend', () => {
    const aw = simulateAwarenessArcs('none', 30, 80); // Start at 80, spend 0 for 30 arcs
    assert.ok(aw < 5, 'Awareness decayed heavily');
  });

  await t.test('high awareness increases sales but not more than ~3x over floor awareness', () => {
    // Basic setup from market segments test
    const baseCar = {
      vehicle_class: 'Sedan',
      target_segment: 'family',
      sale_price: 25000,
      manufacturing_cost_per_unit: 15000,
      reliability_score: 50,
      performance_score: 50,
      fuel_efficiency_score: 50,
      appeal_score: 50,
      cargo_score: 50,
      safety_score: 50,
    };

    const market = {
      region_market_id: 'mkt1',
      population: 1000000,
      avg_household_size: 2.5,
      vehicle_ownership_rate: 0.8,
      baseline_replacement_rate: 0.05,
      first_time_buyer_rate: 0.01,
      purchase_need_intensity: 1.0,
      economic_multiplier: 1.0,
      vehicle_price_comfort_ratio: 0.8,
      average_income: 45000,
      price_sensitivity: 1.0,
      distribution_strength: 1.0,
      competition_level: 1.0,
      market_tier: 'regional',
      preference_economy: 1.0,
      preference_standard: 1.0,
      preference_premium: 1.0,
      vehicle_attribute_weights: {},
    };

    const allocHigh = {
      id: 'alloc1',
      company_id: 'C_HIGH',
      vehicle_model_id: 'car_high',
      region_market_id: 'mkt1',
      marketing_tier: 'none',
      units_allocated: 100000,
      ...baseCar,
      ...market,
    };

    const allocLow = {
      id: 'alloc2',
      company_id: 'C_LOW',
      vehicle_model_id: 'car_low',
      region_market_id: 'mkt1',
      marketing_tier: 'none',
      units_allocated: 100000,
      ...baseCar,
      ...market,
    };

    const MARKETING_MULT = { none: 1.0, local: 1.15, regional: 1.30, national: 1.50 };

    const brandMapHigh = new Map([['mkt1', { awareness: 90, reputation: 50 }]]);
    const brandMapLow = new Map([['mkt1', { awareness: 0, reputation: 50 }]]);

    const resultHigh = ManufacturingController.simulateSalesDemand([allocHigh], brandMapHigh, MARKETING_MULT, 0);
    const resultLow = ManufacturingController.simulateSalesDemand([allocLow], brandMapLow, MARKETING_MULT, 0);

    const salesHigh = resultHigh[0].unitsSold;
    const salesLow = resultLow[0].unitsSold;

    console.log(`Sales High Awareness: ${salesHigh}, Sales Low Awareness: ${salesLow}`);
    assert.ok(salesHigh > salesLow, 'High awareness sells more');
    assert.ok(salesHigh <= salesLow * 3.5, 'High awareness does not snowball more than ~3x over floor');
    assert.ok(salesHigh >= salesLow * 1.5, 'High awareness provides a material boost (>=1.5x)');
  });
});
