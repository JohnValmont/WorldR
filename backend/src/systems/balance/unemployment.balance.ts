/**
 * Unemployment Balancing Parameters
 */
export const UnemploymentBalance = {
  // Natural rate under optimal conditions
  unemploymentBaseRate: 0.051,

  // Sensitivity to economic growth
  growthHiringCoefficient: 0.5, // How much GDP growth increases hiring

  // Shock factors (e.g. from crises or industrial automation)
  automationLayoffCoefficient: 0.02,
  recessionLayoffFactor: 0.15
};
