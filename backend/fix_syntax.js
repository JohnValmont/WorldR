const fs = require('fs');
let code = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

const t1 = \  public static simulateSalesDemand(
    marketAllocations: any[],
    brandMap: Map<string, { awareness: number, reputation: number, boostedAwareness?: number }>,
    MARKETING_MULT: Record<string, number>,
    salesManagerBonusMap: Map<string, number>
  ) {\;
const r1 = \  public static simulateSalesDemand(
    marketAllocations: any[],
    brandMap: Map<string, { awareness: number, reputation: number, boostedAwareness?: number }>,
    MARKETING_MULT: Record<string, number>,
    salesManagerBonusMap: Map<string, number> | any
  ) {
    const getBonus = (companyId: string) => {
      if (salesManagerBonusMap && typeof salesManagerBonusMap.get === 'function') {
        return salesManagerBonusMap.get(companyId) || 0;
      }
      if (salesManagerBonusMap && typeof salesManagerBonusMap === 'object') {
        return (salesManagerBonusMap as any)[companyId] || 0;
      }
      return 0;
    };\;
code = code.replace(t1, r1);

const t2 = \const salesManagerBonus = salesManagerBonusMap.get(alloc.company_id) || 0;\;
const r2 = \const salesManagerBonus = getBonus(alloc.company_id);\;
code = code.replace(t2, r2);

const t3 = \    if (totalUnitsProduced > 0) {\;
const r3 = \    if (pState.totalUnitsProduced > 0) {\;
code = code.replace(t3, r3);

const t4 = \       const xpGain = Math.round(50 + (totalUnitsProduced * 0.05 * scaleFactor));\;
const r4 = \       const xpGain = Math.round(50 + (pState.totalUnitsProduced * 0.05 * scaleFactor));\;
code = code.replace(t4, r4);

const t5 = \    if (totalUnitsSold > 0) {\;
const r5 = \    let totalUnitsSoldFinal = 0;
    for (const m of pState.modelTracking.values()) {
        totalUnitsSoldFinal += (m.sold || 0);
    }
    if (totalUnitsSoldFinal > 0) {\;
code = code.replace(t5, r5);

const t6 = \const xpGain = Math.round(50 + (totalUnitsSold * 0.05 * scaleFactor));\;
const r6 = \const xpGain = Math.round(50 + (totalUnitsSoldFinal * 0.05 * scaleFactor));\;
code = code.replace(t6, r6);

const t7 = \wait runNpcBrainForCompany(trx, company.id, currentArc);\;
const r7 = \wait runNpcBrainForCompany(trx, company.id, currentOrbit, currentArc);\;
code = code.replace(t7, r7);

const t8 = \      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );
      for (const b of brandData) {
        brandMap.set(b.region_market_id, b);
      }

      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesManagerBonus
      );\;
const r8 = \      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );\;
code = code.replace(t8, r8);

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', code);
console.log('Fixed syntax and applied fallback');
