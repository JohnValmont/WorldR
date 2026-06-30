const fs = require('fs');
let c = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

c = c.replace(
\`      const brandMap = new Map<string, any>();
      for (const b of brandData) {
        brandMap.set(b.region_market_id, b);
      }

      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesManagerBonus
      );\`,
\`      const brandMap = new Map<string, any>();
      for (const b of brandData) {
        brandMap.set(\\\`\${companyId}_\${b.region_market_id}\\\`, b);
      }

      const salesBonusMap = new Map<string, number>();
      salesBonusMap.set(companyId, salesManagerBonus);
      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );\`
);

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', c);
console.log('Done!');
