/**
 * Parliament Balancing Parameters
 */
export const ParliamentBalance = {
  // Seat counts
  defaultTotalSeats: 450, // Denominator for seats in Keldoria

  // Legislative probabilities
  basePassProbability: 0.50,
  coalitionDisagreementPenalty: 0.15, // Penalty to bill passing chance per conflicting coalition ideology
  oppositionResistanceWeight: 0.25,  // Weight of opposition seats blocking a bill

  // Rebellion / floor crossing thresholds
  rebellionChanceBase: 0.05,
  partyDisloyaltyMultiplier: 0.30
};
