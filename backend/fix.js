const fs = require('fs');
const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(/label=\{\(entry\) => \\`\\\$\{entry\.companyName\} \(\\\$\{\(entry\.marketShare \* 100\)\.toFixed\(1\)\}%\\\)\\`\}/g, "label={(entry) => `${entry.companyName} (${(entry.marketShare * 100).toFixed(1)}%)`}");

fs.writeFileSync(p, c, 'utf-8');
console.log("Fixed backslashes");
