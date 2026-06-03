const fs = require('fs');

let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Navigation Setup
c = c.replace(/type SubTab = [^;]+;/, "type SubTab = 'overview' | 'start' | 'companies' | 'market' | 'registry';");
c = c.replace(/const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[([\s\S]*?)\];/, 
`const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'start',      label: 'Start Business' },
    { id: 'companies',  label: 'My Companies', requiresCompany: true },
    { id: 'market',     label: 'Market' },
    { id: 'registry',   label: 'Registry' }
  ];`);

c = c.replace(/type CompanyDeskTab = [^;]+;/, "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';");

const tSearch = 'const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [';
const tStartIdx = c.indexOf(tSearch);
const tEndIdx = c.indexOf('];', tStartIdx) + 2;
const newTabs = `const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets',     label: 'Assets'     },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];`;
c = c.substring(0, tStartIdx) + newTabs + c.substring(tEndIdx);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Done chunk 1');
