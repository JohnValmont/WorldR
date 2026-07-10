import fs from 'fs';

const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

// The exact string in the file is:
// label={(entry) => \`\${entry.companyName} (\${(entry.marketShare * 100).toFixed(1)}%)\`}
// We want to remove the backslashes.

const target = "label={(entry) => \\`\\${entry.companyName} (\\${(entry.marketShare * 100).toFixed(1)}%)\\`}";
const replacement = "label={(entry) => `${entry.companyName} (${(entry.marketShare * 100).toFixed(1)}%)`}";

c = c.replace(target, replacement);

fs.writeFileSync(p, c, 'utf-8');
console.log("Fixed label!");
