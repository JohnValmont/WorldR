const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

const tSearch = 'const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [';
const tEnd = '];';
const tStartIdx = c.indexOf(tSearch);
if (tStartIdx !== -1) {
  const tEndIdx = c.indexOf(tEnd, tStartIdx) + 2;
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
}

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Modified desk tabs');
