const fs = require('fs');

// 1. Fix page.tsx
let p = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// Fix imports
p = p.replace(
  "import {\\n  getGameDate, formatGameDate, injectCapital, ownerDrawings, useRouter } from 'next/navigation';",
  "import { useRouter } from 'next/navigation';\\nimport { getGameDate, formatGameDate, injectCapital, ownerDrawings } from '../../../lib/businessCore';"
);

// Fix v.type comparison (just remove the filter since VEHICLE_CATALOGUE only has what we need, or check types properly)
// We'll replace the `.filter(v => v.type === 'Van' || v.type === 'Light Truck' || v.type === 'Heavy Truck')`
// with `.filter(v => v.type.includes('Van') || v.type.includes('Truck') || v.type.includes('Hauler'))`
// Actually `VEHICLE_CATALOGUE` just has: 'Light Van', 'Medium Truck', 'Heavy Hauler'.
p = p.replace(
  ".filter(v => v.type === 'Van' || v.type === 'Light Truck' || v.type === 'Heavy Truck')",
  ""
);

// Fix v.baseCost -> v.cost
p = p.split('v.baseCost').join('v.cost');

// Fix c.issuerType === 'npc'
p = p.replace(/c\.issuerType === 'npc'/g, "c.issuerType === 'NPC Corporation' || c.issuerType === 'Local Business'");

// Check if default export is missing
if (!p.includes('export default function')) {
    // If the rewrite deleted the default export, it would be at the bottom.
    // Let's check what's at the end of the file.
    if (!p.includes('export default function BusinessDesk()')) {
        p += "\\nexport default function BusinessDesk() {\\n  return <BusinessDeskPage />;\\n}\\n"; // Wait, what was the default export?
        // Let's restore the original from page_backup
        let backup = fs.readFileSync('scratch/page_backup.tsx', 'utf8');
        let defaultExportMatch = backup.match(/export default function[\\s\\S]*/);
        if (defaultExportMatch) {
            p += "\\n" + defaultExportMatch[0];
        }
    }
}

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', p);


// 2. Fix businessCore.ts
let b = fs.readFileSync('frontend/src/lib/businessCore.ts', 'utf8');

// Fix line 326: 'player' -> 'Player Company'
b = b.replace(
  "issuerType: 'player',",
  "issuerType: 'Player Company',"
);

fs.writeFileSync('frontend/src/lib/businessCore.ts', b);
console.log('Fixed TS errors');
