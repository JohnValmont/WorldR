const fs = require('fs');

const orig = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');
const lines = orig.split('\n');

const startProcess = lines.findIndex(l => l.includes('public static async processManufacturingArc('));
const endProcess = lines.findIndex(l => l.includes('public static async pauseProductionLine(')) - 2;

const part1 = lines.slice(0, startProcess).join('\n');
const part3 = '\n' + lines.slice(endProcess + 1).join('\n');

const helpers1 = fs.readFileSync('temp_helpers1.ts', 'utf8');
const helpers3 = fs.readFileSync('temp_helpers3.ts', 'utf8');
const processStr = fs.readFileSync('temp_process.ts', 'utf8');

// I also need to update simulateSalesDemand, let's replace it in part1
let finalPart1 = part1.replace(
  'salesManagerBonus: number',
  'salesManagerBonusMap: Map<string, number>'
);
finalPart1 = finalPart1.replace(
  'const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);',
  'const salesManagerBonus = salesManagerBonusMap.get(alloc.company_id) || 0;\n          const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);'
);
finalPart1 = finalPart1.replace(
  'const brandMap: Map<string, { awareness: number, reputation: number }>,',
  'brandMap: Map<string, { awareness: number, reputation: number, boostedAwareness?: number }>,'
);
// In simulateSalesDemand, localBrand lookup needs to use the brandKey (companyId_marketId) instead of just marketId
// The original was: const localBrand = brandMap.get(market.region_market_id);
finalPart1 = finalPart1.replace(
  'const localBrand = brandMap.get(market.region_market_id);',
  'const brandKey = `${alloc.company_id}_${market.region_market_id}`;\n        const localBrand = brandMap.get(brandKey);'
);

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

// Insert the interface right before the class
const classIndex = finalPart1.indexOf('export class ManufacturingController {');
finalPart1 = finalPart1.substring(0, classIndex) + ParticipantStateInterface + '\n' + finalPart1.substring(classIndex);

// Add imports
finalPart1 = finalPart1.replace(
  "import { MARKET_SEGMENTS } from '../constants/marketSegments';",
  "import { MARKET_SEGMENTS } from '../constants/marketSegments';\nimport { runNpcBrainForCompany } from '../services/npcBrain.service';"
);

// We should remove the duplicate ParticipantState interface from helpers1 if we moved it out.
// helpers1 currently has `  export interface ParticipantState { ... }` at the top. Let's remove it.
let cleanHelpers1 = helpers1.replace(/export interface ParticipantState \{[\s\S]*?\n  \}/, '');

const finalCode = finalPart1 + '\n' + cleanHelpers1 + '\n' + helpers3 + '\n' + processStr + '\n' + part3;

fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', finalCode);
console.log('Successfully stitched correctly!');
