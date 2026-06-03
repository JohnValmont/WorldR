const fs = require('fs');
let p = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

const target = "const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [\n  ];";

const replacement = "const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [\n  { id: 'overview',   label: 'Overview' },\n  { id: 'start',      label: 'Start Business' },\n  { id: 'companies',  label: 'My Companies', requiresCompany: true },\n  { id: 'exchange',   label: 'Drennport Exchange' },\n  { id: 'registry',   label: 'Registry' }\n];";

p = p.replace(target, replacement);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', p);
console.log('Fixed SubTabs array');
