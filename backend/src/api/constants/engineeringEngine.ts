/**
 * WORLDr — Engineering Engine
 * Phase 3: Vehicle Engineering Depth
 *
 * Pure calculation module — no DB access, no side effects.
 * All engineering outcomes are derived from this single function.
 *
 * Philosophy: Two identical vehicle specs with different priorities
 * and budgets should produce meaningfully different vehicles.
 */

import {
  PLATFORMS,
  POWER_UNITS,
  DRIVETRAINS,
  INTERIOR_TIERS,
  SAFETY_TIERS,
  QUALITY_TARGETS,
  VEHICLE_CLASS_BASE_WEIGHTS,
  ENGINEERING_PRIORITIES,
  BUDGET_BUCKETS,
  KNOWLEDGE_LEVEL_XP,
} from '../constants/manufacturing';

// ─── Input types ─────────────────────────────────────────────────────────────

export interface EngineeringDesign {
  vehicleClass: string;
  platform: string;
  powerUnit: string;
  drivetrain: string;
  interiorTier: string;
  safetyTier: string;
  qualityTarget: string;

  /** Engineering priorities — must sum to 100 */
  priorities: Record<string, number>;

  /** Budget allocation per bucket (raw currency values, not percentages) */
  budgetAlloc: Record<string, number>;

  /** Total development budget (from country config) */
  totalBudget: number;

  /** Applied engineering package (legacy, optional) */
  appliedEngineeringPackage?: string;
}

export interface EngineerContext {
  engineerCount: number;
  /** 0–5 level; comes from automotive-engineer staff count scaling */
  engineerSkillLevel: number;
  /** Company knowledge XP per domain */
  companyKnowledge: Record<string, number>;
  /** Current month number (for timing calculations) */
  currentMonth: number;
  currentYear: number;
}

export interface EngineeringOutcome {
  // Final vehicle scores (0-100)
  finalScores: {
    reliability: number;
    performance: number;
    fuelEfficiency: number;
    appeal: number;
    cargo: number;
    safety: number;
  };

  // Complexity metrics (0-100)
  complexities: {
    engineering: number;
    manufacturing: number;
    assembly: number;
  };

  // Physical characteristics
  vehicleWeightKg: number;

  // Manufacturing metrics (0-100)
  manufacturingFriendliness: number;

  // Risk and confidence
  engineeringRisk: number;      // 0-100; higher = more risk
  prototypeConfidence: number;  // 0-100; higher = better outcomes

  // Development timeline
  devTimeArcs: number;
  stageTimings: {
    engineering: number;  // months
    prototype: number;    // months
    testing: number;      // months
  };

  // Financial
  effectiveDevCost: number;
  productionCostMultiplier: number;  // Applied to base manufacturing cost per unit

  // Quality assessment
  balanceFlags: string[];

  // Full engineering report
  engineeringReport: EngineeringReport;

  // Budget breakdown (how each bucket affected the outcome)
  budgetEffects: Record<string, string>;
}

export interface EngineeringReport {
  overallAssessment: string;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  subsystems: {
    powertrain: { score: number; notes: string };
    body: { score: number; notes: string };
    safety: { score: number; notes: string };
    interior: { score: number; notes: string };
    assembly: { score: number; notes: string };
    manufacturing: { score: number; notes: string };
  };
  riskAssessment: {
    level: 'Low' | 'Moderate' | 'High' | 'Critical';
    score: number;
    factors: string[];
  };
  prototypeConfidence: {
    score: number;
    notes: string;
  };
  recommendations: string[];
  priorityAnalysis: string;
}

// ─── Neutral priority value (equal split) ────────────────────────────────────
const NEUTRAL_PRIORITY = 100 / 6; // ~16.67

// ─── Main calculation function ────────────────────────────────────────────────

