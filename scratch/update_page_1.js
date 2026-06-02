const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

// 1. Update imports
page = page.replace(
  `import {
  Company, Vehicle, VehicleType, VEHICLE_CATALOGUE, Contract, ContractBid,
  getCompanies, getFleet, getContracts,
  saveCompany, purchaseVehicle, performMaintenance, evaluatePlayerBid, assignVehicleToContract, resolveContract,
  calcCompanyValue, calcNetWorth, isNameReserved, reserveName
} from '@/lib/businessCore';`,
  `import {
  Company, Vehicle, VehicleType, VEHICLE_CATALOGUE, Contract, ContractBid,
  getCompanies, getFleet, getContracts,
  saveCompany, purchaseVehicle, performMaintenance, evaluatePlayerBid, assignVehicleToContract, resolveContract,
  calcCompanyValue, calcNetWorth, isNameReserved, reserveName,
  formatMoney, getContractHistory, ContractHistoryEntry,
  acceptDirectContract, assignVehicleToAutoOp, runMonthlyAutoOperations,
  getRouteFamiliarity, RouteFamiliarity, AutoOpPoolType
} from '@/lib/businessCore';`
);

// 2. Replace Header in BusinessPage
const headerRegex = /<div style=\{\{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: `1px solid \$\{T\.border\}`, paddingBottom: '20px' \}\}>[\s\S]*?(?=<\/div>\s*<\/div>\s*\{!company)/;
const newHeader = `<div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: \`1px solid \$\{T.border\}\`, paddingBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '6px' }}>Net Worth</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: T.gold, fontFamily: 'serif' }}>{formatMoney(calcNetWorth(playerCash, company))}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '6px' }}>Cash in Hand</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: T.mint, fontFamily: 'monospace' }}>{formatMoney(playerCash)}</div>
          </div>`;
page = page.replace(headerRegex, newHeader);

// Now write this intermediate state
fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', page);
