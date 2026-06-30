export const BANKRUPTCY_FLOOR = 0;
export const PRODUCTION_BUFFER = 1.1;
export const PRICE_STEP = 0.04;
export const MARKETING_REVENUE_PCT = 0.05;
export const ZERO_DEMAND_FACELIFT_MONTHS = 3;
export const MIN_UNITS = 10;
export const MIN_UNITS_FLOOR = 0;
export const AWARENESS_BUMP_THRESHOLD = 30;
export const MODEL_AGE_FACELIFT = 36;


export const NPC_ROSTER = [
  {
    key: 'valuecorp',
    name: 'Valuecorp',
    segment: 'Budget',
    seedCapital: 1_500_000,
    build: {
      platform: 'economy',
      powerUnit: 'small-i4',
      drivetrain: 'fwd',
      interior: 'basic',
      safety: 'standard',
      quality: 'budget',
    },
    scores: {
      reliability: 60,
      performance: 35,
      fuel_efficiency: 80,
      appeal: 40,
      cargo: 50,
      safety: 45,
    },
    salePrice: 14500,
    targetUnitsPerArc: 100,
    marketingTier: 'local',
    staff: { supervisor: 1, salesManager: 1, engineer: 0, inspector: 0 },
  },
  {
    key: 'veridian',
    name: 'Veridian Motors',
    segment: 'Family',
    seedCapital: 2_500_000,
    build: {
      platform: 'standard',
      powerUnit: 'standard-i4',
      drivetrain: 'fwd',
      interior: 'comfort',
      safety: 'enhanced',
      quality: 'standard',
    },
    scores: {
      reliability: 70,
      performance: 45,
      fuel_efficiency: 60,
      appeal: 55,
      cargo: 65,
      safety: 80,
    },
    salePrice: 27000,
    targetUnitsPerArc: 90,
    marketingTier: 'regional',
    staff: { supervisor: 1, salesManager: 1, engineer: 0, inspector: 0 },
  },
  {
    key: 'apex',
    name: 'Apex Automobili',
    segment: 'Performance',
    seedCapital: 2_000_000,
    build: {
      platform: 'standard',
      powerUnit: 'v6',
      drivetrain: 'awd',
      interior: 'premium',
      safety: 'advanced',
      quality: 'premium',
    },
    scores: {
      reliability: 60,
      performance: 85,
      fuel_efficiency: 35,
      appeal: 80,
      cargo: 35,
      safety: 70,
    },
    salePrice: 58000,
    targetUnitsPerArc: 40,
    marketingTier: 'regional',
    staff: { supervisor: 1, salesManager: 1, engineer: 1, inspector: 1 },
  },
  {
    key: 'haulpro',
    name: 'HaulPro',
    segment: 'Commercial',
    seedCapital: 2_500_000,
    build: {
      platform: 'heavy-duty',
      powerUnit: 'standard-i4',
      drivetrain: 'rwd',
      interior: 'basic',
      safety: 'enhanced',
      quality: 'standard',
    },
    scores: {
      reliability: 75,
      performance: 40,
      fuel_efficiency: 60,
      appeal: 30,
      cargo: 90,
      safety: 60,
    },
    salePrice: 34000,
    targetUnitsPerArc: 80,
    marketingTier: 'local',
    staff: { supervisor: 1, salesManager: 1, engineer: 0, inspector: 0 },
  },
];
