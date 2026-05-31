const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/app/varelia/government/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace renderSeatChart (Assuming this worked in the first try because there was no error)
const renderSeatChartOldStr = `  const renderSeatChart = () => {`;
const renderSeatChartEndStr = `  const currentPartyGov = govRecord.governingPartyId === ctx.partyId;`;

const chartStart = content.indexOf(renderSeatChartOldStr);
const chartEnd = content.indexOf(renderSeatChartEndStr);

if (chartStart !== -1 && chartEnd !== -1) {
  const chartSection = content.substring(chartStart, chartEnd);
  
  const renderSeatChartNew = `  const renderSeatChart = () => {
    // Collect groups
    const sortedParties = [...(pastElection.parties || [])].sort((a, b) => b.seats - a.seats);
    let groups: {id: string, name: string, abb: string, seats: number, color: string, isGov: boolean}[] = [];
    
    sortedParties.forEach(p => {
      if (p.seats > 0) {
        const isGov = p.partyId === govRecord?.governingPartyId;
        groups.push({ 
          id: p.partyId, 
          name: p.partyName,
          abb: p.partyAbbreviation,
          seats: p.seats, 
          color: isGov ? ACCENT : '#4a5045',
          isGov
        });
      }
    });
    
    if (pastElection.independentIndividuals?.seats > 0) {
      groups.push({
        id: 'independent',
        name: 'Independent Individuals',
        abb: 'IND',
        seats: pastElection.independentIndividuals.seats,
        color: '#3f3f46',
        isGov: false
      });
    }

    const totalSeats = pastElection?.parliamentSeats || 120;
    const majorityReq = pastElection?.majoritySeats || 61;
    
    // Smaller compact chart
    const rows = 4;
    const rowRadii = [60, 80, 100, 120];
    const seatsPerRow = [20, 26, 33, 41]; // sums to 120
    const cx = 140;
    const cy = 135;
    
    let dots: {x: number, y: number, color: string, id: string, isGov: boolean}[] = [];
    let currentGroupIdx = 0;
    let seatsPlacedForGroup = 0;

    for (let r = 0; r < rows; r++) {
      const radius = rowRadii[r];
      const count = seatsPerRow[r];
      for (let i = 0; i < count; i++) {
        const angle = Math.PI - (i / (count - 1)) * Math.PI;
        const x = cx + radius * Math.cos(angle);
        const y = cy - radius * Math.sin(angle);
        
        let color = '#333';
        let id = 'empty';
        let isGov = false;
        
        if (currentGroupIdx < groups.length) {
          color = groups[currentGroupIdx].color;
          id = groups[currentGroupIdx].id;
          isGov = groups[currentGroupIdx].isGov;
          seatsPlacedForGroup++;
          if (seatsPlacedForGroup >= groups[currentGroupIdx].seats) {
            currentGroupIdx++;
            seatsPlacedForGroup = 0;
          }
        }
        
        dots.push({ x, y, color, id, isGov });
      }
    }

    const govGroups = groups.filter(g => g.isGov);
    const oppGroups = groups.filter(g => !g.isGov);

    return (
      <div className="w-full flex flex-col items-center">
        <svg width="280" height="150" viewBox="0 0 280 150" className="w-full h-auto drop-shadow-lg max-w-[280px]">
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={3.5} fill={d.color} opacity={d.isGov ? 1 : 0.6} stroke={d.isGov ? 'rgba(212,169,31,0.5)' : 'none'} strokeWidth={d.isGov ? 1 : 0}>
              <title>{d.id === 'independent' ? 'IND · Independent Individuals' : 'MP · Party Member'}</title>
            </circle>
          ))}
          <text x={cx} y={cy - 20} textAnchor="middle" className="text-2xl font-bold font-mono" fill="#d4d4d8">
            {formatNumberUS(totalSeats)}
          </text>
          <text x={cx} y={cy - 5} textAnchor="middle" className="text-[9px] font-mono tracking-[0.2em] uppercase" fill="#71717a">
            SEATS
          </text>
          
          <line x1={cx} y1={cy - 60} x2={cx} y2="15" stroke="#71717a" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
          <text x={cx} y="10" textAnchor="middle" className="text-[8px] font-mono uppercase tracking-widest" fill="#71717a">
            Majority {majorityReq}
          </text>
        </svg>

        <div className="w-full mt-2 flex flex-col gap-4">
          <div>
            <div className="text-[9px] uppercase font-mono tracking-widest text-emerald-500/80 mb-2 font-bold">Government</div>
            {govGroups.length > 0 ? govGroups.map(g => (
              <div key={g.id} className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                  <span className="text-xs font-bold text-zinc-200">{g.abb} &middot; {g.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">{g.seats} seats</span>
              </div>
            )) : <div className="text-[11px] text-zinc-500">None</div>}
          </div>
          <div>
            <div className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 mb-2 font-bold">Opposition / Non-Party</div>
            {oppGroups.length > 0 ? oppGroups.map(g => (
              <div key={g.id} className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.color }} />
                  <span className="text-xs font-bold text-zinc-400">{g.abb} &middot; {g.name}</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">{g.seats} seats</span>
              </div>
            )) : <div className="text-[11px] text-zinc-500">None</div>}
          </div>
        </div>
      </div>
    );
  };
  
`;
  content = content.replace(chartSection, renderSeatChartNew);
} else {
  console.log("Could not find renderSeatChart boundaries");
}

