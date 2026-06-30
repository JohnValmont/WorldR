import { test } from 'node:test';
import * as assert from 'node:assert';
import { ManufacturingController } from '../src/api/controllers/manufacturing.controller';
import { MARKET_SEGMENTS } from '../src/api/constants/marketSegments';

test('Market Segments Engine validates demographic demands', async (t) => {
  // A simulated market (like USA or EU)
  const simulatedMarket = {
    region_market_id: 'test-market-1',
    population: 100_000_000,
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
  };

  // Base brand stats
  const brandMap = new Map();
  brandMap.set('test-market-1', { awareness: 100, reputation: 100 });

  const marketingMult = { none: 1.0, standard: 1.2, aggressive: 1.5 };
  const salesManagerBonus = 0;

  // Archetypes
  const archetypes = [
    {
      vehicle_model_id: 'car-budget',
      target_segment: 'budget',
      vehicle_class: 'Compact Car',
      sale_price: 15000,
      units_allocated: 9999999, // Infinite supply to see raw demand
      marketing_tier: 'none',
      reliability_score: 50,
      performance_score: 20,
      fuel_efficiency_score: 65,
      safety_score: 35,
      appeal_score: 30,
      cargo_score: 30,
    },
    {
      vehicle_model_id: 'car-family',
      target_segment: 'family',
      vehicle_class: 'Sedan',
      sale_price: 32000,
      units_allocated: 9999999,
      marketing_tier: 'none',
      reliability_score: 60,
      performance_score: 40,
      fuel_efficiency_score: 50,
      safety_score: 60,
      appeal_score: 45,
      cargo_score: 50,
    },
    {
      vehicle_model_id: 'car-performance',
      target_segment: 'performance',
      vehicle_class: 'Compact Car',
      sale_price: 55000,
      units_allocated: 9999999,
      marketing_tier: 'none',
      reliability_score: 40,
      performance_score: 65,
      fuel_efficiency_score: 20,
      safety_score: 45,
      appeal_score: 60,
      cargo_score: 20,
    },
    {
      vehicle_model_id: 'car-luxury',
      target_segment: 'luxury',
      vehicle_class: 'Sedan',
      sale_price: 110000,
      units_allocated: 9999999,
      marketing_tier: 'none',
      reliability_score: 55,
      performance_score: 55,
      fuel_efficiency_score: 30,
      safety_score: 58,
      appeal_score: 65,
      cargo_score: 40,
    },
    {
      vehicle_model_id: 'van-commercial',
      target_segment: 'commercial',
      vehicle_class: 'Utility Van',
      sale_price: 40000,
      units_allocated: 9999999,
      marketing_tier: 'none',
      reliability_score: 65,
      performance_score: 30,
      fuel_efficiency_score: 55,
      safety_score: 50,
      appeal_score: 20,
      cargo_score: 65,
    }
  ];

  const allocations = archetypes.map(a => ({ ...simulatedMarket, ...a }));

  const salesManagerBonusMap = new Map();

  const results = ManufacturingController.simulateSalesDemand(
    allocations,
    brandMap,
    marketingMult as any,
    salesManagerBonusMap
  );

  console.log('\n========================================================================================');
  console.log('MARKET SEGMENT DEMAND TABLE');
  console.log('========================================================================================');
  const segmentKeys = Object.keys(MARKET_SEGMENTS);
  const header = ['Model', ...segmentKeys.map(k => k.substring(0,6).toUpperCase()), 'TOTAL'];
  console.log(header.map(s => s.padEnd(12)).join(' | '));
  console.log('-'.repeat(12 * (segmentKeys.length + 2) + 3 * (segmentKeys.length + 1)));

  const stats: any = {};

  for (const res of results) {
    const row = [res.alloc.vehicle_model_id.replace('car-', '').replace('van-', '')];
    for (const key of segmentKeys) {
      row.push(Math.round(res.segmentInterest[key]).toString());
    }
    row.push(Math.round(res.rawBuyerInterest).toString());
    console.log(row.map(s => s.padEnd(12)).join(' | '));
    stats[res.alloc.vehicle_model_id] = res;
  }
  console.log('========================================================================================\n');

  // Assertions
  await t.test('Each archetype gets highest interest from its intended segment', () => {
    for (const archetype of archetypes) {
      const res = stats[archetype.vehicle_model_id];
      const targetSeg = archetype.target_segment;
      
      let maxInterest = -1;
      let secondMaxInterest = -1;
      let maxSeg = '';
      
      for (const seg of segmentKeys) {
        if (res.segmentInterest[seg] > maxInterest) {
          secondMaxInterest = maxInterest;
          maxInterest = res.segmentInterest[seg];
          maxSeg = seg;
        } else if (res.segmentInterest[seg] > secondMaxInterest) {
          secondMaxInterest = res.segmentInterest[seg];
        }
      }
      
      assert.strictEqual(maxSeg, targetSeg, `${archetype.vehicle_model_id} should appeal most to ${targetSeg}, but actually appeals to ${maxSeg}`);
      assert.ok(maxInterest >= secondMaxInterest * 1.2, `${archetype.vehicle_model_id} winning segment (${maxSeg}) didn't beat runner-up by 20%. Max: ${maxInterest}, Runner-up: ${secondMaxInterest}`);
    }
  });

  await t.test('Luxury car gets near-zero interest from Budget segment and vice-versa', () => {
    const luxuryBudgetInt = stats['car-luxury'].segmentInterest['budget'];
    const budgetLuxuryInt = stats['car-budget'].segmentInterest['luxury'];
    
    assert.ok(luxuryBudgetInt < 10000, `Luxury car sold too much to budget: ${luxuryBudgetInt}`);
    assert.ok(budgetLuxuryInt < 10000, `Budget car sold too much to luxury: ${budgetLuxuryInt}`);
  });

  await t.test('Doubling a models price reduces total buyer interest', () => {
    // Run the budget car at double price
    const doublePriceBudget = { ...archetypes[0], sale_price: archetypes[0].sale_price * 2 };
    const dpAllocations = [{ ...simulatedMarket, ...doublePriceBudget }];
    const dpResults = ManufacturingController.simulateSalesDemand(
      dpAllocations,
      brandMap,
      marketingMult as any,
      salesManagerBonus
    );
    
    const origInterest = stats['car-budget'].rawBuyerInterest;
    const newInterest = dpResults[0].rawBuyerInterest;
    
    assert.ok(newInterest < origInterest, `Doubling price should reduce demand. Orig: ${origInterest}, New: ${newInterest}`);
    // In fact, it should be significantly lower for a budget car
    assert.ok(newInterest < origInterest * 0.5, `Doubling price of budget car should crush demand. Orig: ${origInterest}, New: ${newInterest}`);
  });

});
