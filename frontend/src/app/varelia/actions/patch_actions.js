const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'page.tsx');
let code = fs.readFileSync(pagePath, 'utf8');

// 1. Add activeCycle state to ElectionsView
code = code.replace(
  /const \[completedResult, setCompletedResult\] = useState<ElectionResult \| null>\(null\);/,
  `const [completedResult, setCompletedResult] = useState<ElectionResult | null>(null);\n  const [activeCycle, setActiveCycle] = useState<any>(null);\n  const [showNextElectionConfirm, setShowNextElectionConfirm] = useState(false);`
);

// 2. Update useEffect to initialize active cycle
const oldEffect = `      // Check if election has already been simulated
      const pastRaw = localStorage.getItem(PAST_ELECTIONS_KEY);
      if (pastRaw) {
        const past: ElectionResult[] = JSON.parse(pastRaw);
        
        let regsRaw = localStorage.getItem('worldr_election_registrations');
        let currentReg = null;
        if (regsRaw) {
          const regs = JSON.parse(regsRaw);
          currentReg = regs.find((r: any) => r.partyId === ctx.partyId && r.electionId === 'drennia_parliamentary_y0');
        }

        let done = null;
        if (currentReg && currentReg.electionRunId) {
          done = past.find(r => r.electionRunId === currentReg.electionRunId && r.partyId === ctx.partyId);
        }
        if (!done) {
          const partyPast = past.filter(r => r.partyId === ctx.partyId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (partyPast.length > 0) done = partyPast[0];
        }
        if (!done) {
          const abbPast = past.filter(r => r.parties?.some(p => p.partyAbbreviation === ctx.partyAbbreviation && p.isCurrentParty && !p.dissolved)).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (abbPast.length > 0) done = abbPast[0];
        }

        if (done) { setElectionCompleted(true); setCompletedResult(done); }
      }`;

const newEffect = `      // Manage active election cycle
      let activeCycleRaw = localStorage.getItem('worldr_active_election_cycle');
      let activeCycles: any[] = [];
      if (activeCycleRaw) {
         try { activeCycles = JSON.parse(activeCycleRaw); } catch(e){}
      }
      let myCycle = activeCycles.find(c => c.partyId === ctx.partyId && c.countryName === ctx.countryName);
      
      const pastRaw = localStorage.getItem(PAST_ELECTIONS_KEY);
      let past: ElectionResult[] = [];
      if (pastRaw) {
         try { past = JSON.parse(pastRaw); } catch(e){}
      }
      const partyPast = past.filter(r => r.partyId === ctx.partyId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (!myCycle) {
         if (partyPast.length > 0) {
           const latest = partyPast[0];
           myCycle = {
             countryName: ctx.countryName,
             electionId: 'drennia_parliamentary_y0',
             electionRunId: latest.electionRunId || \`legacy_\${Date.now()}\`,
             electionCycleNumber: latest.electionCycleNumber || partyPast.length,
             partyId: ctx.partyId,
             partyName: ctx.partyName,
             partyAbbreviation: ctx.partyAbbreviation,
             status: 'completed',
             createdAt: latest.createdAt
           };
         } else {
           myCycle = {
             countryName: ctx.countryName,
             electionId: 'drennia_parliamentary_y0',
             electionRunId: \`drennia_parliamentary_y1_\${ctx.partyId}_\${Date.now()}\`,
             electionCycleNumber: 1,
             partyId: ctx.partyId,
             partyName: ctx.partyName,
             partyAbbreviation: ctx.partyAbbreviation,
             status: 'registration_open',
             createdAt: new Date().toISOString()
           };
         }
         activeCycles.push(myCycle);
         localStorage.setItem('worldr_active_election_cycle', JSON.stringify(activeCycles));
      }
      setActiveCycle(myCycle);

      if (myCycle.status === 'completed') {
         const done = past.find(r => r.electionRunId === myCycle.electionRunId);
         if (done) {
           setElectionCompleted(true);
           setCompletedResult(done);
         }
      }`;

code = code.replace(oldEffect, newEffect);

