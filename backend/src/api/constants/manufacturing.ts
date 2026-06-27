/**
 * WORLDr Automobile Manufacturing — Global Simulation Constants
 *
 * These constants are universally applied across all countries in the simulation.
 * They represent the fundamental rules and classifications of the manufacturing
 * system (e.g. what a "Compact Car" is, or what "Standard Safety" implies).
 *
 * DO NOT add country-specific values here. Country-specific values belong
 * in the `manufacturing_country_auto_config` database table.
 */

export const VEHICLE_CLASSES = ['Compact Car', 'Sedan', 'Utility Van'];

// Base weight contribution by vehicle class (kg)
export const VEHICLE_CLASS_BASE_WEIGHTS: Record<string, number> = {
  'Compact Car': 1050,
  'Sedan': 1250,
  'Utility Van': 1800,
};

export const PLATFORMS = [
  { id: 'economy',    label: 'Economy Platform',    desc: 'Low cost, lower appeal. Best for budget vehicles.', baseCost: 8000, reliabilityMod: -5, performanceMod: 0, fuelMod: 0, appealMod: -10, cargoMod: 0, safetyMod: -5, weightKg: -50, complexityMod: -10 },
  { id: 'standard',   label: 'Standard Platform',   desc: 'Balanced cost and quality. Versatile.', baseCost: 12000, reliabilityMod: 0, performanceMod: 0, fuelMod: 0, appealMod: 5, cargoMod: 0, safetyMod: 0, weightKg: 0, complexityMod: 0 },
  { id: 'heavy-duty', label: 'Heavy-Duty Platform', desc: 'High cargo capacity and reliability. Higher cost.', baseCost: 18000, reliabilityMod: 10, performanceMod: -5, fuelMod: -15, appealMod: 0, cargoMod: 25, safetyMod: 5, weightKg: 300, complexityMod: 15 },
];

export const POWER_UNITS = [
  { id: 'small-i4',       label: 'Small Inline-4',       desc: 'Fuel-efficient, low output, low cost.', baseCost: 1500, reliabilityMod: 0, performanceMod: 0, fuelMod: 15, weightKg: 110, complexityMod: 0 },
  { id: 'standard-i4',    label: 'Standard Inline-4',    desc: 'Balanced performance and economy.', baseCost: 2500, reliabilityMod: 0, performanceMod: 10, fuelMod: 0, weightKg: 155, complexityMod: 5 },
  { id: 'v6',             label: 'V6 Engine',            desc: 'Strong performance. Higher cost, lower efficiency.', baseCost: 4500, reliabilityMod: -5, performanceMod: 25, fuelMod: -15, weightKg: 215, complexityMod: 20 },
  { id: 'basic-electric', label: 'Basic Electric Motor', desc: 'Coming Soon — Locked', locked: true, baseCost: 6000, reliabilityMod: 5, performanceMod: 20, fuelMod: 30, weightKg: 300, complexityMod: 30 },
];

export const DRIVETRAINS = [
  { id: 'fwd', label: 'Front-Wheel Drive',  desc: 'Lowest cost. Standard for compact and economy cars.', baseCost: 0, performanceMod: 0, fuelMod: 0, cargoMod: 0, weightKg: 0, complexityMod: 0, assemblyComplexityMod: 0 },
  { id: 'rwd', label: 'Rear-Wheel Drive',   desc: 'Better handling. Slight cost premium.', baseCost: 500, performanceMod: 5, fuelMod: 0, cargoMod: 0, weightKg: 30, complexityMod: 8, assemblyComplexityMod: 5 },
  { id: 'awd', label: 'All-Wheel Drive',    desc: 'Best traction. Higher cost and weight.', baseCost: 2000, performanceMod: 5, fuelMod: -10, cargoMod: 5, weightKg: 120, complexityMod: 20, assemblyComplexityMod: 18 },
];

export const INTERIOR_TIERS = [
  { id: 'basic',   label: 'Basic Interior',   desc: 'Functional. Low appeal, low cost.', baseCost: 0, appealMod: 0, weightKg: 0, complexityMod: 0, assemblyComplexityMod: 0 },
  { id: 'comfort', label: 'Comfort Interior', desc: 'Mid-range fit. Notable appeal boost.', baseCost: 1500, appealMod: 15, weightKg: 40, complexityMod: 10, assemblyComplexityMod: 12 },
  { id: 'premium', label: 'Premium Interior', desc: 'High quality materials. Strong appeal.', baseCost: 3500, appealMod: 30, weightKg: 80, complexityMod: 22, assemblyComplexityMod: 25 },
];

