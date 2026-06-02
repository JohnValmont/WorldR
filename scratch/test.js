const fs = require('fs');
const code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

console.log("StartBusiness Grid Wrapper:", /(function StartBusinessTab[\s\S]*?return \(\s*)(<div style=\{\{ maxWidth: '620px' \}\}>)/.test(code));
console.log("My Companies Right Rail:", /(“Multiple company ownership[\s\S]*?<\/p>\s*<\/div>\s*<\/div>\s*)(<\/div>\s*\}\))/.test(code));
console.log("BusinessPage Extra Closing Div:", /(\s*)(<\/div>\s*<\/div>\s*\)\;\s*\}\s*\/\/ ───\s*\/\/ OVERVIEW TAB)/.test(code));

let deskRegex = /(function CompanyDeskTab[\s\S]*?\n\}\n\n)/;
console.log("CompanyDeskTab:", deskRegex.test(code));

let assetsStart = /function AssetsTab\(\{ company, fleet, onRefresh, showNotif \}: \{ company: Company; fleet: Vehicle\[\]; onRefresh: \(\) => void; showNotif: \(m: string, s: boolean\) => void \}\) \{\s*return \(\s*<div style=\{\{ maxWidth: '860px' \}\}>/;
console.log("AssetsTab:", assetsStart.test(code));
