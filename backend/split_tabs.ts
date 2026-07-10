import * as fs from 'fs';

const filePath = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Change Market & Sales to Market Intelligence and add Sales Operations in the nav list
content = content.replace(
  `{ id: 'market', label: 'Market & Sales', icon: BarChart3 },`,
  `{ id: 'sales', label: 'Sales Operations', icon: Tags },\n  { id: 'market', label: 'Market Intelligence', icon: Globe },`
);

// 2. We need to find the START of the MARKET & SALES TAB
const marketTabComment = `{/* ────────────────────────────────────────────────────────────────────────
          MARKET & SALES TAB
      ──────────────────────────────────────────────────────────────────────── */}`;

const startIndex = content.indexOf(`{deskTab === 'market' && (`);
const endIndex = content.indexOf(`{/* ────────────────────────────────────────────────────────────────────────
          STAFFING TAB`);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start/end indices");
  process.exit(1);
}

// 3. We will do this manually by replacing the entire block using a script
// Instead of complex AST, let's just create a modified copy of the file