export const SAFETY_TIERS = [
  { id: 'standard', label: 'Standard Safety',  desc: 'Meets minimum regulations.', baseCost: 0, reliabilityMod: 0, appealMod: 0, safetyMod: 0, weightKg: 0, complexityMod: 0 },
  { id: 'enhanced', label: 'Enhanced Safety',  desc: 'Better passenger protection.', baseCost: 1000, reliabilityMod: 10, appealMod: 5, safetyMod: 15, weightKg: 30, complexityMod: 12 },
  { id: 'advanced', label: 'Advanced Safety',  desc: 'Top-tier safety. Strong reliability and appeal bonus.', baseCost: 2500, reliabilityMod: 20, appealMod: 10, safetyMod: 30, weightKg: 60, complexityMod: 25 },
];

export const QUALITY_TARGETS = [
  { id: 'budget',   label: 'Budget Quality',   desc: 'Cost-focused. Lower reliability but cheaper to make.', costMultiplier: 0.85, reliabilityMod: -10, appealMod: -8, mfgComplexityMod: -5 },
  { id: 'standard', label: 'Standard Quality', desc: 'Balanced production standard.', costMultiplier: 1.0, reliabilityMod: 0, appealMod: 0, mfgComplexityMod: 0 },
  { id: 'premium',  label: 'Premium Quality',  desc: 'High-spec production. Better reliability and appeal.', costMultiplier: 1.20, reliabilityMod: 15, appealMod: 10, mfgComplexityMod: 15 },
];

export const STAFF_ROLES = [
  { id: 'factory-worker',          label: 'Factory Worker',          wagePerArc: 2800,
    desc: 'Provides labor to operate production lines. Required count scales with planned units.' },
  { id: 'production-supervisor',   label: 'Production Supervisor',   wagePerArc: 5500,
    desc: 'Improves production coordination. Each supervisor (up to 1 per active line) adds +5% efficiency.' },
  { id: 'automotive-engineer',     label: 'Automotive Engineer',     wagePerArc: 7500,
    desc: 'Reduces vehicle development cost by 5% per engineer (max 20%). Also improves engineering quality and reduces risk.' },
  { id: 'quality-inspector',       label: 'Quality Inspector',       wagePerArc: 4200,
    desc: 'Reduces defect rate by 0.5% per inspector. Minimum effective defect rate is 0.5%.' },
  { id: 'sales-manager',           label: 'Sales Manager',           wagePerArc: 4800,
    desc: 'Improves market demand by +4% per manager (up to 1 per active market, max +16%).' },
];

// Defect rate by quality setting
export const QUALITY_DEFECT_RATES: Record<string, number> = {
  'Economy':       0.05,
  'Standard':      0.03,
  'Quality Focus': 0.01,
  // aliases used by production lines
  'economy':       0.05,
  'standard':      0.03,
  'premium':       0.01,
};

// ─── Phase 3: Engineering Priorities ─────────────────────────────────────────
/**
 * Each priority gets 0–100 points. All six must sum to exactly 100.
 * Each priority shifts score weights, cost multipliers, dev time, and risk.
 */