export function calculateEngineeringOutcome(
  design: EngineeringDesign,
  context: EngineerContext
): EngineeringOutcome {

  // Lookup component definitions
  const platDef = PLATFORMS.find(p => p.id === design.platform) ?? PLATFORMS[1];
  const pwrDef  = POWER_UNITS.find(p => p.id === design.powerUnit) ?? POWER_UNITS[1];
  const drvDef  = DRIVETRAINS.find(p => p.id === design.drivetrain) ?? DRIVETRAINS[0];
  const intDef  = INTERIOR_TIERS.find(p => p.id === design.interiorTier) ?? INTERIOR_TIERS[0];
  const safDef  = SAFETY_TIERS.find(p => p.id === design.safetyTier) ?? SAFETY_TIERS[0];
  const qualDef = QUALITY_TARGETS.find(p => p.id === design.qualityTarget) ?? QUALITY_TARGETS[1];

  const priorities = design.priorities;
  const budget = design.budgetAlloc;
  const totalBudget = design.totalBudget;

  // ── 1. Base scores (same as original formula) ──────────────────────────────

  const baseRel  = 50 + (safDef.reliabilityMod ?? 0) + (qualDef.reliabilityMod ?? 0) + (platDef.reliabilityMod ?? 0) + (pwrDef.reliabilityMod ?? 0);
  const basePerf = 40 + (pwrDef.performanceMod ?? 0) + (drvDef.performanceMod ?? 0) + (platDef.performanceMod ?? 0)
                      + (design.vehicleClass === 'Compact Car' ? 5 : 0);
  const baseFuel = 60 + (pwrDef.fuelMod ?? 0) + (drvDef.fuelMod ?? 0) + (platDef.fuelMod ?? 0)
                      + (design.vehicleClass === 'Compact Car' ? 8 : 0)
                      + (design.vehicleClass === 'Utility Van' ? -10 : 0);
  const baseAppeal = 45 + (intDef.appealMod ?? 0) + (safDef.appealMod ?? 0) + (platDef.appealMod ?? 0) + (qualDef.appealMod ?? 0)
                        + (design.vehicleClass === 'Sedan' ? 8 : 0);
  const baseCargo = 30 + (platDef.cargoMod ?? 0) + (drvDef.cargoMod ?? 0)
                       + (design.vehicleClass === 'Utility Van' ? 35 : 0)
                       + (design.vehicleClass === 'Compact Car' ? -10 : 0);
  const baseSafety = 50 + (safDef.safetyMod ?? 0) + (platDef.safetyMod ?? 0);

  // ── 2. Vehicle Weight ──────────────────────────────────────────────────────

  const classWeight  = VEHICLE_CLASS_BASE_WEIGHTS[design.vehicleClass] ?? 1200;
  const platWeight   = (platDef as any).weightKg ?? 0;
  const pwrWeight    = (pwrDef as any).weightKg ?? 150;
  const drvWeight    = (drvDef as any).weightKg ?? 0;
  const intWeight    = (intDef as any).weightKg ?? 0;
  const safWeight    = (safDef as any).weightKg ?? 0;

  let vehicleWeight = classWeight + platWeight + pwrWeight + drvWeight + intWeight + safWeight;

  // Priority modifiers on weight
  const perfPri    = (priorities['performance'] ?? NEUTRAL_PRIORITY);
  const fuelPri    = (priorities['fuel_economy'] ?? NEUTRAL_PRIORITY);
  const practPri   = (priorities['practicality'] ?? NEUTRAL_PRIORITY);

  vehicleWeight = vehicleWeight * (1 + (perfPri - NEUTRAL_PRIORITY) * 0.0008);
  vehicleWeight = vehicleWeight * (1 - (fuelPri - NEUTRAL_PRIORITY) * 0.0005);
  vehicleWeight = vehicleWeight * (1 - (practPri - NEUTRAL_PRIORITY) * 0.0002);
  vehicleWeight = Math.round(Math.max(800, vehicleWeight));

  // ── 3. Complexity Calculation ──────────────────────────────────────────────

  const engComplexity = clamp(
    50
    + ((platDef as any).complexityMod ?? 0)
    + ((pwrDef as any).complexityMod ?? 0)
    + ((safDef as any).complexityMod ?? 0)
    + ((intDef as any).complexityMod ?? 0)
    + (design.vehicleClass === 'Utility Van' ? 5 : design.vehicleClass === 'Compact Car' ? -5 : 0)
    + ((drvDef as any).complexityMod ?? 0) * 0.5,
    20, 100
  );

  const mfgComplexity = clamp(
    40
    + ((qualDef as any).mfgComplexityMod ?? 0)
    + ((drvDef as any).complexityMod ?? 0) * 0.6
    + ((intDef as any).complexityMod ?? 0) * 0.4
    + (design.vehicleClass === 'Utility Van' ? 8 : 0),
    15, 100
  );

  const assemblyComplexity = clamp(
    35
    + ((drvDef as any).assemblyComplexityMod ?? 0)
    + ((intDef as any).assemblyComplexityMod ?? 0)
    + ((safDef as any).complexityMod ?? 0) * 0.5,
    10, 100
  );

  // ── 4. Priority Effects on Scores ─────────────────────────────────────────

  const relPri   = priorities['reliability']   ?? NEUTRAL_PRIORITY;
  const comfPri  = priorities['comfort']       ?? NEUTRAL_PRIORITY;
  const mfgPri   = priorities['mfg_simplicity'] ?? NEUTRAL_PRIORITY;

  const relBonus    = (relPri - NEUTRAL_PRIORITY) * 0.4;
  const perfBonus   = (perfPri - NEUTRAL_PRIORITY) * 0.45;
  const fuelBonus   = (fuelPri - NEUTRAL_PRIORITY) * 0.4;
  const fuelPerfPenalty = (perfPri - NEUTRAL_PRIORITY) * 0.25;
  const perfFuelPenalty = (fuelPri - NEUTRAL_PRIORITY) * 0.15;
  const appealBonus = (comfPri - NEUTRAL_PRIORITY) * 0.35;
  const cargoBonus  = (practPri - NEUTRAL_PRIORITY) * 0.4;

  // ── 5. Budget Effects ─────────────────────────────────────────────────────

  const totalAlloc = Object.values(budget).reduce((s, v) => s + Number(v), 0);
  const getBudgetPct = (key: string) =>
    totalAlloc > 0 ? (Number(budget[key] ?? 0)) / totalAlloc : BUDGET_BUCKETS.find(b => b.id === key)?.defaultPct ?? 0.1;

  const testingPct         = getBudgetPct('testing');
  const protoValidationPct = getBudgetPct('prototype_validation');
  const productionEngPct   = getBudgetPct('production_eng');
  const safetyBudgetPct    = getBudgetPct('safety');
  const powertrainBudgetPct = getBudgetPct('powertrain');
  const interiorBudgetPct  = getBudgetPct('interior');

  // Default testing pct = 0.20. Effect is relative to that baseline.
  const testingEffect       = (testingPct - 0.20) * 60;  // ±points of reliability
  const protoEffect         = (protoValidationPct - 0.10) * 50;
  const prodEngEffect       = (productionEngPct - 0.15) * 40;  // mfg friendliness
  const safetyBudgetEffect  = (safetyBudgetPct - 0.12) * 30;
  const powertrainBudgetEff = (powertrainBudgetPct - 0.18) * 25;
  const interiorBudgetEff   = (interiorBudgetPct - 0.10) * 20;

  // ── 6. Engineer Knowledge Bonus ───────────────────────────────────────────

  const engineerDiscount = Math.min(context.engineerCount * 0.05, 0.20);
  const engineerSkillBonus = context.engineerSkillLevel * 0.015;  // +1.5% per skill level

  // Knowledge bonus (per relevant domain, 0.5% per XP level)
  const knowledgeDomainBonus = getKnowledgeBonusForDesign(design, context.companyKnowledge);

  // ── 7. Manufacturing Friendliness ─────────────────────────────────────────

  const mfgFriendliness = clamp(
    60
    + (mfgPri - NEUTRAL_PRIORITY) * 0.5
    + prodEngEffect
    - (assemblyComplexity - 35) * 0.3
    - (mfgComplexity - 40) * 0.2
    + knowledgeDomainBonus * 5,
    10, 100
  );

  // ── 8. Engineering Risk ───────────────────────────────────────────────────

  let engRisk = clamp(
    // Base: complexity-driven
    engComplexity * 0.3 + assemblyComplexity * 0.1
    // Performance priority raises risk (aggressive specs)
    + (perfPri - NEUTRAL_PRIORITY) * 0.3
    // Reliability priority and testing budget reduce risk
    - (relPri - NEUTRAL_PRIORITY) * 0.35
    - testingEffect * 0.5
    // Engineers reduce risk
    - context.engineerCount * 2.5
    - knowledgeDomainBonus * 8,
    5, 95
  );

  // ── 9. Prototype Confidence ───────────────────────────────────────────────

  const protoConfidence = clamp(
    100
    - engRisk * 0.7
    + protoEffect * 0.8
    + testingEffect * 0.4
    + engineerSkillBonus * 30
    + knowledgeDomainBonus * 10,
    30, 98
  );

  // ── 10. Final Score Composition ───────────────────────────────────────────

  const confidenceMult = 0.95 + (protoConfidence / 100) * 0.10;  // 0.95 – 1.05
  const knowledgeMult  = 1.0 + knowledgeDomainBonus * 0.15;      // 1.0 – 1.15
  const engQualMult    = 1.0 + engineerSkillBonus;                // 1.0 – 1.075

  const combinedMult = confidenceMult * knowledgeMult * engQualMult;

  // Apply legacy engineering package modifiers (backward-compatible)
  let pkgRelMod = 0; let pkgFuelMod = 0; let pkgPerfMod = 0; let pkgSafetyMod = 0; let pkgCostMod = 1.0;
  if (design.appliedEngineeringPackage === 'economy-tune') {
    pkgFuelMod = 6; pkgPerfMod = -2; pkgCostMod = 1.03;
  } else if (design.appliedEngineeringPackage === 'safety-arch') {
    pkgSafetyMod = 8; pkgCostMod = 1.05;
  } else if (design.appliedEngineeringPackage === 'durability-val') {
    pkgRelMod = 6; pkgCostMod = 1.02;
  }

  const finalScores = {
    reliability:    clamp(Math.round((baseRel + relBonus + testingEffect * 0.6 + safetyBudgetEffect * 0.3 + pkgRelMod) * combinedMult), 10, 100),
    performance:    clamp(Math.round((basePerf + perfBonus + powertrainBudgetEff * 0.5 + pkgPerfMod) * combinedMult), 10, 100),
    fuelEfficiency: clamp(Math.round((baseFuel + fuelBonus - fuelPerfPenalty - perfFuelPenalty + pkgFuelMod
                          // Weight penalty on fuel: -0.05 per kg over 1200
                          - Math.max(0, vehicleWeight - 1200) * 0.04) * combinedMult), 10, 100),
    appeal:         clamp(Math.round((baseAppeal + appealBonus + interiorBudgetEff * 0.5) * combinedMult), 10, 100),
    cargo:          clamp(Math.round((baseCargo + cargoBonus) * combinedMult), 5, 100),
    safety:         clamp(Math.round((baseSafety + safetyBudgetEffect * 0.6 + pkgSafetyMod) * combinedMult), 10, 100),
  };

  // ── 11. Development Time ──────────────────────────────────────────────────

  // Base dev time = 1 month for engineering + 1 for prototype + optional testing month
  const engineeringArcs = 1;
  const prototypeArcs   = 1;
  // Testing month only added if testing budget >= 15% or complexity > 65
  const testingArcs     = (testingPct >= 0.15 || engComplexity > 65) ? 1 : 0;

  const stageTimings = {
    engineering: engineeringArcs,
    prototype:   prototypeArcs,
    testing:     testingArcs,
  };
  const devTimeArcs = engineeringArcs + prototypeArcs + testingArcs;

  // ── 12. Development Cost ──────────────────────────────────────────────────

  // Priority-driven cost multipliers
  let priorityCostMult = 1.0;
  for (const [pid, pts] of Object.entries(priorities)) {
    const priDef = ENGINEERING_PRIORITIES.find(p => p.id === pid);
    if (!priDef) continue;
    const delta = (Number(pts) - NEUTRAL_PRIORITY) / 10;
    priorityCostMult += delta * (priDef.effects.costMultiplierPer10 ?? 0);
  }

  // Apply engineering package cost
  priorityCostMult *= pkgCostMod;

  const effectiveDevCost = Math.round(totalBudget * priorityCostMult * (1 - engineerDiscount));

  // Production cost multiplier (mfg complexity, mfg simplicity priority)
  const productionCostMult = clamp(
    1.0
    + (mfgComplexity - 40) * 0.003
    - (mfgPri - NEUTRAL_PRIORITY) * 0.008
    - prodEngEffect * 0.005,
    0.85, 1.30
  );

  // ── 13. Vehicle Balance Flags ─────────────────────────────────────────────

  const balanceFlags = detectBalanceIssues(design, finalScores, priorities);

  // ── 14. Engineering Report ────────────────────────────────────────────────

  const engineeringReport = generateEngineeringReport(
    design, finalScores, { engineering: engComplexity, manufacturing: mfgComplexity, assembly: assemblyComplexity },
    vehicleWeight, mfgFriendliness, engRisk, protoConfidence, balanceFlags,
    priorities, { testing: testingPct, proto: protoValidationPct, prodEng: productionEngPct },
    context
  );

  // ── 15. Budget Effects Summary ────────────────────────────────────────────

  const budgetEffects: Record<string, string> = {
    testing: testingEffect > 3 ? `High testing budget improved reliability by ~${Math.round(testingEffect * 0.6)} pts`
             : testingEffect < -3 ? `Low testing budget reduced reliability by ~${Math.round(Math.abs(testingEffect * 0.6))} pts`
             : 'Testing budget at recommended level',
    prototype_validation: protoEffect > 2 ? `High prototype investment boosted confidence to ${Math.round(protoConfidence)}%`
             : 'Standard prototype programme',
    production_eng: prodEngEffect > 3 ? 'Production engineering investment improved manufacturing friendliness'
             : prodEngEffect < -3 ? 'Low production engineering reduces manufacturing friendliness'
             : 'Standard production engineering',
  };

  return {
    finalScores,
    complexities: {
      engineering: Math.round(engComplexity * 10) / 10,
      manufacturing: Math.round(mfgComplexity * 10) / 10,
      assembly: Math.round(assemblyComplexity * 10) / 10,
    },
    vehicleWeightKg: vehicleWeight,
    manufacturingFriendliness: Math.round(mfgFriendliness * 10) / 10,
    engineeringRisk: Math.round(engRisk * 10) / 10,
    prototypeConfidence: Math.round(protoConfidence * 10) / 10,
    devTimeArcs,
    stageTimings,
    effectiveDevCost,
    productionCostMultiplier: Math.round(productionCostMult * 1000) / 1000,
    balanceFlags,
    engineeringReport,
    budgetEffects,
  };
}

