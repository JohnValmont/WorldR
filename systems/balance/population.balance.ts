/**
 * Population Balancing Parameters
 */
export const PopulationBalance = {
  naturalGrowthRate: 0.0005, // Monthly base population growth
  migrationRateBase: 0.0010, // Monthly base migration factor

  // Income class bounds (clamping limits)
  incomeBounds: {
    Poor: { min: 0, max: 15000 },
    Working: { min: 15000, max: 40000 },
    Middle: { min: 40000, max: 100000 },
    Wealthy: { min: 100000, max: 350000 },
    Elite: { min: 350000, max: 50000000 }
  },

  // Social mobility coefficient (rate at which population shifts classes based on income change)
  socialMobilityRate: 0.015
};