export const ENGINEERING_PRIORITIES = [
  {
    id: 'reliability',
    label: 'Reliability',
    icon: '🛡',
    desc: 'More testing, stronger validation. Higher cost and time. Lower launch defects and better customer trust.',
    effects: {
      reliabilityBonus: 0.4,      // pts of reliability per priority point (above 50 baseline)
      riskReduction: 0.3,         // risk reduction per priority point above neutral (16.67)
      costMultiplierPer10: 0.02,  // +2% dev cost per 10 pts above neutral
      timeBonus: 0.015,           // +1.5% dev time per 10 pts above neutral
    }
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '⚡',
    desc: 'More powertrain budget. Higher performance scores. Heavier, less fuel efficient, more expensive.',
    effects: {
      performanceBonus: 0.45,
      fuelPenalty: 0.25,
      weightIncreasePct: 0.008,  // +0.8% weight per priority point above neutral
      costMultiplierPer10: 0.025,
      riskIncrease: 0.2,
    }
  },
  {
    id: 'fuel_economy',
    label: 'Fuel Economy',
    icon: '⛽',
    desc: 'Lightweight focus and efficient calibration. Better fuel score. Reduces weight and performance slightly.',
    effects: {
      fuelBonus: 0.4,
      performancePenalty: 0.15,
      weightReductionPct: 0.005,  // -0.5% weight per priority point above neutral
      costMultiplierPer10: 0.01,
    }
  },
  {
    id: 'comfort',
    label: 'Comfort',
    icon: '🛋',
    desc: 'Interior refinement and NVH work. Boosts appeal score. Higher cost and weight.',
    effects: {
      appealBonus: 0.35,
      weightIncreasePct: 0.003,
      costMultiplierPer10: 0.015,
    }
  },
  {
    id: 'practicality',
    label: 'Practicality',
    icon: '📦',
    desc: 'Space optimization and cargo utility focus. Boosts cargo score. Lower weight bonus.',
    effects: {
      cargoBonus: 0.4,
      weightReductionPct: 0.002,
      costMultiplierPer10: 0.01,
    }
  },
  {
    id: 'mfg_simplicity',
    label: 'Manufacturing Simplicity',
    icon: '🔧',
    desc: 'Design-for-manufacture focus. Reduces assembly and manufacturing complexity. Lower production cost. Better defect rate.',
    effects: {
      mfgFriendlinessBonus: 0.5,
      assemblyComplexityReduction: 0.3,
      productionCostReduction: 0.008,  // -0.8% per priority point above neutral
      costMultiplierPer10: 0.005,
    }
  },
];

// Default balanced priorities (each gets 1/6 ≈ 16–17)
export const DEFAULT_ENGINEERING_PRIORITIES: Record<string, number> = {
  reliability: 20,
  performance: 15,
  fuel_economy: 20,
  comfort: 15,
  practicality: 15,
  mfg_simplicity: 15,
};

// ─── Phase 3: Budget Allocation Buckets ──────────────────────────────────────
export const BUDGET_BUCKETS = [
  { id: 'powertrain',           label: 'Powertrain R&D',         desc: 'Engine and drivetrain development. Affects performance and fuel scores.', defaultPct: 0.18 },
  { id: 'body',                 label: 'Body Engineering',        desc: 'Structural and exterior design work. Affects safety and reliability.', defaultPct: 0.15 },
  { id: 'safety',               label: 'Safety Systems',          desc: 'Crash structure, airbags, ADAS. Directly boosts safety score.', defaultPct: 0.12 },
  { id: 'interior',             label: 'Interior & NVH',          desc: 'Interior quality, noise insulation. Affects appeal score.', defaultPct: 0.10 },
  { id: 'testing',              label: 'Testing Programme',        desc: 'Road and durability testing. High spend here reduces defect risk and improves reliability.', defaultPct: 0.20 },
  { id: 'production_eng',       label: 'Production Engineering',  desc: 'Tooling and assembly planning. Improves manufacturing friendliness and reduces production cost.', defaultPct: 0.15 },
  { id: 'prototype_validation', label: 'Prototype Validation',    desc: 'Pre-launch prototype testing. Improves prototype confidence and all final scores.', defaultPct: 0.10 },
];

// ─── Phase 3: Knowledge Domains ──────────────────────────────────────────────
export const KNOWLEDGE_DOMAINS = [
  { id: 'economy_vehicles',       label: 'Economy Vehicles',          desc: 'Expertise in budget and compact car development.' },
  { id: 'suv_engineering',        label: 'SUV Engineering',           desc: 'Heavy-duty platform and utility vehicle knowhow.' },
  { id: 'performance_engines',    label: 'Performance Engines',       desc: 'High-output powertrain development experience.' },
  { id: 'safety_systems',         label: 'Safety Systems',            desc: 'Advanced occupant protection and crash engineering.' },
  { id: 'lightweight_design',     label: 'Lightweight Design',        desc: 'Material and packaging techniques to reduce vehicle weight.' },
  { id: 'manufacturing_engineering', label: 'Manufacturing Engineering', desc: 'Assembly efficiency, DFM, and production quality.' },
];

// XP thresholds for each knowledge level (0-5)
export const KNOWLEDGE_LEVEL_XP = [0, 100, 300, 600, 1000, 1500];

