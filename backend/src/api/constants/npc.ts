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

// ── Generational upgrades (replaces the old "new variant every 2 months" loop) ──
// An NPC model is replaced by its next generation only once it reaches
// MODEL_AGE_FACELIFT months. Build cost does NOT rise between generations —
// compounding +5% per variant was the root cause of NPC prices inflating to
// 30x launch price (with the 2.5x-cost price cap moving up with it).
export const NPC_GENERATION_COST = 1_000_000;    // one-off cost of launching the next generation
export const NPC_GENERATION_SCORE_BUMP = 4;      // reliability/performance/appeal gain per generation (capped at 100)

// ── Demand-led production planning ──
// Each month the NPC also plans from last month's real buyer interest
// (manufacturing_sales_results.raw_buyer_interest), not only its own past
// sales. Raw interest ignores competitors, so only this fraction is trusted.
export const NPC_FORECAST_CONFIDENCE = 0.6;
// Allocation weight for a market with no sales history yet (as a fraction of
// the smallest known market's weight), so new markets still get some stock.
export const NPC_NEW_MARKET_WEIGHT_FRACTION = 0.5;
// A model counts as "Sold Out" overall when at least this share of its
// markets sold out (previously only the first market's result was used).
export const NPC_SOLD_OUT_MARKET_SHARE = 0.5;

// ── Industrial espionage (NPC copies a player's hit car) ──
// Previously: every month, any player model selling 20+ units was cloned by
// every cash-rich NPC with +2 on all scores and a 5% lower price — so a
// player's success was instantly stolen three times over, and all NPCs drifted
// onto the same car outside their own segment. Now it is rare, in-segment and
// the copy is a slightly worse knock-off at the NPC's own price.
export const NPC_ESPIONAGE_COST = 1_000_000;
export const NPC_ESPIONAGE_COOLDOWN_MONTHS = 24;   // per NPC company
export const NPC_ESPIONAGE_MIN_PLAYER_SALES = 100; // player model units sold last month
export const NPC_ESPIONAGE_SCORE_DELTA = -3;       // knock-off quality vs the original
export const NPC_ESPIONAGE_PRICE_FACTOR = 1.0;     // copy priced at the player's price (no undercut)


export const NPC_ROSTER = [
  {
    key: 'valuecorp',
    name: 'Valuecorp',
    segment: 'Budget',
    seedCapital: 15_000_000,
    build: {
      platform: 'economy',
      powerUnit: 'small-i4',
      drivetrain: 'fwd',
      interior: 'basic',
      safety: 'standard',
      quality: 'budget',
    },
    scores: {
      reliability: 75,
      performance: 40,
      fuel_efficiency: 85,
      appeal: 50,
      cargo: 50,
      safety: 55,
    },
    salePrice: 13500,
    targetUnitsPerArc: 400,        // was 100 — matches new 1500-cap factory
    marketingTier: 'regional',     // was local
    staff: { supervisor: 1, salesManager: 2, engineer: 0, inspector: 0 },
  },
  {
    key: 'veridian',
    name: 'Veridian Motors',
    segment: 'Family',
    seedCapital: 20_000_000,
    build: {
      platform: 'standard',
      powerUnit: 'standard-i4',
      drivetrain: 'fwd',
      interior: 'comfort',
      safety: 'enhanced',
      quality: 'standard',
    },
    scores: {
      reliability: 80,
      performance: 50,
      fuel_efficiency: 65,
      appeal: 65,
      cargo: 70,
      safety: 85,
    },
    salePrice: 24500,
    targetUnitsPerArc: 350,        // was 90
    marketingTier: 'regional',
    staff: { supervisor: 1, salesManager: 2, engineer: 0, inspector: 0 },
  },
  {
    key: 'apex',
    name: 'Apex Automobili',
    segment: 'Performance',
    seedCapital: 25_000_000,
    build: {
      platform: 'standard',
      powerUnit: 'v6',
      drivetrain: 'awd',
      interior: 'premium',
      safety: 'advanced',
      quality: 'premium',
    },
    scores: {
      reliability: 65,
      performance: 95,
      fuel_efficiency: 35,
      appeal: 90,
      cargo: 35,
      safety: 75,
    },
    salePrice: 54000,
    targetUnitsPerArc: 200,        // was 40 — premium segment is rightly smaller
    marketingTier: 'national',     // premium brands go national
    staff: { supervisor: 1, salesManager: 2, engineer: 1, inspector: 1 },
  },
  {
    key: 'haulpro',
    name: 'HaulPro',
    segment: 'Commercial',
    seedCapital: 18_000_000,
    build: {
      platform: 'heavy-duty',
      powerUnit: 'standard-i4',
      drivetrain: 'rwd',
      interior: 'basic',
      safety: 'enhanced',
      quality: 'standard',
    },
    scores: {
      reliability: 85,
      performance: 45,
      fuel_efficiency: 60,
      appeal: 40,
      cargo: 95,
      safety: 70,
    },
    salePrice: 31000,
    targetUnitsPerArc: 400,        // was 80
    marketingTier: 'regional',
    staff: { supervisor: 1, salesManager: 2, engineer: 0, inspector: 0 },
  },
];
