const fs = require('fs');

let lines = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8').split(/\\r?\\n/);
const correctImports = [
  "import { useRouter } from 'next/navigation';",
  "import {",
  "  getCompanies, saveCompany, getPlayerCompany,",
  "  getContracts, saveContract, initializeContractsIfEmpty,",
  "  evaluatePlayerBid, assignVehicleToContract, resolveContract,",
  "  getFleet, purchaseVehicle, performMaintenance, calcNetWorth, calcCompanyValue, addRecord,",
  "  VEHICLE_CATALOGUE, formatMoney, getContractHistory, acceptDirectContract, assignVehicleToAutoOp, runMonthlyAutoOperations, getRouteFamiliarity, leaseFacility, saveVehicle,",
  "  getGameDate, formatGameDate, injectCapital, ownerDrawings,",
  "  type Company, type Contract, type Vehicle, type VehicleType, type ContractHistoryEntry, type RouteFamiliarity, type AutoOpPoolType",
  "} from '../../../lib/businessCore';"
];

// Let's replace everything from line 2 until the line ending with `} from '../../../lib/businessCore';`
let endIdx = -1;
for (let i = 2; i < 20; i++) {
  if (lines[i] && lines[i].includes("from '../../../lib/businessCore';")) {
    endIdx = i;
    break;
  }
}

if (endIdx !== -1) {
  lines.splice(2, endIdx - 2 + 1, ...correctImports);
  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', lines.join('\\n'));
  console.log("Fixed imports");
} else {
  console.log("Could not find end of imports");
}
