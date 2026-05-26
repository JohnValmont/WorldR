/**
 * Voter Blocs Balancing Parameters
 */
export const VoterBlocksBalance = {
  // Turnout rates base values
  turnoutRates: {
    industrial_workers: 0.72,
    union_members: 0.80,
    middle_class_professionals: 0.75,
    urban_knowledge_workers: 0.68,
    university_students: 0.55,
    pensioners_elderly: 0.84,
    rural_conservatives: 0.71,
    small_business_owners: 0.74,
    large_business_executives: 0.78,
    industrial_conglomerates: 0.82,
    immigrant_communities: 0.42,
    unemployed_precariat: 0.34
  },

  // Base adjustments for voter swing sensitivity
  affinitySwingSpeed: 0.15, // Speed at which current affinities adjust based on political events
  equilibriumDecay: 0.85
};
