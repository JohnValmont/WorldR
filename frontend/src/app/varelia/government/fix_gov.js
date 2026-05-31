const fs = require('fs');
let code = fs.readFileSync('d:/WorldR/frontend/src/app/varelia/government/page.tsx', 'utf8');

// 1. Fix Case B (No Party)
const caseB = `
  if (!ctx.partyId) {
    return (
      <div className="min-h-screen flex flex-col font-sans select-none" style={{ background: BG, color: TEXT }}>
        {renderTopNav()}
        <main className="flex-1 relative overflow-hidden flex">
          <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
            <div className="text-sm font-bold tracking-widest text-zinc-300 uppercase mb-2 text-center">No Party Found</div>
            <div className="text-[11px] text-zinc-500 text-center max-w-md leading-relaxed">
              Government data is unavailable. Create or load a political party first.
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!pastElection || !govRecord) {`;

code = code.replace('  if (!pastElection || !govRecord) {', caseB);

// 2. Safe mapping for parties
code = code.replace(/const sortedParties = \[\.\.\.latestElection\.parties\]/g, 'const sortedParties = [...(latestElection.parties || [])]');
code = code.replace(/const sortedParties = \[\.\.\.pastElection\.parties\]/g, 'const sortedParties = [...(pastElection.parties || [])]');
code = code.replace(/\[\.\.\.pastElection\.parties\]\.sort/g, '[...(pastElection.parties || [])].sort');

// 3. Fallback for Your Seats
const oldCurrentPartySeats = `  const currentPartySeats = pastElection.parties.find((p: any) => p.partyId === ctx.partyId)?.seats || 0;`;
const newCurrentPartySeats = `  const currentPartyRow = (pastElection.parties || []).find((p: any) => 
    (p.partyId && p.partyId === ctx.partyId) ||
    (p.partyAbbreviation && p.partyAbbreviation === ctx.partyAbbreviation) ||
    (p.partyName && p.partyName === ctx.partyName)
  );
  const currentPartySeats = currentPartyRow?.seats || 0;`;
code = code.replace(oldCurrentPartySeats, newCurrentPartySeats);

// 4. Safe ministries filter/map
code = code.replace(/govRecord\.ministries\.filter/g, '(govRecord.ministries || []).filter');
code = code.replace(/govRecord\.ministries\.map/g, '(govRecord.ministries || []).map');

// 5. Safe majoritySeats & parliamentSeats
code = code.replace(/pastElection\.majoritySeats/g, '(pastElection?.majoritySeats || 61)');
code = code.replace(/pastElection\.parliamentSeats/g, '(pastElection?.parliamentSeats || 120)');

fs.writeFileSync('d:/WorldR/frontend/src/app/varelia/government/page.tsx', code);
console.log('government/page.tsx updated successfully.');