// ─── Balance Issue Detector ───────────────────────────────────────────────────

function detectBalanceIssues(
  design: EngineeringDesign,
  scores: { reliability: number; performance: number; fuelEfficiency: number; appeal: number; cargo: number; safety: number },
  priorities: Record<string, number>
): string[] {
  const flags: string[] = [];
  const { vehicleClass, interiorTier, qualityTarget, powerUnit, platform, safetyTier } = design;

  // Budget car with luxury interior
  if (qualityTarget === 'budget' && interiorTier === 'premium') {
    flags.push('Target Market Conflict: Budget quality with premium interior creates inconsistent product positioning');
  }

  // Budget segment + high performance engine
  if (qualityTarget === 'budget' && powerUnit === 'v6') {
    flags.push('Reliability Risk: High-performance engine in budget-quality vehicle increases defect probability');
  }

  // Premium segment + economy platform + standard safety
  if (qualityTarget === 'premium' && platform === 'economy' && safetyTier === 'standard') {
    flags.push('Underengineered for Segment: Premium quality target with economy platform and standard safety is difficult to market');
  }

  // Utility Van + premium interior
  if (vehicleClass === 'Utility Van' && interiorTier === 'premium') {
    flags.push('Application Mismatch: Premium interior on a utility van rarely justifies the cost premium for commercial buyers');
  }

  // Very high performance + low reliability priority
  if ((priorities['performance'] ?? 0) >= 35 && (priorities['reliability'] ?? 0) <= 10) {
    flags.push('Engineering Imbalance: High performance focus with very low reliability priority creates long-term ownership risk');
  }

  // High fuel economy priority + V6 engine (conflicting)
  if ((priorities['fuel_economy'] ?? 0) >= 30 && powerUnit === 'v6') {
    flags.push('Specification Conflict: Fuel economy priority with a V6 engine — consider Inline-4 for better efficiency alignment');
  }

  // High comfort + basic interior (conflicting)
  if ((priorities['comfort'] ?? 0) >= 30 && interiorTier === 'basic') {
    flags.push('Priority-Spec Conflict: High comfort priority requires at least a Comfort interior tier to be effective');
  }

  // Very heavy vehicle + fuel economy priority
  const classWeight = VEHICLE_CLASS_BASE_WEIGHTS[vehicleClass] ?? 1200;
  const isDrivePwrHeavy = design.drivetrain === 'awd';
  const isHeavyPwrUnit = powerUnit === 'v6';
  if ((priorities['fuel_economy'] ?? 0) >= 30 && isDrivePwrHeavy && isHeavyPwrUnit) {
    flags.push('Weight Conflict: AWD + V6 significantly increases weight, limiting achievable fuel economy despite priority focus');
  }

  return flags;
}

