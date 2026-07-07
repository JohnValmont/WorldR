const fs = require('fs');
const file = 'd:/WorldR/frontend/src/app/drennia/business/ManufacturingDeskTab.tsx';
let c = fs.readFileSync(file, 'utf8');

const calcStr = `
function clamp01(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calcLiveEngineering(design: {
  vehicleClass: string; platform: string; powerUnit: string;
  drivetrain: string; interiorTier: string; safetyTier: string;
  qualityTarget: string; priorities: Record<string, number>;
  budgetAlloc: Record<string, number>; totalBudget: number;
  engineerCount: number;
}, bootstrapData: any) {
  const { vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget, priorities, budgetAlloc, totalBudget, engineerCount } = design;
  const platDef = bootstrapData?.platforms?.find((p: any) => p.id === platform) || {};
  const pwrDef  = bootstrapData?.powerUnits?.find((p: any) => p.id === powerUnit) || {};
  const drvDef  = bootstrapData?.drivetrains?.find((p: any) => p.id === drivetrain) || {};
  const intDef  = bootstrapData?.interiorTiers?.find((p: any) => p.id === interiorTier) || {};
  const safDef  = bootstrapData?.safetyTiers?.find((p: any) => p.id === safetyTier) || {};
  const qualDef = bootstrapData?.qualityTargets?.find((p: any) => p.id === qualityTarget) || {};

  const NEUTRAL_PRIORITY = 100 / 6;

  // Component costs
  const rawCost = ((platDef?.baseCost ?? 12000) + (pwrDef?.baseCost ?? 2500) + (drvDef?.baseCost ?? 0) + (intDef?.baseCost ?? 0) + (safDef?.baseCost ?? 0)) * (qualDef?.costMultiplier ?? 1.0);

  // Base scores
  let baseRel  = 50 + (safDef?.reliabilityMod ?? 0) + (qualDef?.reliabilityMod ?? 0) + (platDef?.reliabilityMod ?? 0) + (pwrDef?.reliabilityMod ?? 0);
  let basePerf = 40 + (pwrDef?.performanceMod ?? 0) + (drvDef?.performanceMod ?? 0) + (platDef?.performanceMod ?? 0) + (vehicleClass === 'Compact Car' ? 5 : 0);
  let baseFuel = 60 + (pwrDef?.fuelMod ?? 0) + (drvDef?.fuelMod ?? 0) + (platDef?.fuelMod ?? 0) + (vehicleClass === 'Compact Car' ? 8 : 0) + (vehicleClass === 'Utility Van' ? -10 : 0);
  let baseAppeal = 45 + (intDef?.appealMod ?? 0) + (safDef?.appealMod ?? 0) + (platDef?.appealMod ?? 0) + (qualDef?.appealMod ?? 0) + (vehicleClass === 'Sedan' ? 8 : 0);
  let baseCargo = 30 + (platDef?.cargoMod ?? 0) + (drvDef?.cargoMod ?? 0) + (vehicleClass === 'Utility Van' ? 35 : 0) + (vehicleClass === 'Compact Car' ? -10 : 0);
  let baseSafety = 50 + (safDef?.safetyMod ?? 0) + (platDef?.safetyMod ?? 0);

  // Vehicle weight
  const classWeights: Record<string, number> = { 'Compact Car': 1050, 'Sedan': 1250, 'Utility Van': 1800, 'SUV': 1600, 'Sports Car': 1300, 'Pickup Truck': 1900 };
  let weight = (classWeights[vehicleClass] ?? 1200) + (platDef?.weightKg ?? 0) + (pwrDef?.weightKg ?? 150) + (drvDef?.weightKg ?? 0) + (intDef?.weightKg ?? 0) + (safDef?.weightKg ?? 0);
  
  const perfPri = priorities['performance'] ?? NEUTRAL_PRIORITY;
  const fuelPri = priorities['fuel_economy'] ?? NEUTRAL_PRIORITY;
  const practPri = priorities['practicality'] ?? NEUTRAL_PRIORITY;
  const relPri   = priorities['reliability']    ?? NEUTRAL_PRIORITY;
  const comfPri  = priorities['comfort']        ?? NEUTRAL_PRIORITY;
  const mfgPri   = priorities['mfg_simplicity'] ?? NEUTRAL_PRIORITY;

  weight = weight * (1 + (perfPri - NEUTRAL_PRIORITY) * 0.0008);
  weight = weight * (1 - (fuelPri - NEUTRAL_PRIORITY) * 0.0005);
  weight = weight * (1 - (practPri - NEUTRAL_PRIORITY) * 0.0002);
  weight = Math.round(Math.max(800, weight));

  // Complexity
  const engComplexity   = clamp01(50 + (platDef?.complexityMod ?? 0) + (pwrDef?.complexityMod ?? 0) + (safDef?.complexityMod ?? 0) + (intDef?.complexityMod ?? 0) + (vehicleClass === 'Utility Van' ? 5 : vehicleClass === 'Compact Car' ? -5 : 0) + (drvDef?.complexityMod ?? 0) * 0.5, 20, 100);
  const mfgComplexity   = clamp01(40 + (qualDef?.mfgComplexityMod ?? 0) + (drvDef?.complexityMod ?? 0) * 0.6 + (intDef?.complexityMod ?? 0) * 0.4 + (vehicleClass === 'Utility Van' ? 8 : 0), 15, 100);
  const assemblyComplexity = clamp01(35 + (drvDef?.assemblyComplexityMod ?? 0) + (intDef?.assemblyComplexityMod ?? 0) + (safDef?.complexityMod ?? 0) * 0.5, 10, 100);

  const relBonus    = (relPri - NEUTRAL_PRIORITY) * 0.4;
  const perfBonus   = (perfPri - NEUTRAL_PRIORITY) * 0.45;
  const fuelBonus   = (fuelPri - NEUTRAL_PRIORITY) * 0.4;
  const fuelPerfPenalty = (perfPri - NEUTRAL_PRIORITY) * 0.25;
  const perfFuelPenalty = (fuelPri - NEUTRAL_PRIORITY) * 0.15;
  const appealBonus = (comfPri - NEUTRAL_PRIORITY) * 0.35;
  const cargoBonus  = (practPri - NEUTRAL_PRIORITY) * 0.4;

  // Budget pcts
  const totalAlloc = Object.values(budgetAlloc).reduce((s, v) => s + Number(v), 0);
  const getBudgetPct = (key: string, def: number) => totalAlloc > 0 ? Number(budgetAlloc[key] ?? 0) / totalAlloc : def;
  
  const testingPct = getBudgetPct('testing', 0.20);
  const protoValidationPct = getBudgetPct('prototype_validation', 0.10);
  const productionEngPct = getBudgetPct('production_eng', 0.15);
  const safetyBudgetPct = getBudgetPct('safety', 0.12);
  const powertrainBudgetPct = getBudgetPct('powertrain', 0.18);
  const interiorBudgetPct = getBudgetPct('interior', 0.10);

  const testingEffect = (testingPct - 0.20) * 60;
  const protoEffect   = (protoValidationPct - 0.10) * 50;
  const prodEngEffect = (productionEngPct - 0.15) * 40;
  const safetyBudgetEffect = (safetyBudgetPct - 0.12) * 30;
  const powertrainBudgetEff = (powertrainBudgetPct - 0.18) * 25;
  const interiorBudgetEff = (interiorBudgetPct - 0.10) * 20;

  // Engineer bonuses
  const engineerDiscount = Math.min(engineerCount * 0.05, 0.20);
  const engSkill = Math.min(Math.floor(engineerCount / 2), 5) * 0.015;
  const knowledgeDomainBonus = 0; // Simplified for frontend live preview

  // Mfg friendliness
  const mfgFriendliness = clamp01(60 + (mfgPri - NEUTRAL_PRIORITY) * 0.5 + prodEngEffect - (assemblyComplexity - 35) * 0.3 - (mfgComplexity - 40) * 0.2 + knowledgeDomainBonus * 5, 10, 100);

  // Engineering risk
  const engRisk = clamp01(engComplexity * 0.3 + assemblyComplexity * 0.1 + (perfPri - NEUTRAL_PRIORITY) * 0.3 - (relPri - NEUTRAL_PRIORITY) * 0.35 - testingEffect * 0.5 - engineerCount * 2.5 - knowledgeDomainBonus * 8, 5, 95);

  // Prototype confidence
  const protoConfidence = clamp01(100 - engRisk * 0.7 + protoEffect * 0.8 + testingEffect * 0.4 + engSkill * 30 + knowledgeDomainBonus * 10, 30, 98);

  const confMult = 0.95 + (protoConfidence / 100) * 0.10;
  const knowledgeMult = 1.0 + knowledgeDomainBonus * 0.15;
  const engMult  = 1.0 + engSkill;
  const combinedMult = confMult * knowledgeMult * engMult;

  // Final scores with priority boosts
  const finalRel    = clamp01(Math.round((baseRel + relBonus + testingEffect * 0.6 + safetyBudgetEffect * 0.3) * combinedMult), 10, 100);
  const finalPerf   = clamp01(Math.round((basePerf + perfBonus + powertrainBudgetEff * 0.5) * combinedMult), 10, 100);
  const finalFuel   = clamp01(Math.round((baseFuel + fuelBonus - fuelPerfPenalty - perfFuelPenalty - Math.max(0, weight - 1200) * 0.04) * combinedMult), 10, 100);
  const finalAppeal = clamp01(Math.round((baseAppeal + appealBonus + interiorBudgetEff * 0.5) * combinedMult), 10, 100);
  const finalCargo  = clamp01(Math.round((baseCargo + cargoBonus) * combinedMult), 5, 100);
  const finalSafety = clamp01(Math.round((baseSafety + safetyBudgetEffect * 0.6) * combinedMult), 10, 100);

  // Production cost mult
  const prodCostMult = clamp01(1.0 + (mfgComplexity - 40) * 0.003 - (mfgPri - NEUTRAL_PRIORITY) * 0.008 - prodEngEffect * 0.005, 0.85, 1.30);
  const mfgCostPerUnit = Math.round(rawCost * prodCostMult);

  // Dev cost
  let priorityCostMult = 1.0;
  for (const [pid, pts] of Object.entries(priorities)) {
    const delta = (Number(pts) - NEUTRAL_PRIORITY) / 10;
    const perPriCostMap: Record<string, number> = { reliability: 0.02, performance: 0.025, fuel_economy: 0.01, comfort: 0.015, practicality: 0.01, mfg_simplicity: 0.005 };
    priorityCostMult += delta * (perPriCostMap[pid] ?? 0);
  }
  const devCost = Math.round(totalBudget * priorityCostMult * (1 - engineerDiscount));

  // Dev time
  const testingArcs = (testingPct >= 0.15 || engComplexity > 65) ? 1 : 0;
  const devTimeArcs = 1 + 1 + testingArcs;

  // Balance flags
  const flags: string[] = [];
  if (qualityTarget === 'budget' && interiorTier === 'premium') flags.push('Target Market Conflict: Budget quality + premium interior');
  if (qualityTarget === 'budget' && powerUnit === 'v6') flags.push('Reliability Risk: High-performance engine in budget vehicle');
  if (qualityTarget === 'premium' && platform === 'economy' && safetyTier === 'standard') flags.push('Underengineered for Segment: Premium quality + economy platform');
  if ((priorities['performance'] ?? 0) >= 35 && (priorities['reliability'] ?? 0) <= 10) flags.push('Engineering Imbalance: High performance + very low reliability');
  if ((priorities['fuel_economy'] ?? 0) >= 30 && powerUnit === 'v6') flags.push('Spec Conflict: Fuel economy priority + V6 engine');
  if ((priorities['comfort'] ?? 0) >= 30 && interiorTier === 'basic') flags.push('Priority-Spec Conflict: High comfort priority requires at least a Comfort interior tier to be effective');
  const isDrivePwrHeavy = drivetrain === 'awd';
  const isHeavyPwrUnit = powerUnit === 'v6';
  if ((priorities['fuel_economy'] ?? 0) >= 30 && isDrivePwrHeavy && isHeavyPwrUnit) flags.push('Weight Conflict: AWD + V6 significantly increases weight');

  return {
    cost: mfgCostPerUnit, devCost, devTimeArcs,
    rel: finalRel, perf: finalPerf, fuel: finalFuel, appeal: finalAppeal, cargo: finalCargo, safety: finalSafety,
    engineeringComplexity: Math.round(engComplexity), manufacturingComplexity: Math.round(mfgComplexity),
    assemblyComplexity: Math.round(assemblyComplexity), vehicleWeightKg: weight,
    mfgFriendliness: Math.round(mfgFriendliness), engineeringRisk: Math.round(engRisk),
    protoConfidence: Math.round(protoConfidence), balanceFlags: flags,
  };
}
`;

const s = c.indexOf('function calcLiveEngineering(design: {');
if (s > -1) {
  let r = c.indexOf('return {', s);
  let e = c.indexOf('};\\n}', r);
  if (e === -1) {
    e = c.indexOf('};\\r\\n}', r);
  }
  if (e > -1) {
    c = c.substring(0, s) + calcStr.trim() + c.substring(e + 5); // +5 to skip '};\\n}'
  } else {
    console.log("Could not find end bracket!");
  }
} else {
  console.log("Could not find start!");
}

// Remove old clamp01 if it existed
c = c.replace(/function clamp01[\s\S]*?\}\s*function calcLiveEngineering/g, 'function calcLiveEngineering');
c = c.replace(/const NEUTRAL_PRI = [^\n]*\n/, ''); // clean up old NEUTRAL_PRI

fs.writeFileSync(file, c);
