const fs = require('fs');

const orig = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

// The lines we want to replace are from:
//   public static simulateSalesDemand(
// to
//   } // End of processManufacturingArc (actually the closing brace for processManufacturingArc)

const startSimulate = orig.indexOf('  public static simulateSalesDemand(');
const startProcess = orig.indexOf('  public static async processManufacturingArc(');
const endProcess = orig.indexOf('    } catch (error: any) {', startProcess);
const closingBrace = orig.indexOf('  }', endProcess) + 3;

const part1 = orig.substring(0, startSimulate);
const part3 = orig.substring(closingBrace);

const newSimulate = `
  public static simulateSalesDemand(
    marketAllocations: any[],
    brandMap: Map<string, { awareness: number, reputation: number }>,
    MARKETING_MULT: Record<string, number>,
    salesManagerBonusMap: Map<string, number>
  ) {
    const allocationsByMarket = new Map<string, any[]>();
    for (const alloc of marketAllocations) {
      if (!allocationsByMarket.has(alloc.region_market_id)) {
        allocationsByMarket.set(alloc.region_market_id, []);
      }
      allocationsByMarket.get(alloc.region_market_id)!.push(alloc);
    }

    const modelDemandsList: any[] = [];

    for (const [marketId, allocs] of allocationsByMarket.entries()) {
      const market = allocs[0];

      // Market Capacity Calculation (Total)
      const population = Number(market.population);
      const avgHouseholdSize = Number(market.avg_household_size) || 2.8;
      const totalHouseholds = Math.floor(population / avgHouseholdSize);
      
      const ownershipRate = Number(market.vehicle_ownership_rate) || 0.35;
      const vehicleHoldingHouseholds = Math.floor(totalHouseholds * ownershipRate);
      const nonVehicleHouseholds = Math.max(0, totalHouseholds - vehicleHoldingHouseholds);
      
      const replacementRate = Number(market.baseline_replacement_rate) || 0.003;
      const firstTimeRate = Number(market.first_time_buyer_rate) || 0.0005;
      
      const replacementBuyers = Math.floor(vehicleHoldingHouseholds * replacementRate);
      const firstTimeBuyers = Math.floor(nonVehicleHouseholds * firstTimeRate);
      
      const needIntensity = Number(market.purchase_need_intensity) || 1.0;
      const rawCapacity = (replacementBuyers + firstTimeBuyers) * needIntensity;
      const marketPurchaseCapacity = Math.floor(rawCapacity * Number(market.economic_multiplier));

      let combinedDemandTarget = 0;
      const modelDemands = [];

      for (const alloc of allocs) {
        const salePrice = Number(alloc.sale_price);

        const brandKey = \`\${alloc.company_id}_\${market.region_market_id}\`;
        const localBrand = brandMap.get(brandKey);
        const localAwareness = localBrand ? Number(localBrand.awareness) : 0;
        const localTrust = localBrand ? Number(localBrand.reputation) : 0;
        
        const awarenessMult = 0.35 + 0.65 * (localAwareness / 100);
        const trustMult = Math.max(0.20, localTrust / 100);
        const distMult = Number(market.distribution_strength) || 0.7;

        const mktTier = alloc.marketing_tier || 'none';
        const mktMult = MARKETING_MULT[mktTier] ?? 1.0;
        
        const salesManagerBonus = salesManagerBonusMap.get(alloc.company_id) || 0;

        let totalRawBuyerInterest = 0;
        const segmentInterest: Record<string, number> = {};

        for (const segmentKey of Object.keys(MARKET_SEGMENTS)) {
          const segment = MARKET_SEGMENTS[segmentKey];

          const segmentCapacity = marketPurchaseCapacity * segment.populationShare;

          const baseComfortRatio = Number(market.vehicle_price_comfort_ratio) || 0.8;
          const segmentBuyingPower = (segment.priceCeiling / 35000) * Number(market.average_income) * baseComfortRatio;
          
          const priceRatio = salePrice / Math.max(segmentBuyingPower, 1);
          const priceSens = segment.priceSensitivity;
          
          let affordability = priceRatio <= 1.0
            ? 1.0
            : Math.max(0, Math.exp(-priceSens * 2.0 * (priceRatio - 1.0)));

          const relScore = (Number(alloc.reliability_score) / 65) * segment.scoreWeights.reliability;
          const perfScore = (Number(alloc.performance_score) / 65) * segment.scoreWeights.performance;
          const fuelScore = (Number(alloc.fuel_efficiency_score) / 65) * segment.scoreWeights.fuel_efficiency;
          const safeScore = (Number(alloc.safety_score ?? 50) / 65) * segment.scoreWeights.safety;
          const appScore = (Number(alloc.appeal_score) / 65) * segment.scoreWeights.appeal;
          const cargoScore = (Number(alloc.cargo_score || 30) / 65) * segment.scoreWeights.cargo_utility;

          const weightSum = segment.scoreWeights.reliability + segment.scoreWeights.performance + segment.scoreWeights.fuel_efficiency + segment.scoreWeights.safety + segment.scoreWeights.appeal + segment.scoreWeights.cargo_utility;
          const fitRaw = (relScore + perfScore + fuelScore + safeScore + appScore + cargoScore) / weightSum;

          const allocSegment = (alloc.target_segment || '').toLowerCase();
          const isTargetMatch = allocSegment === segment.id;
          
          const FIT_EXP = 4.0;
          let fitEff = Math.pow(fitRaw, FIT_EXP) * (isTargetMatch ? segment.targetFitBonus : 1.0);
          const appealNorm = Number(alloc.appeal_score) / 65;
          if (segment.minAppeal > 0 && appealNorm < segment.minAppeal) {
            fitEff *= Math.pow(appealNorm / segment.minAppeal, 2); 
          }

          const VALUE_K = 1.6;
          const priceLevel = salePrice / segment.priceCeiling;
          const valueForMoney = Math.max(0, Math.min(1.15, (fitRaw + 0.15) / (priceLevel * VALUE_K + 0.15)));

          const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);
          const rawSegmentInt = Math.max(0, segmentBaseInterest);
          segmentInterest[segmentKey] = rawSegmentInt;
          totalRawBuyerInterest += rawSegmentInt;
        }

        const allocatedUnits = Number(alloc.units_allocated);
        const modelDemandTarget = Math.min(allocatedUnits, Math.floor(totalRawBuyerInterest));

        combinedDemandTarget += modelDemandTarget;

        modelDemands.push({
          alloc,
          affordability: 1.0, 
          fitMultiplier: 1.0, 
          awarenessMult, trustMult, distMult, mktMult,
          rawBuyerInterest: totalRawBuyerInterest, 
          segmentInterest,
          modelDemandTarget, mktTier,
          finalAssignedDemand: 0,
          totalHouseholds,
          marketPurchaseCapacity
        });
      }

      let capacityRatio = 1.0;
      if (combinedDemandTarget > marketPurchaseCapacity && marketPurchaseCapacity > 0) {
         capacityRatio = marketPurchaseCapacity / combinedDemandTarget;
      } else if (marketPurchaseCapacity === 0) {
         capacityRatio = 0.0;
      }

      modelDemands.sort((a,b) => a.alloc.vehicle_model_id.localeCompare(b.alloc.vehicle_model_id));

      let remainingFractions = 0;
      for (const md of modelDemands) {
         let finalDemand = md.modelDemandTarget;
         if (capacityRatio < 1.0) {
            const exactDemand = md.modelDemandTarget * capacityRatio;
            finalDemand = Math.floor(exactDemand);
            remainingFractions += (exactDemand - finalDemand);
         }
         md.finalAssignedDemand = finalDemand;
      }

      let wholeFractions = Math.floor(remainingFractions);
      for (let i = 0; i < wholeFractions && i < modelDemands.length; i++) {
         modelDemands[i].finalAssignedDemand += 1;
      }

      for (const md of modelDemands) {
        const alloc = md.alloc;
        const unitsSold = md.finalAssignedDemand;

        let mainReasonCode = 'Balanced';
        if (md.rawBuyerInterest < 1.0) mainReasonCode = 'Zero Demand';
        else if (md.awarenessMult < 0.3) mainReasonCode = 'Low Brand Awareness';
        else if (md.distMult < 0.5) mainReasonCode = 'Weak Distribution';
        else if (capacityRatio < 1.0) mainReasonCode = 'Market Capacity Capped (Cannibalised)';
        else if (unitsSold === Number(alloc.units_allocated) && unitsSold > 0) mainReasonCode = 'Sold Out';
        else if (unitsSold === 0 && Number(alloc.units_allocated) > 0) mainReasonCode = 'Zero Demand';

        const marketShare = Math.min(1, unitsSold / Math.max(1, md.rawBuyerInterest));
        
        modelDemandsList.push({
          ...md,
          unitsSold,
          mainReasonCode,
          marketShare,
          marketPurchaseCapacity,
          totalHouseholds,
          replacementBuyers,
          firstTimeBuyers
        });
      }
    }
    
    return modelDemandsList;
  }
`;

const helpers1 = fs.readFileSync('temp_helpers1.ts', 'utf8');
const helpers3 = fs.readFileSync('temp_helpers3.ts', 'utf8');
const processStr = fs.readFileSync('temp_process.ts', 'utf8');

const finalCode = part1 + newSimulate + '\n' + helpers1 + '\n' + helpers3 + '\n' + processStr + '\n' + part3;

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', finalCode);
console.log('Successfully wrote controller');
