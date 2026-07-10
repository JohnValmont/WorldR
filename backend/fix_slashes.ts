import fs from 'fs';

const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(/label=\{\(entry\) => \\`\\\${entry\.companyName\} \(\\\${\(entry\.marketShare \* 100\)\.toFixed\(1\)\}%\\\)\`\}/g,
              "label={(entry) => `${entry.companyName} (${(entry.marketShare * 100).toFixed(1)}%)`}");
              
c = c.replace(/<Cell key=\{\\`cell-\\\${index}\\`\} fill=\{/g,
              "<Cell key={`cell-${index}`} fill={");
              
c = c.replace(/formatter=\{\(value: number\) => \[\\`\\\${\(value \* 100\)\.toFixed\(1\)}%\\`, 'Market Share'\]\}/g,
              "formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Market Share']}");

fs.writeFileSync(p, c, 'utf-8');
console.log("Fixed backslashes");
