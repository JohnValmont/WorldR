/**
 * Economy Balancing Parameters
 */
export const EconomyBalance = {
  // Baseline growth targets
  gdpGrowthTarget: 0.024, // 2.4% annual target baseline
  recessionTriggerThreshold: -0.01, // GDP contraction rate that triggers recession risk

  // Sector-specific weights and growth bounds
  sectors: {
    Agriculture: {
      baseProductivity: 1.05,
      baseGrowth: 0.013,
      wageElasticity: 0.15,
      laborElasticity: 0.20,
    },
    Industry: {
      baseProductivity: 1.35,
      baseGrowth: 0.021,
      wageElasticity: 0.35,
      laborElasticity: 0.45,
    },
    Services: {
      baseProductivity: 1.25,
      baseGrowth: 0.029,
      wageElasticity: 0.40,
      laborElasticity: 0.50,
    },
    Energy: {
      baseProductivity: 1.55,
      baseGrowth: 0.038,
      wageElasticity: 0.25,
      laborElasticity: 0.15,
    },
    Construction: {
      baseProductivity: 1.12,
      baseGrowth: 0.019,
      wageElasticity: 0.30,
      laborElasticity: 0.35,
    }
  },

  // Sensitivity to taxes
  taxElasticity: 0.15, // Sensitivity of sector outputs to corporate/sales tax increases

  // General economic factors
  recessionDamping: 0.90, // Damping factor for recovering from a contraction
};
