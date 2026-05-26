/**
 * AI Staff Balancing Parameters
 */
export const AIStaffBalance = {
  // Recruitment and baseline costs
  baseRecruitmentFee: 25000,
  baseStaffSalary: 8000, // Monthly salary for junior staff

  // Seniority multipliers
  seniorityMultipliers: {
    junior: 1.0,
    mid: 1.8,
    senior: 3.2
  },

  // Performance modifiers
  campaignBonusCoefficient: 0.15, // Efficiency boost to press/rally actions
  recruitmentBonusCoefficient: 0.10, // Cost reduction in onboarding
  corruptionRiskBase: 0.02,         // Base monthly corruption event trigger risk per staff member
};
