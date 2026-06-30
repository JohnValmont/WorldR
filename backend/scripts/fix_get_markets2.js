const fs = require('fs');
let c = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

c = c.replace(/const brandMap = new Map<string, any>\(\);\s*for \(const b of brandData\) \{\s*brandMap\.set\(b\.region_market_id, b\);\s*\}/g,
\`const brandMap = new Map<string, any>();
      for (const b of brandData) {
        brandMap.set(\\\`\${companyId}_\${b.region_market_id}\\\`, b);
      }\`);

c = c.replace(/const forecast = ManufacturingController\.simulateSalesDemand\(\s*joinedAllocations,\s*brandMap,\s*MARKETING_MULT,\s*salesManagerBonus\s*\);/g,
\`const salesBonusMap = new Map<string, number>();
      salesBonusMap.set(companyId, salesManagerBonus);
      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );\`);

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', c);
console.log('Fixed getMarkets properly');
