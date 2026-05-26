/**
 * Protests and Unrest Balancing Parameters
 */
export const ProtestsBalance = {
  // Triggers
  approvalThreshold: 0.40,
  stabilityThreshold: 0.45,
  buildupSpeed: 0.20,

  // Action Impacts
  repressionImpact: 0.30,
  negotiationImpact: 0.40,

  // Unrest decay (when approval is high)
  naturalDecayRate: 0.85,

  // Consequence scaling
  gdpLossPerProtestPercent: 0.05, // Up to 5% GDP growth loss during general strike
  policeTrustLossOnRepression: 0.08
};
