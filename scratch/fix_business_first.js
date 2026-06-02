const fs = require('fs');
let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

// 1. Imports
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

// 2. BusinessPage Header
const headerRegex = /<div style=\{\{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: `1px solid \$\{T\.border\}`, paddingBottom: '20px' \}\}>[\s\S]*?(?=<\/div>\s*<\/div>\s*\{!company)/;
const newHeader = `<div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: \`1px solid \$\{T.border\}\`, paddingBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '6px' }}>Net Worth</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: T.gold, fontFamily: 'serif' }}>{formatMoney(netWorth)}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '6px' }}>Cash in Hand</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: T.mint, fontFamily: 'monospace' }}>{formatMoney(playerCash)}</div>
          </div>`;
page = page.replace(headerRegex, newHeader);

// 3. SubTabs Array & Type
page = page.replace(
  /type SubTab = 'overview' \| 'start' \| 'companies' \| 'contracts' \| 'registry' \| 'finance' \| 'equity';/,
  `type SubTab = 'overview' | 'start' | 'companies' | 'registry';`
);
page = page.replace(
  /const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[[^\]]*\];/,
  `const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'start',      label: 'Start Business' },
    { id: 'companies',  label: 'My Companies', requiresCompany: true },
    { id: 'registry',   label: 'Registry' }
  ];`
);

// 4. Render block updates
page = page.replace(
  /\{activeTab === 'contracts'[\s\S]*?refreshAll\} \/>\}/,
  ""
);
page = page.replace(
  /\{activeTab === 'finance'[\s\S]*?netWorth\} \/>\}/,
  ""
);
page = page.replace(
  /\{activeTab === 'equity'[\s\S]*?fleet\} \/>\}/,
  ""
);
page = page.replace(
  /onViewContracts=\{\(\) => setActiveTab\('contracts'\)\}/g,
  "onViewContracts={() => setActiveTab('companies')}"
);

// 5. Extract old CompanyDeskTab
const compStartStr = "function CompanyDeskTab(";
const nextCompStartStr = "function ContractsTab(";

const startIndex = page.indexOf(compStartStr);
const endIndex = page.indexOf(nextCompStartStr);

if (startIndex !== -1 && endIndex !== -1) {
  const beforeComp = page.substring(0, startIndex);
  
  // Notice we also want to remove ContractsTab, FinanceTab, EquityTab entirely.
  // They are sequentially after CompanyDeskTab.
  // We keep OverviewTab, StartBusinessTab, RegistryTab.
  // We'll just replace CompanyDeskTab and let the old ContractsTab etc be deleted.
  // But wait! ContractsTab, RegistryTab, FinanceTab, EquityTab are in that order!
  // If we delete ContractsTab through EquityTab, we must preserve RegistryTab!
  
  // To make it easy, we'll just read up to the start of CompanyDeskTab, and then manually find RegistryTab.
}
fs.writeFileSync('d:\\WorldR\\scratch\\fix_business_first.js', 'done');
