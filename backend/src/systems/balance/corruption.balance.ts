/**
 * Corruption Balancing Parameters
 */
export const CorruptionBalance = {
  baseLeakage: 0.10,
  decayRate: 0.95,
  growthFactor: 0.05,
  
  // Dynamic factors
  inflationImpact: 0.20,
  welfareImpact: -0.10,
  anticorruptionImpact: 0.40,
  taxEvasionImpact: 0.10,

  // Media / Scandal parameters
  scandalThreshold: 0.50,
  scandalBuildupSpeed: 0.25
};
