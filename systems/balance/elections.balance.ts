/**
 * Elections Balancing Parameters
 */
export const ElectionsBalance = {
  // Base parameters
  baseTurnout: 0.62,
  minTurnout: 0.45,
  maxTurnout: 0.95,
  stabilityWeight: 0.20,

  // Coalition thresholds
  majorityThreshold: 0.50, // 50% + 1 seat required to govern alone
  coalitionCompatibilityThreshold: 0.0, // Minimum ideology affinity score to form a coalition

  // Time metrics
  electionCycleMonths: 12,
  electionCooldown: 48
};
