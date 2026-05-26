/**
 * Law Balancing Parameters
 */
export const LawBalance = {
  // Financial cost to draft and propose a law (administration fee)
  proposalCost: 15000000.0, // 15M from national treasury

  // Legislative vote thresholds (fraction of seats)
  defaultPassingThreshold: 0.50, // Simple majority (50% + 1 seat)
  constitutionalPassingThreshold: 0.67, // Two-thirds majority for constitutional laws

  // Default duration of modifier effects from laws (months)
  defaultModifierDuration: 48,
  stabilityImpactOnPassing: 0.20
};