// 3. handleNextElection implementation
const insertHandleNextElectionAfter = `  const handleAllocateFunds = (amount: number) => {`;
const handleNextElectionCode = `  const handleNextElection = () => {
    const nextCycleNumber = (activeCycle?.electionCycleNumber || 1) + 1;
    const nextElectionRunId = \`drennia_parliamentary_y\${nextCycleNumber}_\${ctx.partyId}_\${Date.now()}\`;
    
    const newCycle = {
       countryName: ctx.countryName,
       electionId: 'drennia_parliamentary_y0',
       electionRunId: nextElectionRunId,
       electionCycleNumber: nextCycleNumber,
       partyId: ctx.partyId,
       partyName: ctx.partyName,
       partyAbbreviation: ctx.partyAbbreviation,
       status: 'registration_open',
       createdAt: new Date().toISOString()
    };
    
    let activeCycles: any[] = [];
    try { const r = localStorage.getItem('worldr_active_election_cycle'); if (r) activeCycles = JSON.parse(r); } catch(e) {}
    
    const cycleIdx = activeCycles.findIndex((c: any) => c.partyId === ctx.partyId && c.countryName === ctx.countryName);
    if (cycleIdx >= 0) activeCycles[cycleIdx] = newCycle;
    else activeCycles.push(newCycle);
    
    localStorage.setItem('worldr_active_election_cycle', JSON.stringify(activeCycles));
    
    try {
      let regs: any[] = [];
      const rReg = localStorage.getItem('worldr_election_registrations');
      if (rReg) regs = JSON.parse(rReg);
      regs = regs.filter((r: any) => !(r.partyId === ctx.partyId && r.electionId === 'drennia_parliamentary_y0'));
      localStorage.setItem('worldr_election_registrations', JSON.stringify(regs));
      setRegistrations(regs);
      
      let camps: any[] = [];
      const rCamp = localStorage.getItem('worldr_election_campaigns');
      if (rCamp) camps = JSON.parse(rCamp);
      camps = camps.filter((c: any) => !(c.partyId === ctx.partyId && c.electionId === 'drennia_parliamentary_y0'));
      localStorage.setItem('worldr_election_campaigns', JSON.stringify(camps));
      setCampaign(null);
      
      let surveys: any[] = [];
      const rSur = localStorage.getItem('worldr_election_surveys');
      if (rSur) surveys = JSON.parse(rSur);
      surveys = surveys.filter((s: any) => !(s.partyId === ctx.partyId && s.electionId === 'drennia_parliamentary_y0'));
      localStorage.setItem('worldr_election_surveys', JSON.stringify(surveys));
      setLatestSurvey(null);
    } catch(e) {}
    
    setActiveCycle(newCycle);
    setElectionCompleted(false);
    setCompletedResult(null);
    setShowNextElectionConfirm(false);
  };

`;
code = code.replace(insertHandleNextElectionAfter, handleNextElectionCode + insertHandleNextElectionAfter);

// 4. Update executeRegistration to update activeCycle
const executeRegistrationTarget = `    const newReg = { registrationId: Math.random().toString(36).slice(2, 9), electionId: election.electionId, electionRunId, electionName: election.electionName, partyId: ctx.partyId, partyName: ctx.partyName, partyAbbreviation: ctx.partyAbbreviation, countryName: election.countryName, continentName: election.continentName, electionType: election.electionType, registrationFeePaid: election.registrationFee, recognitionAtRegistration: recognition, fundsAfterRegistration: updatedFunds, registeredAt: now, status: 'Registered' };`;
const executeRegistrationReplacement = `    const actualRunId = activeCycle ? activeCycle.electionRunId : electionRunId;
    const newReg = { registrationId: Math.random().toString(36).slice(2, 9), electionId: election.electionId, electionRunId: actualRunId, electionName: election.electionName, partyId: ctx.partyId, partyName: ctx.partyName, partyAbbreviation: ctx.partyAbbreviation, countryName: election.countryName, continentName: election.continentName, electionType: election.electionType, registrationFeePaid: election.registrationFee, recognitionAtRegistration: recognition, fundsAfterRegistration: updatedFunds, registeredAt: now, status: 'Registered' };
    
    let activeCycles: any[] = [];
    try { const r = localStorage.getItem('worldr_active_election_cycle'); if (r) activeCycles = JSON.parse(r); } catch(e) {}
    const cycleIdx = activeCycles.findIndex((c: any) => c.partyId === ctx.partyId && c.countryName === ctx.countryName);
    if (cycleIdx >= 0) {
       activeCycles[cycleIdx].status = 'registered';
       localStorage.setItem('worldr_active_election_cycle', JSON.stringify(activeCycles));
       setActiveCycle(activeCycles[cycleIdx]);
    }`;
code = code.replace(executeRegistrationTarget, executeRegistrationReplacement);

