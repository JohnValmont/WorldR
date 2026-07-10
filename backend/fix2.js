const fs = require('fs');
const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

const target1 = "label={(entry) => `\\${entry.companyName} (\\${(entry.marketShare * 100).toFixed(1)}%)`}";
const replacement1 = "label={(entry) => `${entry.companyName} (${(entry.marketShare * 100).toFixed(1)}%)`}";

const target2 = "<Cell key={`cell-\\${index}`} fill={['#36d399', '#6ea8fe', '#d4af37', '#b85555', '#a855f7', '#f97316'][index % 6]} />";
const replacement2 = "<Cell key={`cell-${index}`} fill={['#36d399', '#6ea8fe', '#d4af37', '#b85555', '#a855f7', '#f97316'][index % 6]} />";

const target3 = "formatter={(value: number) => [`\\${(value * 100).toFixed(1)}%`, 'Market Share']}";
const replacement3 = "formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Market Share']}";

c = c.replace(target1, replacement1);
c = c.replace(target2, replacement2);
c = c.replace(target3, replacement3);

fs.writeFileSync(p, c, 'utf-8');
console.log("Fixed manually");