// ─── Engineering Report Generator ─────────────────────────────────────────────

function generateEngineeringReport(
  design: EngineeringDesign,
  scores: { reliability: number; performance: number; fuelEfficiency: number; appeal: number; cargo: number; safety: number },
  complexities: { engineering: number; manufacturing: number; assembly: number },
  vehicleWeight: number,
  mfgFriendliness: number,
  engRisk: number,
  protoConfidence: number,
  balanceFlags: string[],
  priorities: Record<string, number>,
  budgetPcts: { testing: number; proto: number; prodEng: number },
  context: EngineerContext
): EngineeringReport {

  const riskLevel: EngineeringReport['riskAssessment']['level'] =
    engRisk >= 70 ? 'Critical' : engRisk >= 50 ? 'High' : engRisk >= 30 ? 'Moderate' : 'Low';

  const riskFactors: string[] = [];
  if (complexities.engineering > 70) riskFactors.push('High engineering complexity adds integration risk');
  if ((priorities['performance'] ?? 0) >= 35) riskFactors.push('Aggressive performance targets increase development risk');
  if (budgetPcts.testing < 0.12) riskFactors.push('Below-recommended testing budget may leave defects undetected');
  if (context.engineerCount === 0) riskFactors.push('No automotive engineers on staff — development risk is elevated');
  if (complexities.assembly > 65) riskFactors.push('Complex assembly increases production defect probability');
  if (riskFactors.length === 0) riskFactors.push('Risk profile is within acceptable engineering parameters');

  const recommendations: string[] = [];
  if (mfgFriendliness < 45) recommendations.push('Increase Manufacturing Simplicity priority or production engineering budget to improve build efficiency');
  if (engRisk > 60) recommendations.push('Increase testing budget or reduce performance targets to lower engineering risk');
  if (scores.reliability < 55) recommendations.push('Reliability score is below market expectations — increase reliability priority or testing programme');
  if (balanceFlags.length > 0) recommendations.push('Address vehicle balance issues identified in the assessment');
  if (context.engineerCount === 0) recommendations.push('Hire at least one Automotive Engineer to reduce development cost and risk');
  if (budgetPcts.proto < 0.08) recommendations.push('Prototype validation budget is very low — increase to improve launch confidence');
  if (recommendations.length === 0) recommendations.push('Vehicle specification is well-balanced. Proceed to production planning.');

  const avgScore = (scores.reliability + scores.performance + scores.fuelEfficiency + scores.appeal) / 4;
  const overallGrade: EngineeringReport['overallGrade'] =
    avgScore >= 80 ? 'A' : avgScore >= 65 ? 'B' : avgScore >= 50 ? 'C' : avgScore >= 35 ? 'D' : 'F';

  const assessments: Record<EngineeringReport['overallGrade'], string> = {
    'A': 'Excellent engineering execution. Vehicle is well-positioned for its target segment.',
    'B': 'Good engineering programme. Minor optimisations could improve outcomes.',
    'C': 'Acceptable result. Several areas could benefit from additional investment.',
    'D': 'Below average. Significant engineering shortfalls detected — review priorities.',
    'F': 'Engineering programme has failed to meet minimum standards. Recommend redesign.',
  };

  const powertrainNotes = scores.performance >= 70
    ? `${design.powerUnit === 'v6' ? 'V6' : 'Inline-4'} is well-matched to the vehicle's power requirements`
    : `${design.powerUnit === 'v6' ? 'V6' : 'Inline-4'} performance could be improved with higher powertrain budget allocation`;

  const assemblyNotes = complexities.assembly < 45
    ? 'Assembly complexity is manageable — good design for manufacture'
    : complexities.assembly > 70
    ? 'High assembly complexity will require skilled technicians and increases defect risk'
    : 'Assembly complexity is within normal parameters';

  const mfgNotes = mfgFriendliness >= 65
    ? 'Strong manufacturing friendliness — design is optimised for efficient production'
    : mfgFriendliness >= 45
    ? 'Adequate manufacturing friendliness — consider production engineering investment for improvement'
    : 'Poor manufacturing friendliness — this vehicle will be expensive and slow to build';

  const priorityDominant = Object.entries(priorities).sort((a, b) => b[1] - a[1])[0];
  const priorityAnalysis = `Engineering emphasis on ${priorityDominant[0].replace(/_/g, ' ')} (${priorityDominant[1]} pts) is the defining characteristic of this vehicle's development programme.`;

  return {
    overallAssessment: assessments[overallGrade],
    overallGrade,
    subsystems: {
      powertrain:    { score: Math.round((scores.performance * 0.7 + scores.fuelEfficiency * 0.3)), notes: powertrainNotes },
      body:          { score: Math.round((scores.reliability * 0.5 + scores.safety * 0.5)), notes: `Body structure achieves ${scores.safety}/100 safety score` },
      safety:        { score: scores.safety, notes: `${design.safetyTier.charAt(0).toUpperCase() + design.safetyTier.slice(1)} safety system with ${scores.safety >= 70 ? 'strong' : 'adequate'} occupant protection` },
      interior:      { score: scores.appeal, notes: `${design.interiorTier.charAt(0).toUpperCase() + design.interiorTier.slice(1)} interior achieving ${scores.appeal}/100 appeal` },
      assembly:      { score: Math.round(100 - complexities.assembly), notes: assemblyNotes },
      manufacturing: { score: Math.round(mfgFriendliness), notes: mfgNotes },
    },
    riskAssessment: {
      level: riskLevel,
      score: Math.round(engRisk),
      factors: riskFactors,
    },
    prototypeConfidence: {
      score: Math.round(protoConfidence),
      notes: protoConfidence >= 75
        ? 'High prototype confidence — vehicle performance estimates are reliable'
        : protoConfidence >= 55
        ? 'Moderate prototype confidence — actual production performance may vary from estimates'
        : 'Low prototype confidence — significant variation expected between prototype and production specification',
    },
    recommendations,
    priorityAnalysis,
  };
}

