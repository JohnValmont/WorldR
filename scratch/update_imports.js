const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

const importRegex = /import \{\s*getCompanies[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/lib\/businessCore';/;

const newImports = `import {
  getCompanies, saveCompany, getPlayerCompany,
  getContracts, saveContract, initializeContractsIfEmpty,
  evaluatePlayerBid, assignVehicleToContract, resolveContract,
  getFleet, purchaseVehicle, performMaintenance, calcNetWorth, calcCompanyValue, addRecord,
  VEHICLE_CATALOGUE, formatMoney, getContractHistory, acceptDirectContract, assignVehicleToAutoOp, runMonthlyAutoOperations, getRouteFamiliarity,
  type Company, type Contract, type Vehicle, type VehicleType, type ContractHistoryEntry, type RouteFamiliarity, type AutoOpPoolType
} from '../../../lib/businessCore';`;

page = page.replace(importRegex, newImports);
fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', page);
