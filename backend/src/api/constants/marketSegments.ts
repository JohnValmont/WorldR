/**
 * WORLDr - Market Segments Constants
 * 
 * Defines the 5 core market demographics and their purchasing behaviors.
 * This determines how vehicles perform in the simulation based on their price and engineering scores.
 */

export interface MarketSegment {
  id: string;
  name: string;
  populationShare: number; // Percentage of the overall market capacity
  priceCeiling: number; // Beyond this price, affordability drops sharply
  priceSensitivity: number; // Higher number = demand drops faster when over price ceiling
  scoreWeights: {
    reliability: number;
    performance: number;
    fuel_efficiency: number;
    safety: number;
    appeal: number;
    cargo_utility: number;
  };
  targetFitBonus: number; // Multiplier if the vehicle's target_segment strictly matches
  minAppeal: number; // Minimum appeal score norm required before prestige penalty applies
}

export const MARKET_SEGMENTS: Record<string, MarketSegment> = {
  budget: {
    id: 'budget',
    name: 'Budget',
    populationShare: 0.40, // 40% of the market
    priceCeiling: 18000,
    priceSensitivity: 1.2, // Very price sensitive
    scoreWeights: {
      reliability: 1.2, // Can't afford repairs
      performance: 0.5, // Doesn't care about speed
      fuel_efficiency: 1.5, // High priority to save money
      safety: 0.8,
      appeal: 0.5,
      cargo_utility: 1.0,
    },
    targetFitBonus: 1.5,
    minAppeal: 0,
  },
  family: {
    id: 'family',
    name: 'Family',
    populationShare: 0.30, // 30% of the market
    priceCeiling: 35000,
    priceSensitivity: 0.8,
    scoreWeights: {
      reliability: 1.1,
      performance: 0.7,
      fuel_efficiency: 1.0,
      safety: 1.5, // Safety is paramount
      appeal: 1.0,
      cargo_utility: 1.2, // Needs space for kids/stuff
    },
    targetFitBonus: 1.5,
    minAppeal: 0,
  },
  performance: {
    id: 'performance',
    name: 'Performance',
    populationShare: 0.10, // 10% of the market
    priceCeiling: 65000,
    priceSensitivity: 0.5,
    scoreWeights: {
      reliability: 0.8,
      performance: 1.8, // Speed is everything
      fuel_efficiency: 0.4,
      safety: 0.9,
      appeal: 1.4,
      cargo_utility: 0.5,
    },
    targetFitBonus: 1.5,
    minAppeal: 0.55,
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury',
    populationShare: 0.05, // 5% of the market
    priceCeiling: 120000,
    priceSensitivity: 0.2, // Hardly price sensitive
    scoreWeights: {
      reliability: 1.0,
      performance: 1.2,
      fuel_efficiency: 0.5,
      safety: 1.2,
      appeal: 1.8, // Brand prestige and comfort
      cargo_utility: 0.8,
    },
    targetFitBonus: 1.5,
    minAppeal: 0.70,
  },
  commercial: {
    id: 'commercial',
    name: 'Commercial',
    populationShare: 0.15, // 15% of the market
    priceCeiling: 45000,
    priceSensitivity: 0.9,
    scoreWeights: {
      reliability: 1.5, // Uptime is money
      performance: 0.8,
      fuel_efficiency: 1.2,
      safety: 1.0,
      appeal: 0.3, // Doesn't need to look good
      cargo_utility: 1.8, // Cargo space is critical
    },
    targetFitBonus: 1.5,
    minAppeal: 0,
  }
};
