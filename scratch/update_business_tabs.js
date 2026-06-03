const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update SUB_TABS
code = code.replace(/const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[\s*\];/, 
`const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'start', label: 'Start Business' },
  { id: 'companies', label: 'My Companies', requiresCompany: true },
  { id: 'exchange', label: 'Drennport Exchange' },
  { id: 'registry', label: 'Registry' }
];`);

// 2. Remove MarketTab
const marketTabRegex = /function MarketTab\(\{[^]*?return \([^]*?\);\n\}/m;
code = code.replace(marketTabRegex, '');

// 3. Update DESK_TABS
code = code.replace(/const DESK_TABS: \{ id: CompanyDeskTab; label: string \}\[\] = \[[\\s\\S]*?\];/, 
`const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'operations', label: 'Operations' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'procurement', label: 'Procurement' },
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets', label: 'Assets' },
    { id: 'fleet', label: 'Fleet' },
    { id: 'routes', label: 'Routes' },
    { id: 'finance', label: 'Finance' },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records', label: 'Records' },
    { id: 'equity', label: 'Equity' },
  ];`);

// 4. Update type CompanyDeskTab
code = code.replace(/type CompanyDeskTab = 'overview' \| 'operations' \| 'contracts' \| 'procurement' \| 'facilities' \| 'assets' \| 'fleet' \| 'routes' \| 'finance' \| 'contractHistory' \| 'records' \| 'equity';/g, 
`type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'procurement' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';`);

fs.writeFileSync(file, code);
console.log('Done');