// 2. Replace Parliament section
const pStartStr = `        {activeGovSubtab === 'Parliament' && (() => {`;
const pEndStr = `        {activeGovSubtab === 'Cabinet' && (`;

const pStart = content.indexOf(pStartStr);
const pEnd = content.indexOf(pEndStr);

if (pStart !== -1 && pEnd !== -1) {
  const parliamentSection = content.substring(pStart, pEnd);
  
  const parliamentNew = `{activeGovSubtab === 'Parliament' && (() => {
          const govPartyId = govRecord?.governingPartyId;
          const govPartyObj = (pastElection?.parties || []).find((p:any) => p.partyId === govPartyId);
          const governingSeats = govPartyObj ? govPartyObj.seats : 0;
          const majorityReq = pastElection?.majoritySeats || 61;
          const totalSeats = pastElection?.parliamentSeats || 120;
          
          let majorityStatusTitle = 'NO PLAYER-LED GOVERNMENT';
          let majorityStatusColor = '#a1a1aa'; // zinc-400
          let majorityStatusText = 'No government has been formed.';
          
          if (govPartyId) {
            if (governingSeats >= majorityReq) {
              majorityStatusTitle = 'MAJORITY SECURED';
              majorityStatusColor = ACCENT;
              majorityStatusText = \`+\${governingSeats - majorityReq} above majority\`;
            } else {
              majorityStatusTitle = 'MINORITY GOVERNMENT';
              majorityStatusColor = '#f59e0b'; // amber-500
              majorityStatusText = \`\${majorityReq - governingSeats} seats short of majority\`;
            }
          }

          return (
            <div className="mx-auto" style={{ maxWidth: '1560px', padding: '0 24px', marginBottom: '48px' }}>
              <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: 'minmax(0, 1fr)', '@media (min-width: 1050px)': { gridTemplateColumns: '350px 1fr' } } as any} 
                ref={(el) => { if(el) { if(window.innerWidth >= 1050) el.style.gridTemplateColumns = '350px 1fr'; else el.style.gridTemplateColumns = 'minmax(0, 1fr)'; } }}>
                
                {/* LEFT COLUMN: Compact 350px Fixed on desktop */}
                <div className="space-y-5" style={{ minWidth: '0' }}>
                  {/* Unified Chamber Makeup & Majority Card */}
                  <div className="p-5 rounded-sm flex flex-col" style={{ background: PANEL, border: \`1px solid \${BORDER}\` }}>
                    <div className="text-[11px] uppercase font-mono tracking-widest text-zinc-300 font-bold mb-4 w-full border-b pb-3" style={{ borderColor: BORDER }}>
                      CURRENT PARLIAMENT
                    </div>
                    {renderSeatChart()}
                    
                    <div className="mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
                      <div className="text-[10px] uppercase font-mono tracking-widest font-bold mb-1" style={{ color: majorityStatusColor }}>
                        {majorityStatusTitle}
                      </div>
                      <div className="text-xs text-zinc-400">{majorityStatusText}</div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Flexible 1fr Legislative Floor */}
                <div className="space-y-5" style={{ minWidth: '0', flex: 1 }}>
                  {/* Legislative Floor Card */}
                  <div className="p-6 rounded-sm flex flex-col h-full min-h-[500px]" style={{ background: PANEL, border: \`1px solid \${BORDER}\` }}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-[14px] uppercase font-mono tracking-widest text-zinc-100 font-bold">LEGISLATIVE FLOOR</h2>
                        <p className="text-[11px] text-zinc-500 mt-1">Bills, debates, and votes currently before Drennia’s parliament.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-[9px] uppercase font-mono px-3 py-2 rounded-sm border border-amber-500 text-amber-500 bg-amber-500/10">Active Bills</button>
                        <button className="text-[9px] uppercase font-mono px-3 py-2 rounded-sm border border-zinc-700 text-zinc-400 hover:bg-white/5">Resolved</button>
                        <button className="text-[9px] uppercase font-mono px-3 py-2 rounded-sm border border-zinc-700 text-zinc-400 hover:bg-white/5">All Laws</button>
                        <button onClick={() => setActiveGovSubtab('Legislation')} className="text-[9px] uppercase font-bold tracking-widest px-4 py-2 rounded-sm bg-amber-500 text-black hover:bg-amber-400 ml-2">Propose Bill</button>
                      </div>
                    </div>
                    
                    <div className="flex gap-8 mb-8 border-b pb-5" style={{ borderColor: BORDER }}>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Active Bills</div>
                        <div className="text-2xl font-bold text-zinc-200">0</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Voting Open</div>
                        <div className="text-2xl font-bold text-zinc-200">0</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-mono text-zinc-500 mb-1">Passed Laws</div>
                        <div className="text-2xl font-bold text-zinc-200">0</div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                      <div className="text-sm font-bold text-zinc-400 mb-2">No active bills before parliament.</div>
                      <div className="text-[11px] text-zinc-500 mb-6">Draft a bill from the Legislation tab to begin debate.</div>
                      <button onClick={() => setActiveGovSubtab('Legislation')} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors border text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
                        Go to Legislation
                      </button>
                    </div>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="text-[9px] font-mono text-zinc-500">
                        <span className="font-bold text-zinc-400">Note:</span> Independent Individuals automatically vote 30% Yes, 30% No, 40% NOTA on future bills.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

`;
  content = content.replace(parliamentSection, parliamentNew);
} else {
  console.log("Could not find parliament boundaries");
}

fs.writeFileSync(filePath, content);
console.log('Update complete.');
