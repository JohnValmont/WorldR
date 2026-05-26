/**
 * Taxes Balancing Parameters
 */
export const TaxesBalance = {
  // Elasticity factor for tax adjustments
  elasticity: 0.15,

  // Maximum tax rates to avoid complete economic collapse
  maxRates: {
    incomeTax: 0.70,
    corporateTax: 0.50,
    salesTax: 0.35,
    propertyTax: 0.10,
    tariffs: 0.40
  },

  // Evasion coefficients based on corruption and tax authority efficiency
  evasionSensitivityToCorruption: 0.85,
  evasionSensitivityToEnforcement: 0.75,
  baseTaxCollectionEfficiency: 0.95
};
