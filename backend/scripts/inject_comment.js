const fs = require('fs');
let txt = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

const target = `         // 6. BANKRUPTCY HANDLING (NPCs only)
         for (const company of participants) {`;

const replacement = `         // 6. BANKRUPTCY HANDLING (NPCs only)
         // Death-spiral guard: 
         // When an NPC respawns, it gets full seedCapital (e.g. 1.5M - 2.5M).
         // The brain's heuristics (PRODUCTION_BUFFER bounds new production to recent sales or capacity, 
         // and MARKETING_REVENUE_PCT strictly limits marketing to 5% of prior revenue)
         // ensures it scales conservatively and will not instantly burn through its seed capital
         // in a single month, preventing an infinite bankruptcy/respawn loop.
         for (const company of participants) {`;

if (txt.includes(target)) {
  txt = txt.replace(target, replacement);
  fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', txt);
  console.log('Successfully injected the comment.');
} else {
  console.log('Target not found!');
}
