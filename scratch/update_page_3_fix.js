const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

// 1. Fix SubTab type definition
page = page.replace(
  /type SubTab = 'overview' \| 'start' \| 'companies' \| 'contracts' \| 'registry' \| 'finance' \| 'equity';/,
  `type SubTab = 'overview' | 'start' | 'companies' | 'registry';`
);

// 2. Fix SUB_TABS array using regex
const tabsRegex = /const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[[^\]]*\];/;
const newTabs = `const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'start',      label: 'Start Business' },
  { id: 'companies',  label: 'My Companies', requiresCompany: true },
  { id: 'registry',   label: 'Registry' }
];`;
page = page.replace(tabsRegex, newTabs);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', page);
