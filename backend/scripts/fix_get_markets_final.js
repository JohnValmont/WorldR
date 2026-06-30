const fs = require('fs');
let c = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

// Find getMarkets
const getMarketsStart = c.indexOf('public static async getMarkets(');
if (getMarketsStart !== -1) {
    // Within getMarkets, find the simulateSalesDemand call
    const blockStart = c.indexOf('const brandMap = new Map<string, any>();', getMarketsStart);
    const blockEnd = c.indexOf(');', blockStart) + 2;

    const oldBlock = c.substring(blockStart, blockEnd);

    const newBlock = `const brandMap = new Map<string, any>();
      for (const b of brandData) {
        brandMap.set(\`\${companyId}_\${b.region_market_id}\`, b);
      }

      const salesBonusMap = new Map<string, number>();
      salesBonusMap.set(companyId, salesManagerBonus);
      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );`;

    c = c.substring(0, blockStart) + newBlock + c.substring(blockEnd);
    fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', c);
    console.log('Replaced successfully');
} else {
    console.log('getMarkets not found');
}