// ─── Knowledge Domain Bonus ───────────────────────────────────────────────────

function getKnowledgeBonusForDesign(
  design: EngineeringDesign,
  companyKnowledge: Record<string, number>
): number {
  const relevantDomains: string[] = [];

  if (design.vehicleClass === 'Compact Car' || design.platform === 'economy') {
    relevantDomains.push('economy_vehicles');
  }
  if (design.platform === 'heavy-duty' || design.vehicleClass === 'Utility Van') {
    relevantDomains.push('suv_engineering');
  }
  if (design.powerUnit === 'v6') {
    relevantDomains.push('performance_engines');
  }
  if (design.safetyTier !== 'standard') {
    relevantDomains.push('safety_systems');
  }
  if ((design.priorities['fuel_economy'] ?? 0) >= 20) {
    relevantDomains.push('lightweight_design');
  }
  if ((design.priorities['mfg_simplicity'] ?? 0) >= 20) {
    relevantDomains.push('manufacturing_engineering');
  }

  if (relevantDomains.length === 0) return 0;

  let totalLevel = 0;
  for (const domain of relevantDomains) {
    const xp = companyKnowledge[domain] ?? 0;
    const level = getKnowledgeLevel(xp);
    totalLevel += level;
  }

  // Max bonus is 1.0 (100%) at level 5 across all relevant domains
  return Math.min(totalLevel / (relevantDomains.length * 5), 1.0);
}

