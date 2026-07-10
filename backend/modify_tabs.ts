import fs from 'fs';

const filePath = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\ManufacturingDeskTab.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Navigation
// The navigation change is already covered in my earlier plan, but let's do it cleanly:
content = content.replace(
  `{ id: 'market', label: 'Market & Sales', icon: BarChart3 },`,
  `{ id: 'sales', label: 'Sales Operations', icon: Tags },\n  { id: 'market', label: 'Market Intelligence', icon: Globe },`
);

// We need to find the blocks:
const splitStart = content.indexOf(`{deskTab === 'market' && (`);
const splitEnd = content.indexOf(`{deskTab === 'staff' && (`); // up to the next block

if (splitStart === -1 || splitEnd === -1) {
  console.log("Error finding block boundaries.");
  process.exit(1);
}

const originalBlock = content.slice(splitStart, splitEnd);

// Break it down:
const summaryRowStart = originalBlock.indexOf(`{/* Summary Row */}`);
const marketsAndAllocStart = originalBlock.indexOf(`{/* Markets & Allocations */}`);
const marketIntelligenceStart = originalBlock.indexOf(`{/* Market Intelligence */}`);
const populationOutlookStart = originalBlock.indexOf(`{/* Population Purchase Outlook */}`);
const recentSalesStart = originalBlock.indexOf(`{/* Recent Sales Results */}`);
const closeFragmentEnd = originalBlock.lastIndexOf(`</>`);

const summaryRowBlock = originalBlock.slice(summaryRowStart, marketsAndAllocStart);

// The loading logic wrapper
const loadingWrapperStart = originalBlock.slice(marketsAndAllocStart, originalBlock.indexOf(`<PanelBox>`, marketsAndAllocStart)); 
// wait, instead of guessing, let's just use string replace.

const newSalesBlock = `
      {/* ────────────────────────────────────────────────────────────────────────
          SALES OPERATIONS TAB
      ──────────────────────────────────────────────────────────────────────── */}
      {deskTab === 'sales' && (
        <div className="flex flex-col gap-5">
          <SectionHeader stamp="SALES DESK">Sales Operations</SectionHeader>

          ${originalBlock.slice(summaryRowStart, marketsAndAllocStart)}
          {marketLoading ? (
            <div className="text-zinc-500 text-xs p-6 font-mono animate-pulse">Loading sales data...</div>
          ) : (
            <>
              ${originalBlock.slice(originalBlock.indexOf(`{/* Models / Pricing */}`), marketIntelligenceStart)}
              ${originalBlock.slice(recentSalesStart, originalBlock.lastIndexOf(`</>`))}
            </>
          )}
        </div>
      )}
`;

const newMarketBlock = `
      {/* ────────────────────────────────────────────────────────────────────────
          MARKET INTELLIGENCE TAB
      ──────────────────────────────────────────────────────────────────────── */}
      {deskTab === 'market' && (
        <div className="flex flex-col gap-5">
          <SectionHeader stamp="MARKET INTEL">Market Intelligence</SectionHeader>

          {marketLoading ? (
            <div className="text-zinc-500 text-xs p-6 font-mono animate-pulse">Loading market data...</div>
          ) : (
            <>
              ${originalBlock.slice(marketIntelligenceStart, populationOutlookStart)}
              ${originalBlock.slice(populationOutlookStart, recentSalesStart)}
            </>
          )}
        </div>
      )}
`;

const newContent = content.slice(0, splitStart) + newSalesBlock + "\n" + newMarketBlock + "\n" + content.slice(splitEnd);

fs.writeFileSync(filePath + '.new.tsx', newContent, 'utf-8');
console.log("Successfully generated modified file.");
