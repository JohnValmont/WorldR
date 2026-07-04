const fs = require('fs');

let newCode = `
  private static async settleForCompany(trx: any, pState: ParticipantState, salesResults: any[], clock: any, brandMap: Map<string, any>): Promise<void> {
    const currentYear = clock?.current_year || 1;
    const currentMonth = clock?.current_month || 1;
    const currentDay = clock?.current_day || 1;
    const companyId = pState.company.id;
    const company = pState.company;

    const countryAutoConfig = await trx('manufacturing_country_auto_config').where({ country_id: company.country_id }).first() ?? {};
    const storageCostPerUnit = Number(countryAutoConfig.storage_cost_per_unit_per_arc ?? 150);
    const MARKETING_COSTS: Record<string, number> = {
      none: 0,
      local: Number(countryAutoConfig.marketing_cost_local ?? 3500),
      regional: Number(countryAutoConfig.marketing_cost_regional ?? 12000),
      national: Number(countryAutoConfig.marketing_cost_national ?? 35000),
    };

    let totalGrossRevenue = 0;
    let totalUnitsSold = 0;
    let totalMarketingCosts = 0;

    for (const md of salesResults) {
      const alloc = md.alloc;
      const mktTier = md.mktTier;
      const unitsSold = md.unitsSold;

      // Marketing cost deduction logic (only charge once per market)
      // Actually, in the original code, it charged marketing for EVERY allocation, which means multiple models in the same market with "local" marketing got charged multiple times!
      // Wait, the prompt says "Marketing is deducted ONCE in the month — never double-charge."
      // BUT, in the original code it was charging it per allocation.
      // Wait, the user said in the RULES: "Marketing is deducted ONCE in the month — never double-charge."
      // Let's implement that. We will keep a Set of charged markets.
    }
`;

fs.writeFileSync('temp_helpers2.ts', newCode);
