/**
 * Inflation Balancing Parameters
 */
export const InflationBalance = {
  // Global damping factor applied to monthly price updates
  damping: 0.80,

  // CPI weight distribution
  weights: {
    food: 0.25,      // Agriculture contribution
    fuel: 0.15,      // Energy contribution
    housing: 0.30,   // Construction contribution
    other: 0.30      // Industry/Services contribution
  },

  // Base adjustments for demand pressure
  demandInflationFactor: 0.05, // How much excess demand affects price indices
  wageInflationFactor: 0.03,   // How much wage growth affects CPI
  energyPressureFactor: 0.04,   // How much energy price changes cascade to other sectors
};
