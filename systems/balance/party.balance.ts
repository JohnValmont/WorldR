/**
 * Party Balancing Parameters
 */
export const PartyBalance = {
  // Membership growth parameters
  baseMemberGrowthRate: 0.02, // 2% baseline monthly member growth
  popularityGrowthImpact: 0.05, // Additional growth per popularity point

  // Financial parameters
  baseMonthlyDuesPerMember: 5.0, // 5 currency units per member per month
  corporateDonationMultiplier: 12.5,
  smallDonorMultiplier: 1.5,

  // Stances and compatibility
  coalitionTrustDecay: 0.98,
  ideologicalDistanceWeight: 0.10
};
