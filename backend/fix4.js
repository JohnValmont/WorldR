import fs from 'fs';

const p = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let c = fs.readFileSync(p, 'utf-8');

// Fix duplicate imports
const dup = `PieChart as RechartsPieChart, Pie, Cell, PieChart as RechartsPieChart, Pie, Cell`;
c = c.replace(dup, `PieChart as RechartsPieChart, Pie, Cell`);

// Fix entry typing
c = c.replace(/label=\{\(entry\) => /g, "label={(entry: any) => ");

// Fix formatter typing
c = c.replace(/formatter=\{\(value: number\) =>/g, "formatter={(value: any) =>");

fs.writeFileSync(p, c, 'utf-8');
console.log("Fixed types and imports");