function getKnowledgeLevel(xp: number): number {
  let level = 0;
  for (let i = KNOWLEDGE_LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= KNOWLEDGE_LEVEL_XP[i]) { level = i; break; }
  }
  return level;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Exported helpers for frontend live calculation ──────────────────────────

/**
 * Lightweight version for real-time frontend preview.
 * Same algorithm but doesn't require full context — uses estimates.
 */
export function calculateLivePreview(
  design: Omit<EngineeringDesign, 'totalBudget'> & { totalBudget?: number },
  engineerCount: number = 0,
  companyKnowledge: Record<string, number> = {}
): Omit<EngineeringOutcome, 'engineeringReport'> & { engineeringReport: { overallGrade: string; overallAssessment: string; recommendations: string[] } } {
  const fullDesign: EngineeringDesign = {
    ...design,
    totalBudget: design.totalBudget ?? 150000,
  };
  const context: EngineerContext = {
    engineerCount,
    engineerSkillLevel: Math.min(Math.floor(engineerCount / 2), 5),
    companyKnowledge,
    currentMonth: 1,
    currentYear: 1,
  };
  const outcome = calculateEngineeringOutcome(fullDesign, context);
  return {
    ...outcome,
    engineeringReport: {
      overallGrade: outcome.engineeringReport.overallGrade,
      overallAssessment: outcome.engineeringReport.overallAssessment,
      recommendations: outcome.engineeringReport.recommendations,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Phase 3B — Engineering Consequences (Unified Engine)
// Pure helpers. No DB access. No randomness.
// ════════════════════════════════════════════════════════════════════════════

/** Canonical output type alias — the single source of truth for a vehicle's engineering. */
export type EngineeringResult = EngineeringOutcome;

// ─── 1. Production Modifiers ──────────────────────────────────────────────────

export interface ProductionModifiers {
  assemblyHoursModifier: number;
  labourCostModifier: number;
  defectModifier: number;
  maintenanceModifier: number;
  productionCostModifier: number;
  engineeringProductionNotes: string;
}

export function deriveProductionModifiers(model: {
  manufacturing_friendliness?: number | string;
  assembly_complexity?: number | string;
}): ProductionModifiers {
  const mfgFriendliness = Number(model.manufacturing_friendliness ?? 50);
  const assemblyComplexity = Number(model.assembly_complexity ?? 35);

  // High mfg friendliness reduces defect modifier and maintenance modifier.
  const defectModifier = Math.max(0.5, 1.0 - (mfgFriendliness - 50) * 0.005);
  const maintenanceModifier = Math.max(0.6, 1.0 - (mfgFriendliness - 50) * 0.004);
  const productionCostModifier = Math.max(0.8, 1.0 - (mfgFriendliness - 50) * 0.003);

  // Assembly complexity drives hours and labour cost
  const assemblyHoursModifier = Math.max(0.7, 1.0 + (assemblyComplexity - 35) * 0.005);
  const labourCostModifier = Math.max(0.8, 1.0 + (assemblyComplexity - 35) * 0.008);

  const notes: string[] = [];
  if (mfgFriendliness >= 70) notes.push('Mfg. Simplicity: Defect -%');
  if (assemblyComplexity > 60) notes.push('Assembly Complexity: Labour +%');

  return {
    assemblyHoursModifier,
    labourCostModifier,
    defectModifier,
    maintenanceModifier,
    productionCostModifier,
    engineeringProductionNotes: notes.join(' | ') || 'Standard production parameters',
  };
}

// ─── 2. Market Modifiers ──────────────────────────────────────────────────────

export interface MarketModifiers {
  fuelEconomyBoost: number;
  appealBoost: number;
  cargoBoost: number;
}

export function deriveMarketModifiers(model: {
  fuel_efficiency_score?: number | string;
  appeal_score?: number | string;
  cargo_score?: number | string;
}): MarketModifiers {
  const fuelScore   = Number(model.fuel_efficiency_score ?? 60);
  const appealScore = Number(model.appeal_score ?? 50);
  const cargoScore  = Number(model.cargo_score ?? 30);

  return {
    fuelEconomyBoost: Math.max(0.5, Math.min(1.5, 1.0 + (fuelScore - 60) * 0.005)),
    appealBoost: Math.max(0.5, Math.min(1.5, 1.0 + (appealScore - 50) * 0.005)),
    cargoBoost: Math.max(0.5, Math.min(1.5, 1.0 + (cargoScore - 30) * 0.005)),
  };
}

// ─── 3. Warranty Reserve ──────────────────────────────────────────────────────

export interface WarrantyReserveModifiers {
  warrantyReservePct: number;
  warrantyReservePerUnit: (costPerUnit: number) => number;
}

export function deriveWarrantyReserve(model: {
  reliability_score?: number | string;
}): WarrantyReserveModifiers {
  const reliabilityScore = Number(model.reliability_score ?? 60);
  // Max reserve ~2.5% for terrible cars, 0% for excellent cars (75+)
  const warrantyReservePct = Math.max(0, (75 - reliabilityScore) / 100 * 0.025);
  
  return {
    warrantyReservePct,
    warrantyReservePerUnit: (costPerUnit: number) => Math.round(costPerUnit * warrantyReservePct),
  };
}

// ─── 4. Trust Modifiers ───────────────────────────────────────────────────────

export interface TrustModifiers {
  trustDeliveryMultiplier: number;
  trustDefectMultiplier: number;
  reputationTrustSensitivityBoost: number;
  reputationDefectReduction: number;
}

export function deriveTrustModifiers(model: {
  reliability_score?: number | string;
}, reputation: {
  reliability_rep?: number | string;
  mfg_efficiency_rep?: number | string;
}): TrustModifiers {
  const reliabilityScore = Number(model.reliability_score ?? 60);
  const relRep = Number(reputation.reliability_rep ?? 0);
  const mfgRep = Number(reputation.mfg_efficiency_rep ?? 0);

  // Reliability influences Trust Gain
  const trustDeliveryMultiplier = Math.max(0.5, Math.min(1.5, 0.70 + (reliabilityScore / 100) * 0.60));
  
  // Low reliability amplifies defect penalty
  const trustDefectMultiplier = reliabilityScore < 60 ? (1 + (60 - reliabilityScore) / 100) : 1.0;

  // Engineering Reputation influences Trust Sensitivity and Defect Rates
  const reputationTrustSensitivityBoost = relRep >= 70 ? 1.15 : relRep >= 50 ? 1.07 : 1.0;
  const reputationDefectReduction = mfgRep >= 70 ? 0.002 : 0.0;

  return {
    trustDeliveryMultiplier,
    trustDefectMultiplier,
    reputationTrustSensitivityBoost,
    reputationDefectReduction,
  };
}

// ─── 5. Prototype Validation ──────────────────────────────────────────────────

export interface PrototypeValidationResult {
  passed: boolean;
  resultClass: 'Excellent' | 'Passed' | 'Minor Revision' | 'Major Revision' | 'Failure';
  issues: string[];
  extraCostPct: number;
  extraArcs: number;
  confidenceScore: number;
}

export function evaluatePrototypeValidation(model: {
  prototype_confidence?: number | string;
}): PrototypeValidationResult {
  const confidence = Number(model.prototype_confidence ?? 50);
  let resultClass: PrototypeValidationResult['resultClass'] = 'Failure';
  const issues: string[] = [];
  let extraCostPct = 0;
  let extraArcs = 0;

  if (confidence >= 95) {
    resultClass = 'Excellent';
    issues.push('Flawless validation — ready for production');
  } else if (confidence >= 80) {
    resultClass = 'Passed';
    issues.push('Standard validation passed — minor tweaks applied');
  } else if (confidence >= 60) {
    resultClass = 'Minor Revision';
    issues.push('Calibration gaps identified — requires minor engineering revision');
    extraCostPct = 0.05;
    extraArcs = 1;
  } else if (confidence >= 40) {
    resultClass = 'Major Revision';
    issues.push('Significant subsystem failures — requires major engineering revision');
    extraCostPct = 0.15;
    extraArcs = 1;
  } else {
    resultClass = 'Failure';
    issues.push('Catastrophic prototype failure — full redesign required');
    extraCostPct = 0.25;
    extraArcs = 2;
  }

  return {
    passed: confidence >= 80,
    resultClass,
    issues,
    extraCostPct,
    extraArcs,
    confidenceScore: Math.round(confidence),
  };
}

// ─── 6. Knowledge Bonuses ─────────────────────────────────────────────────────

export interface KnowledgeBonusApplication {
  prototypeConfidenceBonus: number;
  mfgFriendlinessBonus: number;
  reliabilityBonus: number;
  engineeringComplexityReduction: number;
}

export function applyKnowledgeBonuses(companyKnowledge: Record<string, number>): KnowledgeBonusApplication {
  const getLevel = (xp: number): number => {
    const thresholds = [0, 100, 300, 600, 1000, 1500];
    let level = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (xp >= thresholds[i]) { level = i; break; }
    }
    return level;
  };

  const safetyLevel = getLevel(companyKnowledge['safety_systems'] ?? 0);
  const mfgLevel = getLevel(companyKnowledge['manufacturing_engineering'] ?? 0);
  const suvLevel = getLevel(companyKnowledge['suv_engineering'] ?? 0);
  const perfLevel = getLevel(companyKnowledge['performance_engines'] ?? 0);

  return {
    reliabilityBonus: safetyLevel >= 2 ? safetyLevel * 2.0 : 0,
    mfgFriendlinessBonus: mfgLevel >= 2 ? mfgLevel * 2.5 : 0,
    prototypeConfidenceBonus: suvLevel >= 2 ? suvLevel * 1.5 : 0,
    engineeringComplexityReduction: perfLevel >= 2 ? perfLevel * 1.5 : 0,
  };
}

// ─── 7. Engineering Culture ───────────────────────────────────────────────────

export function applyEngineeringCulture(
  currentScore: number,
  validationResult: PrototypeValidationResult
): number {
  let delta = 0;
  switch (validationResult.resultClass) {
    case 'Excellent': delta = 3; break;
    case 'Passed': delta = 1; break;
    case 'Minor Revision': delta = -1; break;
    case 'Major Revision': delta = -3; break;
    case 'Failure': delta = -5; break;
  }
  return Math.max(0, Math.min(100, currentScore + delta));
}

// ─── 8. Engineering Assessment ────────────────────────────────────────────────

export interface EngineeringAssessment {
  primaryStrength: string;
  primaryWeakness: string;
  engineeringComplexity: number;
  prototypeConfidence: number;
  manufacturingComplexity: number;
  productionSuitability: string;
  recommendedMarket: string;
  warrantyRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  engineeringVerdict: string;
}

export function calculateEngineeringAssessment(model: {
  reliability_score?: number | string;
  performance_score?: number | string;
  fuel_efficiency_score?: number | string;
  appeal_score?: number | string;
  cargo_score?: number | string;
  engineering_complexity?: number | string;
  manufacturing_complexity?: number | string;
  manufacturing_friendliness?: number | string;
  prototype_confidence?: number | string;
}): EngineeringAssessment {
  const rel = Number(model.reliability_score ?? 50);
  const perf = Number(model.performance_score ?? 50);
  const fuel = Number(model.fuel_efficiency_score ?? 50);
  const appeal = Number(model.appeal_score ?? 50);
  const cargo = Number(model.cargo_score ?? 50);
  
  const scores = [
    { name: 'Reliability', val: rel },
    { name: 'Performance', val: perf },
    { name: 'Fuel Economy', val: fuel },
    { name: 'Appeal', val: appeal },
    { name: 'Practicality', val: cargo }
  ].sort((a, b) => b.val - a.val);

  const mfgComplexity = Number(model.manufacturing_complexity ?? 50);
  const mfgFriend = Number(model.manufacturing_friendliness ?? 50);

  const warrantyRisk = rel >= 75 ? 'Low' : rel >= 55 ? 'Moderate' : rel >= 40 ? 'High' : 'Critical';
  
  let suitability = 'Average';
  if (mfgFriend >= 70 && mfgComplexity <= 40) suitability = 'Excellent - highly automatable';
  else if (mfgFriend >= 60) suitability = 'Good - standard tooling appropriate';
  else if (mfgFriend < 40 || mfgComplexity > 70) suitability = 'Poor - requires manual intervention';

  let recommendedMarket = 'General Consumer';
  if (scores[0].name === 'Fuel Economy') recommendedMarket = 'Economy / Urban';
  if (scores[0].name === 'Performance') recommendedMarket = 'Enthusiast / Premium';
  if (scores[0].name === 'Practicality') recommendedMarket = 'Commercial / Family';
  if (scores[0].name === 'Appeal') recommendedMarket = 'Executive / Luxury';

  return {
    primaryStrength: scores[0].name,
    primaryWeakness: scores[scores.length - 1].name,
    engineeringComplexity: Math.round(Number(model.engineering_complexity ?? 50)),
    prototypeConfidence: Math.round(Number(model.prototype_confidence ?? 50)),
    manufacturingComplexity: Math.round(mfgComplexity),
    productionSuitability: suitability,
    recommendedMarket,
    warrantyRisk,
    engineeringVerdict: `A ${scores[0].name}-focused vehicle with ${warrantyRisk.toLowerCase()} warranty risk.`
  };
}

// ─── 9. Balance Rating ────────────────────────────────────────────────────────

export function calculateBalanceRating(model: {
  reliability_score?: number | string;
  performance_score?: number | string;
  fuel_efficiency_score?: number | string;
  appeal_score?: number | string;
  cargo_score?: number | string;
  manufacturing_friendliness?: number | string;
  engineering_complexity?: number | string;
}): string {
  const rel = Number(model.reliability_score ?? 50);
  const perf = Number(model.performance_score ?? 50);
  const fuel = Number(model.fuel_efficiency_score ?? 50);
  const appeal = Number(model.appeal_score ?? 50);
  const mfg = Number(model.manufacturing_friendliness ?? 50);
  const engCx = Number(model.engineering_complexity ?? 50);

  if (rel > 80 && fuel > 70 && perf < 60 && appeal < 60) return 'Excellent Value';
  if (perf > 80 && engCx > 75) return 'High Performance Specialist';
  if (appeal > 80 && rel > 70) return 'Premium Comfort Focus';
  if (engCx > 85 && rel < 50) return 'Overengineered';
  if (perf < 35 && (fuel > 60 || rel > 60)) return 'Underpowered';
  if (rel < 40) return 'High Warranty Risk';
  if (mfg < 35) return 'Manufacturing Intensive';
  
  return 'Balanced Product';
}