// 5. Update simulateElectionDay to update activeCycle and add cycle params
const simulateResultTarget = `    const resultId = \`result_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`;
    const result: ElectionResult = {
      resultId,
      electionId: election.electionId,
      electionRunId,
      partyId: ctx.partyId,`;
const simulateResultReplacement = `    const actualRunId = activeCycle ? activeCycle.electionRunId : electionRunId;
    const actualCycleNumber = activeCycle ? activeCycle.electionCycleNumber : 1;
    const resultId = \`result_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`;
    const result: ElectionResult = {
      resultId,
      electionId: election.electionId,
      electionRunId: actualRunId,
      electionCycleNumber: actualCycleNumber,
      partyId: ctx.partyId,`;
code = code.replace(simulateResultTarget, simulateResultReplacement);

const simulateCompletionTarget = `      logs.unshift({ id: Math.random().toString(36).slice(2, 9), partyId: ctx.partyId, countryName: ctx.countryName, continentName: ctx.continentName, actionName: title, roleName: 'Election', officialName: ctx.characterName, investment: 0, finalScore: seats >= 1 ? 8 : 2, resultQuality: seats >= 1 ? 'Success' : 'Weak', summary: body, category: 'Politics', createdAt: new Date().toISOString() });
      localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    } catch (e) {}`;
const simulateCompletionReplacement = `      logs.unshift({ id: Math.random().toString(36).slice(2, 9), partyId: ctx.partyId, countryName: ctx.countryName, continentName: ctx.continentName, actionName: title, roleName: 'Election', officialName: ctx.characterName, investment: 0, finalScore: seats >= 1 ? 8 : 2, resultQuality: seats >= 1 ? 'Success' : 'Weak', summary: body, category: 'Politics', createdAt: new Date().toISOString() });
      localStorage.setItem('worldr_activity_log', JSON.stringify(logs));
    } catch (e) {}
    
    let activeCycles: any[] = [];
    try { const r = localStorage.getItem('worldr_active_election_cycle'); if (r) activeCycles = JSON.parse(r); } catch(e) {}
    const cycleIdx = activeCycles.findIndex((c: any) => c.partyId === ctx.partyId && c.countryName === ctx.countryName);
    if (cycleIdx >= 0) {
       activeCycles[cycleIdx].status = 'completed';
       activeCycles[cycleIdx].completedAt = new Date().toISOString();
       localStorage.setItem('worldr_active_election_cycle', JSON.stringify(activeCycles));
       setActiveCycle(activeCycles[cycleIdx]);
    }`;
code = code.replace(simulateCompletionTarget, simulateCompletionReplacement);

// 6. Add Next Election Button in the View
const nextElectionButtonTarget = `            <button type="button" onClick={() => onNavigatePastElections && onNavigatePastElections()}
              className="w-full py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{ background: 'rgba(16,120,60,0.14)', border: '1px solid rgba(16,120,60,0.4)', color: '#34d399', borderRadius: '2px' }}>
              View Full Election Results →
            </button>
          </div>`;
const nextElectionButtonReplacement = `            <button type="button" onClick={() => onNavigatePastElections && onNavigatePastElections()}
              className="w-full py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{ background: 'rgba(16,120,60,0.14)', border: '1px solid rgba(16,120,60,0.4)', color: '#34d399', borderRadius: '2px' }}>
              View Full Election Results →
            </button>
            <div className="mt-4 pt-4 flex flex-col items-center" style={{ borderTop: '1px solid rgba(16,120,60,0.3)' }}>
               <button type="button" onClick={() => setShowNextElectionConfirm(true)}
                 className="w-full py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
                 style={{ background: 'rgba(212,169,31,0.1)', border: '1px solid rgba(212,169,31,0.3)', color: '#d4a91f', borderRadius: '2px' }}>
                 Start Next Election
               </button>
               <p className="text-[9px] text-emerald-600 mt-2 text-center leading-relaxed">Starts a fresh election cycle for testing. Historical results remain in Past Elections.</p>
            </div>
          </div>`;
code = code.replace(nextElectionButtonTarget, nextElectionButtonReplacement);

// 7. Add the Confirmation Modal
const modalTarget = `      {/* Fund Allocation Modal */}`;
const modalReplacement = `      {/* Next Election Modal */}
      {showNextElectionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNextElectionConfirm(false); }}>
          <div className="w-full max-w-sm overflow-hidden"
            style={{ background: '#1b1f1a', border: \`1px solid #2d3329\`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', borderRadius: '2px' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: \`1px solid #2d3329\` }}>
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(212,169,31,0.12)', border: '1px solid rgba(212,169,31,0.25)' }}>
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm text-zinc-100">Start Next Election?</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.18em] mt-0.5 text-zinc-500">Requires Confirmation</div>
              </div>
            </div>
            <div className="px-5 py-6">
              <p className="text-[11px] leading-relaxed text-zinc-400">
                This will open a fresh election cycle for the current party. Past election results will remain saved, but the current Elections tab will reset for the new cycle.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button type="button" onClick={() => setShowNextElectionConfirm(false)}
                className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa', borderRadius: '2px' }}>
                Cancel
              </button>
              <button type="button" onClick={handleNextElection}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-opacity duration-150 hover:opacity-75"
                style={{ background: 'rgba(212,169,31,0.14)', border: '1px solid rgba(212,169,31,0.40)', color: '#d4a91f', borderRadius: '2px' }}>
                Start Next Election
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fund Allocation Modal */}`;
code = code.replace(modalTarget, modalReplacement);

fs.writeFileSync(pagePath, code, 'utf8');
console.log('actions/page.tsx patched.');
