const fs = require('fs');

let p = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

p = p.replace(
  /type SubTab = 'overview' \| 'companies' \| 'exchange' \| 'registry';\s*const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[\s*\{ id: 'market',\s*label: 'Market' \},\s*\{ id: 'registry',\s*label: 'Registry' \}\s*\];/m,
  \`type SubTab = 'overview' | 'start' | 'companies' | 'exchange' | 'registry';

const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'start',      label: 'Start Business' },
  { id: 'companies',  label: 'My Companies', requiresCompany: true },
  { id: 'exchange',   label: 'Drennport Exchange' },
  { id: 'registry',   label: 'Registry' }
];\`
);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', p);
console.log('Fixed SubTab');
