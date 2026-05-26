/**
 * Debt Balancing Parameters
 */
export const DebtBalance = {
  // Baseline interest rate
  debtInterestRate: 0.042,

  // Banking stress thresholds (debt to GDP ratio)
  bankingStressThreshold: 0.80,
  bankingBuildupSpeed: 0.15,
  bankingRecoverySpeed: 0.10,

  // Interest rate sensitivity to credit rating
  debtToGdpSurchargeCoeff: 0.02
};
