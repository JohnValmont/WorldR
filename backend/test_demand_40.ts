import { MARKET_SEGMENTS } from './src/api/constants/marketSegments';

const alloc = {
  reliability_score: 40,
  performance_score: 40,
  fuel_efficiency_score: 40,
  safety_score: 40,
  appeal_score: 40,
  cargo_score: 40,
  target_segment: 'compact',
  sale_price: 20000,
  units_allocated: 100,
  marketing_tier: 'none'
};

const market = {
  population: 1000000,
  avg_household_size: 2.8,
  vehicle_ownership_rate: 0.35,
  baseline_replacement_rate: 0.003,
  first_time_buyer_rate: 0.0005,
  purchase_need_intensity: 1.0,
  economic_multiplier: 1.0,
  average_income: 44000,
  vehicle_price_comfort_ratio: 0.8,
  distribution_strength: 0.7
};

const population = Number(market.population);
const avgHouseholdSize = Number(market.avg_household_size);
const totalHouseholds = Math.floor(population / avgHouseholdSize);

const ownershipRate = Number(market.vehicle_ownership_rate);
const vehicleHoldingHouseholds = Math.floor(totalHouseholds * ownershipRate);
const nonVehicleHouseholds = Math.max(0, totalHouseholds - vehicleHoldingHouseholds);

const replacementRate = Number(market.baseline_replacement_rate);
const firstTimeRate = Number(market.first_time_buyer_rate);

const replacementBuyers = Math.floor(vehicleHoldingHouseholds * replacementRate);
const firstTimeBuyers = Math.floor(nonVehicleHouseholds * firstTimeRate);

const needIntensity = Number(market.purchase_need_intensity);
const rawCapacity = (replacementBuyers + firstTimeBuyers) * needIntensity;
const marketPurchaseCapacity = Math.floor(rawCapacity * Number(market.economic_multiplier));

console.log('marketPurchaseCapacity:', marketPurchaseCapacity);

let totalRawBuyerInterest = 0;

for (const segmentKey of Object.keys(MARKET_SEGMENTS)) {
  const segment = MARKET_SEGMENTS[segmentKey];

  const segmentCapacity = marketPurchaseCapacity * segment.populationShare;

  const baseComfortRatio = Number(market.vehicle_price_comfort_ratio);
  const segmentBuyingPower = (segment.priceCeiling / 34000) * Number(market.average_income) * baseComfortRatio;
  
  const priceRatio = alloc.sale_price / Math.max(segmentBuyingPower, 1);
  const priceSens = segment.priceSensitivity;
  
  let affordability = priceRatio <= 1.0
    ? 1.0
    : Math.max(0, Math.exp(-priceSens * 2.0 * (priceRatio - 1.0)));

  const relScore = (Number(alloc.reliability_score) / 65) * segment.scoreWeights.reliability;
  const perfScore = (Number(alloc.performance_score) / 65) * segment.scoreWeights.performance;
  const fuelScore = (Number(alloc.fuel_efficiency_score) / 65) * segment.scoreWeights.fuel_efficiency;
  const safeScore = (Number(alloc.safety_score) / 65) * segment.scoreWeights.safety;
  const appScore = (Number(alloc.appeal_score) / 65) * segment.scoreWeights.appeal;
  const cargoScore = (Number(alloc.cargo_score) / 65) * segment.scoreWeights.cargo_utility;

  const weightSum = segment.scoreWeights.reliability + segment.scoreWeights.performance + segment.scoreWeights.fuel_efficiency + segment.scoreWeights.safety + segment.scoreWeights.appeal + segment.scoreWeights.cargo_utility;
  const fitRaw = (relScore + perfScore + fuelScore + safeScore + appScore + cargoScore) / weightSum;

  const allocSegment = alloc.target_segment.toLowerCase();
  const isTargetMatch = allocSegment === segment.id;
  
  const FIT_EXP = 4.0;
  let fitEff = Math.pow(fitRaw, FIT_EXP) * (isTargetMatch ? segment.targetFitBonus : 1.0);
  const appealNorm = Number(alloc.appeal_score) / 65;
  if (segment.minAppeal > 0 && appealNorm < segment.minAppeal) {
    fitEff *= Math.pow(appealNorm / segment.minAppeal, 2);
  }

  const VALUE_K = 1.6;
  const priceLevel = alloc.sale_price / segment.priceCeiling;
  const valueForMoney = Math.max(0, Math.min(1.15, (fitRaw + 0.15) / (priceLevel * VALUE_K + 0.15)));

  const awarenessMult = 0.35;
  const trustMult = 0.20;
  const distMult = 0.7;
  const mktMult = 1.0;

  const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult;
  totalRawBuyerInterest += Math.max(0, segmentBaseInterest);
}

console.log('totalRawBuyerInterest:', totalRawBuyerInterest);
