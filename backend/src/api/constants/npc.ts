export const BANKRUPTCY_FLOOR = 0;
export const PRODUCTION_BUFFER = 1.15;          // was 1.1 — respond slightly faster to demand
export const PRICE_STEP = 0.06;                 // Increased to 6% per month for faster price correction
export const MARKETING_REVENUE_PCT = 0.05;
export const ZERO_DEMAND_FACELIFT_MONTHS = 2;   // Drop from 3 to 2 months for faster reaction
export const MIN_UNITS = 10;
export const MIN_UNITS_FLOOR = 0;
export const AWARENESS_BUMP_THRESHOLD = 70;     // Increased from 30 to 70 to push NPCs to spend more on marketing
export const MODEL_AGE_FACELIFT = 36;

// B7 Market Expansion: if sell-through ratio exceeds this threshold, the brain
// signals that the NPC should be seeded into additional markets next tick.
export const NPC_EXPAND_SELL_RATIO = 0.85;      // Dropped from 0.92 so NPCs expand more aggressively

// Maximum number of region markets an NPC will expand into automatically.
export const NPC_MAX_MARKETS = 10;


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
    targetUnitsPerArc: 400,        // was 100 — matches new 1500-cap factory
    marketingTier: 'regional',     // was local
    staff: { supervisor: 1, salesManager: 2, engineer: 0, inspector: 0 },
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
    targetUnitsPerArc: 350,        // was 90
    marketingTier: 'regional',
    staff: { supervisor: 1, salesManager: 2, engineer: 0, inspector: 0 },
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
    targetUnitsPerArc: 200,        // was 40 — premium segment is rightly smaller
    marketingTier: 'national',     // premium brands go national
    staff: { supervisor: 1, salesManager: 2, engineer: 1, inspector: 1 },
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
    targetUnitsPerArc: 400,        // was 80
    marketingTier: 'regional',
    staff: { supervisor: 1, salesManager: 2, engineer: 0, inspector: 0 },
  },
];
