const fs = require('fs');

// Restore original content from disk (assume git checkout was run)
let orig = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

// The original file goes from:
//   public static async processManufacturingArc(req: Request, res: Response, next: NextFunction) {
// to the end of that function. We need to find the exact boundaries.

const lines = orig.split('\n');

const startProcess = lines.findIndex(l => l.includes('public static async processManufacturingArc('));
const endProcess = lines.findIndex((l, idx) => idx > startProcess && l.includes('public static async pauseProductionLine(')) - 2;

const part1Lines = lines.slice(0, startProcess);
const part3Lines = lines.slice(endProcess + 1);

let part1 = part1Lines.join('\n');
const part3 = '\n' + part3Lines.join('\n');

const helpers1 = fs.readFileSync('temp_helpers1.ts', 'utf8').replace(/export interface ParticipantState \{[\s\S]*?\n  \}/, '');
const helpers3 = fs.readFileSync('temp_helpers3.ts', 'utf8');
const processStr = fs.readFileSync('temp_process.ts', 'utf8');

// 1. Update simulateSalesDemand signature and logic in part1
part1 = part1.replace(
  'salesManagerBonus: number',
  'salesManagerBonusMap: Map<string, number>'
);
part1 = part1.replace(
  'const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);',
  'const salesManagerBonus = salesManagerBonusMap.get(alloc.company_id) || 0;\n          const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);'
);
part1 = part1.replace(
  'const brandMap: Map<string, { awareness: number, reputation: number }>,',
  'brandMap: Map<string, { awareness: number, reputation: number, boostedAwareness?: number }>,'
);
part1 = part1.replace(
  'const localBrand = brandMap.get(market.region_market_id);',
  'const brandKey = \`${alloc.company_id}_\${market.region_market_id}\`;\n        const localBrand = brandMap.get(brandKey);'
);

// 2. Add ParticipantState interface before the class
const ParticipantStateInterface = `
export interface ParticipantState {
  company: any;
  runningCash: number;
  totalProductionCosts: number;
  totalDefectiveUnits: number;
  totalPlannedUnits: number;
  totalUnitsProduced: number;
  totalStaffWages: number;
  totalLeaseCosts: number;
  totalMaintenanceCosts: number;
  totalStorageCosts: number;
  totalWarrantyReserveCost: number;
  modelTracking: Map<string, any>;
  activeMarketCount: number;
  approvedResearchNames: string[];
  marketStatsMap: Map<string, any>;
  staff: any[];
}
`;
const classIndex = part1.indexOf('export class ManufacturingController {');
part1 = part1.substring(0, classIndex) + ParticipantStateInterface + '\n' + part1.substring(classIndex);

// 3. Add runNpcBrainForCompany import
part1 = part1.replace(
  "import { MARKET_SEGMENTS } from '../constants/marketSegments';",
  "import { MARKET_SEGMENTS } from '../constants/marketSegments';\nimport { runNpcBrainForCompany } from '../services/npcBrain.service';"
);

// 4. Add addCompanyKnowledge inside ManufacturingController
const addKnowledgeFn = `
  private static async addCompanyKnowledge(trx: any, companyId: string, domain: string, amt: number) {
    await trx.raw(\`
      INSERT INTO manufacturing_company_knowledge (company_id, domain, xp_points)
      VALUES (?, ?, ?)
      ON CONFLICT (company_id, domain) DO UPDATE SET xp_points = manufacturing_company_knowledge.xp_points + ?
    \`, [companyId, domain, amt, amt]);
  }
`;
part1 = part1.substring(0, classIndex + ParticipantStateInterface.length + 39) + '\n' + addKnowledgeFn + part1.substring(classIndex + ParticipantStateInterface.length + 39);


// 5. Update getMarkets in part3
const getMarketsStart = part3.indexOf('public static async getMarkets(');
const blockStart = part3.indexOf('const brandMap = new Map<string, any>();', getMarketsStart);
const blockEnd = part3.indexOf(');', blockStart) + 2;

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

const finalPart3 = part3.substring(0, blockStart) + newBlock + part3.substring(blockEnd);

// Combine everything
const finalCode = part1 + '\n' + helpers1 + '\n' + helpers3 + '\n' + processStr + '\n' + finalPart3;

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', finalCode);
console.log('Successfully applied all patches cleanly.');
