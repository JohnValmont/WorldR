const fs = require('fs');
let c = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

// 1. Add addCompanyKnowledge inside ManufacturingController
const classStart = c.indexOf('export class ManufacturingController {');
const addKnowledgeFn = `
  public static async addCompanyKnowledge(trx: any, companyId: string, domain: string, amt: number) {
    await trx.raw(\`
      INSERT INTO manufacturing_company_knowledge (company_id, domain, xp_points)
      VALUES (?, ?, ?)
      ON CONFLICT (company_id, domain) DO UPDATE SET xp_points = manufacturing_company_knowledge.xp_points + ?
    \`, [companyId, domain, amt, amt]);
  }
`;
c = c.substring(0, classStart + 38) + '\n' + addKnowledgeFn + c.substring(classStart + 38);

// 2. Fix getMarkets
const getMarketsStart = c.indexOf('public static async getMarkets(');
if (getMarketsStart !== -1) {
    const brandMapReplace = `const brandMap = new Map();
      for (const b of brandData) {
        brandMap.set(b.region_market_id, b);
      }`;
    const brandMapNew = `const brandMap = new Map();
      for (const b of brandData) {
        brandMap.set(\`\${companyId}_\${b.region_market_id}\`, b);
      }`;
    c = c.replace(brandMapReplace, brandMapNew);

    const simulateReplace = `const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesManagerBonus
      );`;
    const simulateNew = `
      const salesBonusMap = new Map<string, number>();
      salesBonusMap.set(companyId, salesManagerBonus);
      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );`;
    c = c.replace(simulateReplace, simulateNew);
}

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', c);
console.log('Fixed getMarkets and addCompanyKnowledge');
