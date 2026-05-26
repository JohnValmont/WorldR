/**
 * Campaign Balancing Parameters
 */
export const CampaignBalance = {
  // Rally actions
  rallyCost: 150000,           // Cost in party funds
  rallyPopularityBoost: 0.035, // Direct support boost to local region
  rallyVoterBlocBoost: 0.05,   // Voter affinity increase

  // Press Campaigns
  pressCampaignCost: 250000,
  pressAffinityBoost: 0.04,
  pressAwarenessBoost: 0.08,

  // Fundraising events
  fundraiserCost: 50000,
  fundraiserDonationMultiplier: 3.5, // Return multiplier of cost if successful
};
