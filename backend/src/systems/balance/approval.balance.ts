/**
 * Approval Balancing Parameters
 */
export const ApprovalBalance = {
  // Monthly decay multiplier (voter fatigue)
  decay: 0.99,

  // Economic impacts on general approval
  inflationImpactCoeff: 0.8,      // Multiplied by inflation rate and sensitivity
  unemploymentImpactCoeff: 0.6,   // Multiplied by unemployment rate and sensitivity

  // Welfare approval coefficients
  welfareBonusLimit: 0.15,        // Max approval bonus from welfare
  welfareImpactScale: 0.0001,      // Scale factor for welfare spending ratio

  // Political events coefficients
  scandalPenaltyCoeff: 0.15,      // Penalty per corruption scandal
  mediaSentimentScale: 0.1,       // Scale for media sentiment impact

  // Law popularity coefficient
  lawPopularityInfluence: 0.05
};