// XP awarded per completed vehicle project by domain
export function calcKnowledgeXp(design: {
  vehicleClass: string;
  platform: string;
  powerUnit: string;
  safetyTier: string;
  engineeringPriorities: Record<string, number>;
  engineingComplexity: number;
}): Record<string, number> {
  const xp: Record<string, number> = {};
  const base = 30 + Math.round(design.engineingComplexity * 0.5);

  // Economy vehicles XP: small/economy platform cars
  if (design.vehicleClass === 'Compact Car' || design.platform === 'economy') {
    xp['economy_vehicles'] = base + Math.round((design.engineeringPriorities['fuel_economy'] ?? 15) * 0.8);
  }

  // SUV engineering: heavy-duty platform
  if (design.platform === 'heavy-duty' || design.vehicleClass === 'Utility Van') {
    xp['suv_engineering'] = base + Math.round((design.engineeringPriorities['practicality'] ?? 15) * 0.8);
  }

  // Performance engines: v6 or high performance priority
  if (design.powerUnit === 'v6' || (design.engineeringPriorities['performance'] ?? 0) >= 30) {
    xp['performance_engines'] = base + Math.round((design.engineeringPriorities['performance'] ?? 0) * 0.9);
  }

  // Safety systems: enhanced/advanced safety tier or high reliability
  if (design.safetyTier !== 'standard' || (design.engineeringPriorities['reliability'] ?? 0) >= 30) {
    xp['safety_systems'] = Math.round(base * 0.8) + Math.round((design.engineeringPriorities['reliability'] ?? 0) * 0.6);
  }

  // Lightweight design: high fuel economy priority
  if ((design.engineeringPriorities['fuel_economy'] ?? 0) >= 25) {
    xp['lightweight_design'] = Math.round(base * 0.7) + Math.round((design.engineeringPriorities['fuel_economy'] ?? 0) * 0.7);
  }

  // Manufacturing engineering: mfg simplicity priority
  if ((design.engineeringPriorities['mfg_simplicity'] ?? 0) >= 20) {
    xp['manufacturing_engineering'] = Math.round(base * 0.7) + Math.round((design.engineeringPriorities['mfg_simplicity'] ?? 0) * 0.8);
  }

  // All designs contribute some base XP to at least 1-2 domains
  if (Object.keys(xp).length === 0) {
    xp['economy_vehicles'] = Math.round(base * 0.5);
  }

  return xp;
}

// ─── Phase 3: Prototype Development Stages ───────────────────────────────────
export const DEV_STAGES = [
  { id: 'engineering',          label: 'Engineering Phase',       shortLabel: 'Engineering',   minArcs: 1, description: 'Core engineering and design work.' },
  { id: 'prototype',            label: 'Prototype Build',         shortLabel: 'Prototype',     minArcs: 1, description: 'Building and initial testing of physical prototypes.' },
  { id: 'testing',              label: 'Testing Programme',       shortLabel: 'Testing',       minArcs: 1, description: 'Road testing and durability validation.' },
  { id: 'ready_to_launch',      label: 'Ready to Launch',         shortLabel: 'Ready',         minArcs: 0, description: 'Development complete. Awaiting launch approval.' },
];

// ─── Phase 3: Engineering Reputation Traits ───────────────────────────────────
export const REPUTATION_TRAITS = [
  { id: 'reliable_engineering',   label: 'Reliable Engineering',    threshold: 70, dimension: 'reliability' },
  { id: 'performance_engineering',label: 'Performance Engineering', threshold: 70, dimension: 'performance' },
  { id: 'efficient_manufacturing', label: 'Efficient Manufacturing', threshold: 70, dimension: 'mfg_simplicity' },
  { id: 'economy_specialist',     label: 'Economy Specialist',      threshold: 70, dimension: 'fuel_economy' },
  { id: 'premium_engineering',    label: 'Premium Engineering',     threshold: 70, dimension: 'comfort' },
];

// Base catalog for engineering programmes.
// Note: 'budget' and 'baseDuration' are now driven by the country config.
export const ENGINEERING_PROGRAMMES_CATALOG: Record<string, any> = {
  'economy-tune': { name: 'Economy Powertrain Calibration', minEng: 1, recEng: 2, prereq: null },
  'safety-arch': { name: 'Reinforced Safety Architecture', minEng: 2, recEng: 3, prereq: null },
  'durability-val': { name: 'Durability Validation Programme', minEng: 1, recEng: 2, prereq: null },
  'assembly-time': { name: 'Assembly Time Study', minEng: 1, recEng: 2, prereq: null },
  'spc': { name: 'Statistical Process Control', minEng: 2, recEng: 3, prereq: 'assembly-time' }
};
