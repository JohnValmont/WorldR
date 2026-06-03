const fs = require('fs');
let p = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

const target = "type SubTab = 'overview' | 'companies' | 'exchange' | 'registry';\n\nconst SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [\n    { id: 'market',     label: 'Market' },\n    { id: 'registry',   label: 'Registry' }\n  ];";

const replacement = "type SubTab = 'overview' | 'start' | 'companies' | 'exchange' | 'registry';\n\nconst SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [\n  { id: 'overview',   label: 'Overview' },\n  { id: 'start',      label: 'Start Business' },\n  { id: 'companies',  label: 'My Companies', requiresCompany: true },\n  { id: 'exchange',   label: 'Drennport Exchange' },\n  { id: 'registry',   label: 'Registry' }\n];";

p = p.replace(target, replacement);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', p);
console.log('Fixed SubTab');
