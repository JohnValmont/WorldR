/**
 * Welfare Balancing Parameters
 */
export const WelfareBalance = {
  // Efficiency of welfare spending transfer (loss to bureaucracy)
  welfareEfficiency: 0.88,

  // Class distributions of benefits (how much of the welfare pie goes where)
  benefitWeights: {
    Poor: 0.60,
    Working: 0.30,
    Middle: 0.10,
    Wealthy: 0.00,
    Elite: 0.00
  },

  // Index scaling thresholds (percentage of GDP spent on welfare to reach maximum health index)
  optimumWelfareSpendRatio: 0.08, // 8% of GDP
};
