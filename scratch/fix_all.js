const fs = require('fs');

function applyFixes() {
  let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');
  code = code.replace(/\\r\\n/g, '\\n'); // Normalize line endings
  
  let successes = [];
  let failures = [];

  function safeReplace(name, regex, replacement) {
    if (regex.test(code)) {
      code = code.replace(regex, replacement);
      successes.push(name);
    } else {
      failures.push(name);
    }
  }

  // 1. Global Back to Chronicle button
  safeReplace('Global Back Button',
    /<div style=\{\{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T\.bg, color: T\.ivory, overflow: 'hidden' \}\}>/, 
    `<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* ── Global Back to Chronicle ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <span style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => router.push('/drennia/chronicle')}>
          ← Back to Chronicle
        </span>
      </div>`
  );

  // 2. Wrap BusinessPage main scroll area in business-page-inner
  safeReplace('BusinessPage Inner Wrapper',
    /<div style=\{\{ flex: 1, overflowY: 'auto', padding: '24px' \}\}>/, 
`<div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="business-page-inner">`
  );

  // Close the extra div at the end of BusinessPage
  safeReplace('BusinessPage Extra Closing Div',
    /(\s*)(<\/div>\s*<\/div>\s*\)\;\s*\}\s*\/\/ ───\s*\/\/ OVERVIEW TAB)/, 
`$1  </div>
      </div>
    </div>
  );
}

// ───
// OVERVIEW TAB`
  );

  // 3. Remove "Back to Business Overview"
  safeReplace('Remove Back to Business Overview',
    /\{activeTab === 'start' && \([\s\S]*?← Back to Business Overview[\s\S]*?<\/span>\s*\)\}/, 
    ''
  );

  // 4. Start Business Layout
  safeReplace('StartBusiness Grid Wrapper',
    /(function StartBusinessTab[\s\S]*?return \(\n\s*)(<div style=\{\{ maxWidth: '620px' \}\}>)/, 
    `$1<div className="business-content-grid">\n      $2`
  );
  
  safeReplace('StartBusiness Right Rail',
    /(Step 7 — Confirm[\s\S]*?Next: Confirm Filing →[\s\S]*?<\/div>\s*\}?)\s*<\/div>\s*\)\;\s*\}/,
`$1
  {/* Right Rail: Filing Summary */}
  <div>
    <PanelBox style={{ position: 'sticky', top: '24px' }}>
      <SectionHeader stamp="SUMMARY">Filing Application</SectionHeader>
      <FieldRow label="Name" value={companyNameInput || 'Pending'} />
      <FieldRow label="Sector" value={selectedSector || 'Pending'} />
      <FieldRow label="HQ State" value={selectedHQ || 'Pending'} />
      <FieldRow label="Structure" value="Sole Trader" />
      <FieldRow label="Operating Model" value={selectedModel || 'Pending'} valueColor={T.gold} />
      <div style={{ margin: '16px 0', borderTop: \`1px solid \${T.border}\` }} />
      <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor={T.mint} />
      <FieldRow label="Filing Fee" value={formatMoney(5000)} valueColor={T.red} />
      <div style={{ marginTop: '12px', padding: '10px 0', borderTop: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Total Cost</span>
        <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(chosenCapital + 5000)}</span>
      </div>
      <FieldRow label="Remaining Cash" value={formatMoney(playerCash - (chosenCapital + 5000))} valueColor={playerCash >= (chosenCapital + 5000) ? T.mint : T.red} />
    </PanelBox>
  </div>
</div>
  );
}`
  );

  // 5. Overview Tab (Global)
  safeReplace('OverviewTab Layout',
    /return \(\s*<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '860px' \}\}>/g,
    `return (\n    <div className="business-content-grid">\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>`
  );
  
  safeReplace('OverviewTab Right Rail',
    /(<FieldRow label="Net Worth \(total\)"[\s\S]*?<\/PanelBox>\s*)(<\/div>\s*\);)/,
`$1</div>
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Operations Summary</SectionHeader>
          <FieldRow label="Total Fleet" value={company.facilities?.length ? "See Fleet" : "0"} />
          <FieldRow label="Active Auto Ops" value="0" />
        </PanelBox>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Contract Pipeline</SectionHeader>
          <FieldRow label="Active" value={company.activeContracts?.length || 0} valueColor={T.gold} />
        </PanelBox>
        <PanelBox>
          <SectionHeader stamp="ACTIONS">Next Actions</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GhostButton onClick={() => onViewContracts()}>Manage Company</GhostButton>
            <GhostButton onClick={() => onViewContracts()}>View Contract Board</GhostButton>
            <GhostButton onClick={() => onViewRegistry()}>View Registry</GhostButton>
          </div>
        </PanelBox>
      </div>
    </div>
  );`
  );

  // 6. My Companies List View
  safeReplace('My Companies Layout Start',
    /(<div style=\{\{ maxWidth: '860px' \}\}>)/, 
    '<div className="business-content-grid">\n            <div>'
  );
  
  safeReplace('My Companies Right Rail',
    /(“Multiple company ownership, subsidiaries, holding companies, and cross-sector business groups will unlock later. Pre-alpha currently supports one active company.”\s*<\/p>\s*<\/div>\s*<\/div>\s*)(<\/div>\s*\}\))/g,
`$1</div>
            <div>
              <PanelBox style={{ marginBottom: '16px' }}>
                <SectionHeader stamp="PORTFOLIO">Ownership Summary</SectionHeader>
                <FieldRow label="Companies Owned" value="1 / 1" />
                <FieldRow label="Total Company Value" value={formatMoney(calcCompanyValue(company))} valueColor={T.gold} />
                <FieldRow label="Total Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              </PanelBox>
              <PanelBox style={{ marginBottom: '16px', borderLeft: \`2px dashed \${T.faint}\`, opacity: 0.8 }}>
                <SectionHeader>Expansion Locked</SectionHeader>
                <p style={{ fontSize: '11px', color: T.muted }}>Multiple companies, subsidiaries, and holding structures coming soon.</p>
              </PanelBox>
              <PanelBox>
                <SectionHeader stamp="ACTIONS">Quick Actions</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <GoldButton onClick={() => setSelectedCompanyId(company.id)}>Manage Active Company</GoldButton>
                  <GhostButton onClick={() => setActiveTab('registry')}>Open Registry</GhostButton>
                </div>
              </PanelBox>
            </div>
          </div>
        )}`
  );

  // Extracted CompanyDeskTab
  let deskRegex = /(function CompanyDeskTab[\s\S]*?\n\}\n\n)/;
  let deskMatch = deskRegex.exec(code);

  if (deskMatch) {
    let desk = deskMatch[1];
    let dSuccess = [];
    let dFail = [];
    
    function safeDesk(name, r, repl) {
      if (r.test(desk)) { desk = desk.replace(r, repl); dSuccess.push(name); }
      else dFail.push(name);
    }

    // 7. Selected Company Overview
    let regexOverview = /\{deskTab === 'overview' && \(\s*<div>\s*<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr'[\s\S]*?\{deskTab === 'operations' && \(/;
    let newOverview = `{deskTab === 'overview' && (
        <div className="business-content-grid">
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <PanelBox>
                <SectionHeader stamp="COMPANY FILE">Company Details</SectionHeader>
                <FieldRow label="Name" value={company.name} />
                <FieldRow label={company.legalStructure === 'Corporation' ? "Chairperson & CEO" : "Founder & CEO"} value={company.ownerName} />
                <FieldRow label="Sector" value={company.sector} />
                <FieldRow label="HQ" value={company.state} />
                <FieldRow label="Status" value={company.status} valueColor={T.mint} />
                <FieldRow label="Reputation" value={company.reputation} valueColor={T.gold} />
                <FieldRow label="Reliability" value={company.reliability} />
              </PanelBox>
              <PanelBox>
                <SectionHeader stamp="LEDGER">Financials</SectionHeader>
                <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
                <FieldRow label="Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
                <FieldRow label="Fleet Assets" value={formatMoney(companyValue - company.companyCash + company.debt)} valueColor={T.steel} />
                <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.gold} />
                <FieldRow label="Net Worth" value={formatMoney(netWorth)} valueColor={T.gold} />
              </PanelBox>
            </div>
            <PanelBox style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(54,211,153,0.03)', border: \`1px solid \${T.mint}40\` }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: \`6px solid \${T.mint}\`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 20px rgba(54,211,153,0.1)' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: T.ivory }}>100%</span>
                <span style={{ fontSize: '10px', color: T.mint, fontFamily: 'monospace', textTransform: 'uppercase' }}>Owned</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>Founder Holding</div>
                <div style={{ fontSize: '11px', color: T.muted }}>1,000 / 1,000 ownership units</div>
              </div>
            </PanelBox>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Operations Summary</SectionHeader>
              <FieldRow label="Total Fleet" value={fleet.length} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Auto Ops Pools Active" value={new Set(fleet.filter(v => v.assignedAutoOpPool).map(v => v.assignedAutoOpPool)).size} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Completed" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Failed" value={contractHistory.filter(h => h.result === 'failed').length} valueColor={T.red} />
            </PanelBox>
            <PanelBox>
              <SectionHeader stamp="RECORDS">Recent Records</SectionHeader>
              {records.filter((r:any) => r.companyId === company.id).slice(0, 3).map((r:any, i:number) => (
                <div key={i} style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', paddingBottom: '8px', borderBottom: i < 2 ? \`1px solid \${T.border}\` : 'none' }}>
                  {r.text || r.msg}
                </div>
              ))}
              {records.filter((r:any) => r.companyId === company.id).length === 0 && (
                <div style={{ fontSize: '11px', color: T.faint }}>No recent records.</div>
              )}
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'operations' && (`;
    safeDesk('CompanyDeskTab Overview', regexOverview, newOverview);

    // 8. Operations
    let regexOperations = /\{deskTab === 'operations' && \(\s*<div>\s*<SectionHeader>Operations Desk<\/SectionHeader>[\s\S]*?\{deskTab === 'fleet' && \(/;
    let newOperations = `{deskTab === 'operations' && (
        <div className="business-content-grid">
          <div>
            <SectionHeader>Operations Desk</SectionHeader>
            <PanelBox style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Monthly Dispatch Console</div>
                <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.5, margin: '0 0 16px' }}>
                  Run monthly auto operations to dispatch your active fleet, process contract completions, collect recurring revenue, pay facility leases, and deduct fleet maintenance costs.
                </p>
              </div>
              <GoldButton onClick={handleRunAutoOps} disabled={fleet.length === 0}>
                ⚡ Dispatch & Process Operations
              </GoldButton>
            </PanelBox>

            <SectionHeader stamp="FACILITIES">Facility Support & Asset Yield Boosts</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {(() => {
                const hasWestport = (company.facilities || []).some(f => f.state === 'Westport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const hasDrennport = (company.facilities || []).some(f => f.state === 'Drennport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const branchCount = (company.facilities || []).filter(f => f.type === 'Regional Branch Office').length;
                return (
                  <>
                    <PanelBox style={{ background: hasWestport ? 'rgba(54,211,153,0.02)' : T.panel, border: \`1px solid \${hasWestport ? T.mint : T.border}\` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasWestport ? T.mint : T.ivory }}>Westport Depot</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hasWestport ? T.mint : T.faint, border: \`1px solid \${hasWestport ? T.mint : T.border}\`, padding: '1px 5px' }}>{hasWestport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasWestport ? '✓ Port Shuttle yield increased by 35% across Westport routes.' : 'Lease Westport Depot/Warehouse to boost Port Shuttle yield by 35%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: hasDrennport ? 'rgba(54,211,153,0.02)' : T.panel, border: \`1px solid \${hasDrennport ? T.mint : T.border}\` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasDrennport ? T.mint : T.ivory }}>Drennport Depot</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hasDrennport ? T.mint : T.faint, border: \`1px solid \${hasDrennport ? T.mint : T.border}\`, padding: '1px 5px' }}>{hasDrennport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasDrennport ? '✓ Courier yield increased by 25% across Drennport routes.' : 'Lease Drennport Depot/Warehouse to boost Local Courier yield by 25%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: branchCount > 0 ? 'rgba(54,211,153,0.02)' : T.panel, border: \`1px solid \${branchCount > 0 ? T.mint : T.border}\`, gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: branchCount > 0 ? T.mint : T.ivory }}>Branch Network</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: branchCount > 0 ? T.mint : T.faint, border: \`1px solid \${branchCount > 0 ? T.mint : T.border}\`, padding: '1px 5px' }}>{branchCount > 0 ? \`\${branchCount} Active\` : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {branchCount > 0 ? \`✓ Unlocks multi-state operations and lowers interstate route dispatch cost.\` : 'Lease Regional Branch Offices to establish multi-state presence.'}
                      </div>
                    </PanelBox>
                  </>
                );
              })()}
            </div>

            <SectionHeader stamp="RECURRING">Auto Operations Pools</SectionHeader>
            <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Assign idle vehicles to recurring local pools. This generates steady monthly income but wears down vehicle condition.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
              {['Local Delivery Pool', 'Port Shuttle Pool'].map(pool => {
                const marketDemand = pool === 'Port Shuttle Pool' ? 'High' : 'Moderate';
                const marketComp = pool === 'Port Shuttle Pool' ? 'Moderate' : 'High';
                const hasWestport = (company.facilities || []).some(f => f.state === 'Westport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const hasDrennport = (company.facilities || []).some(f => f.state === 'Drennport State' && (f.type === 'Small Depot' || f.type === 'Warehouse'));
                const isBoosted = (pool === 'Port Shuttle Pool' && hasWestport) || (pool === 'Local Delivery Pool' && hasDrennport);
                const boostPct = pool === 'Port Shuttle Pool' ? '+35%' : '+25%';
                return (
                <PanelBox key={pool}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{pool}</div>
                    {isBoosted && (
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.mint, background: 'rgba(54,211,153,0.1)', border: \`1px solid \${T.mint}\`, padding: '1px 6px' }}>
                        ⚡ Boosted {boostPct}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                    {pool === 'Local Delivery Pool' ? 'High volume local courier work around Drennport. Steady demand, high competition.' : 'Container and crate movement around Westport docks. High demand.'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontFamily: 'monospace', color: T.faint, marginBottom: '12px' }}>
                    <span>Demand: <span style={{ color: marketDemand === 'High' ? T.mint : T.gold }}>{marketDemand}</span></span>
                    <span>Competition: <span style={{ color: marketComp === 'High' ? T.red : T.gold }}>{marketComp}</span></span>
                  </div>
                  
                  {fleet.filter(v => v.assignedAutoOpPool === pool).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', fontSize: '11px' }}>
                      <span>{v.type} ({v.condition}%)</span>
                      <GhostButton onClick={() => handleAssignAutoOp(v.id, null)} color={T.red}>Remove</GhostButton>
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <select id={\`pool-sel-\${pool.replace(/\\s+/g, '')}\`} style={{ padding: '6px', background: T.panel, color: T.ivory, border: \`1px solid \${T.border}\`, fontSize: '11px', flex: 1 }}>
                      <option value="">Select available vehicle...</option>
                      {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                        <option key={v.id} value={v.id}>{v.type} ({v.condition}%)</option>
                      ))}
                    </select>
                    <GhostButton onClick={() => {
                      const sel = document.getElementById(\`pool-sel-\${pool.replace(/\\s+/g, '')}\`) as HTMLSelectElement;
                      if (sel && sel.value) handleAssignAutoOp(sel.value, pool as any);
                    }}>Assign</GhostButton>
                  </div>
                </PanelBox>
              )})}
            </div>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Utilization</SectionHeader>
              <FieldRow label="Total Vehicles" value={fleet.length} />
              <FieldRow label="Assigned to Auto Ops" value={fleet.filter(v => v.assignedAutoOpPool).length} valueColor={T.gold} />
              <FieldRow label="Assigned to Contracts" value={fleet.filter(v => v.assignedContractId).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Monthly Estimate</SectionHeader>
              <FieldRow label="Est. Auto Revenue" value="Varies" valueColor={T.mint} />
              <FieldRow label="Operating Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <div style={{ marginTop: '12px', padding: '10px 0', borderTop: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Projected Net</span>
                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.muted }}>?</span>
              </div>
            </PanelBox>
            {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 && (
              <PanelBox style={{ marginBottom: '16px', background: 'rgba(184,85,85,0.05)', border: \`1px solid \${T.red}\` }}>
                <SectionHeader>Idle Fleet Warning</SectionHeader>
                <div style={{ fontSize: '11px', color: T.red }}>You have idle vehicles. They cost maintenance without generating revenue.</div>
              </PanelBox>
            )}
            <PanelBox>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active Contracts" value={activeContracts.length} />
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'fleet' && (`;
    safeDesk('CompanyDeskTab Operations', regexOperations, newOperations);

    // 9. Fleet
    let regexFleet = /\{deskTab === 'fleet' && \(\s*<div>\s*<SectionHeader>Fleet Control & Logistics Desk<\/SectionHeader>[\s\S]*?\{deskTab === 'contracts' && \(/;
    let newFleetMatch = regexFleet.exec(desk);
    if (newFleetMatch) {
      let fleetContent = newFleetMatch[0];
      fleetContent = fleetContent.replace(/\{deskTab === 'fleet' && \(\s*<div>/, '{deskTab === \'fleet\' && (\n        <div className="business-content-grid">\n          <div>');
      fleetContent = fleetContent.replace(/(<div style=\{\{ marginTop: '40px', borderTop: \`1px solid \$\{T\.border\}\`, paddingTop: '24px' \}\}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\})/, 
        `$1\n          </div>\n          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Summary</SectionHeader>
              <FieldRow label="Vehicles Owned" value={fleet.length} />
              <FieldRow label="Total Capacity" value={fleet.reduce((s, v) => s + v.capacity, 0)} />
              <FieldRow label="Available Capacity" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).reduce((s, v) => s + v.capacity, 0)} valueColor={T.mint} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Maintenance Burden</SectionHeader>
              <FieldRow label="Monthly Fleet Maintenance" value={formatMoney(fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <FieldRow label="Vehicles < 60% Cond" value={fleet.filter(v => v.condition < 60).length} valueColor={fleet.filter(v => v.condition < 60).length > 0 ? T.red : T.muted} />
            </PanelBox>
            <PanelBox>
              <SectionHeader>Fleet Orders / Procurement</SectionHeader>
              <FieldRow label="Player Listings" value="Locked" valueColor={T.faint} />
              <FieldRow label="NPC Stock" value="Available" valueColor={T.mint} />
            </PanelBox>
          </div>\n        </div>\n      )}`);
      desk = desk.replace(regexFleet, fleetContent);
      dSuccess.push('CompanyDeskTab Fleet');
    } else {
      dFail.push('CompanyDeskTab Fleet (No Match)');
    }

    // 10. Contracts
    let regexContracts = /\{deskTab === 'contracts' && \(\s*<div>\s*(?:\{activeContracts\.length > 0 && \()?/;
    if (regexContracts.test(desk)) {
      desk = desk.replace(regexContracts, `{deskTab === 'contracts' && (\n        <div className="business-content-grid">\n          <div>\n            {activeContracts.length > 0 && (`);

      let regexContractsEnd = /(<\/div>\s*\)\;\s*\}\)}\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*)(?=\{deskTab === 'contractHistory')/;
      if (regexContractsEnd.test(desk)) {
        desk = desk.replace(regexContractsEnd, `$1\n          </div>\n          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Eligibility Summary</SectionHeader>
              <FieldRow label="Available Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} />
              <FieldRow label="Total Capacity" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).reduce((s, v) => s + v.capacity, 0)} />
              <FieldRow label="Highest Avail Capacity" value={Math.max(0, ...fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => v.capacity))} />
              <FieldRow label="Company Reliability" value={company.reliability} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active" value={activeContracts.length} valueColor={T.gold} />
              <FieldRow label="Completed" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Failed" value={contractHistory.filter(h => h.result === 'failed').length} valueColor={T.red} />
            </PanelBox>
            <PanelBox>
              <SectionHeader>Suggested Contracts</SectionHeader>
              <div style={{ fontSize: '11px', color: T.faint }}>
                {filteredContracts.filter(c => fleet.some(v => v.capacity >= c.requiredCapacity)).length} contracts match your current fleet capacity.
              </div>
            </PanelBox>
          </div>\n        </div>\n      `);
        dSuccess.push('CompanyDeskTab Contracts');
      } else {
        dFail.push('CompanyDeskTab Contracts End');
      }
    } else {
      dFail.push('CompanyDeskTab Contracts Start');
    }

    // Remove maxWidth: '900px' from desk return root
    safeDesk('CompanyDeskTab maxWidth Fix',
      /return \(\s*<div style=\{\{ maxWidth: '900px' \}\}>/, 
      `return (\n    <div style={{ width: '100%' }}>`
    );

    code = code.replace(deskRegex, desk);
    console.log('CompanyDeskTab Successes:', dSuccess);
    console.log('CompanyDeskTab Failures:', dFail);
    successes.push('CompanyDeskTab');
  } else {
    failures.push('CompanyDeskTab');
  }

  // 11. FinanceTab
  safeReplace('FinanceTab Layout Start',
    /function FinanceTab\(\{ company, fleet, playerCash, netWorth \}: \{ company: Company; fleet: Vehicle\[\]; playerCash: number; netWorth: number \}\) \{\s*const companyValue = calcCompanyValue\(company\);\s*return \(\s*<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '760px' \}\}>/,
  `function FinanceTab({ company, fleet, playerCash, netWorth }: { company: Company; fleet: Vehicle[]; playerCash: number; netWorth: number }) {
  const companyValue = calcCompanyValue(company);
  return (
    <div className="business-content-grid">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>`
  );

  safeReplace('FinanceTab Right Rail',
    /(<span style=\{\{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold \}\}>\{formatMoney\(netWorth\)\}<\/span>\s*<\/div>\s*<\/PanelBox>\s*)(<\/div>\s*\)\;\s*\})/,
`$1</div>
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Cost Breakdown</SectionHeader>
          <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((s, v) => s + v.monthlyMaintenance, 0))} valueColor={T.red} />
          <FieldRow label="Facility Lease" value={formatMoney((company.facilities || []).reduce((s, f) => s + f.leaseCost, 0))} valueColor={T.red} />
          <FieldRow label="Operating Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
        </PanelBox>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Value Breakdown</SectionHeader>
          <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
          <FieldRow label="Vehicle Asset Value" value={formatMoney(fleet.reduce((s,v) => s + Math.round(v.purchaseCost * (v.condition / 100)), 0))} valueColor={T.steel} />
          <FieldRow label="Reliability Bonus" value="Included" />
        </PanelBox>
        <PanelBox style={{ background: company.companyCash < 20000 ? 'rgba(184,85,85,0.05)' : T.panel, border: \`1px solid \${company.companyCash < 20000 ? T.red : T.border}\` }}>
          <SectionHeader>Warnings</SectionHeader>
          {company.companyCash < 20000 && <div style={{ fontSize: '11px', color: T.red, marginBottom: '4px' }}>⚠ Low company cash.</div>}
          {fleet.reduce((s, v) => s + v.monthlyMaintenance, 0) > 30000 && <div style={{ fontSize: '11px', color: T.red, marginBottom: '4px' }}>⚠ High maintenance burden.</div>}
          {company.companyCash >= 20000 && fleet.reduce((s, v) => s + v.monthlyMaintenance, 0) <= 30000 && <div style={{ fontSize: '11px', color: T.faint }}>No immediate warnings.</div>}
        </PanelBox>
      </div>
    </div>
  );
}`
  );

  // 12. AssetsTab
  let assetsStart = /function AssetsTab\(\{ company, fleet, onRefresh, showNotif \}: \{ company: Company; fleet: Vehicle\[\]; onRefresh: \(\) => void; showNotif: \(m: string, s: boolean\) => void \}\) \{\s*return \(\s*<div style=\{\{ maxWidth: '860px' \}\}>/;
  if (assetsStart.test(code)) {
    code = code.replace(assetsStart, `function AssetsTab({ company, fleet, onRefresh, showNotif }: { company: Company; fleet: Vehicle[]; onRefresh: () => void; showNotif: (m: string, s: boolean) => void }) {
  return (
    <div className="business-content-grid">
      <div>`);
    
    // Replace the end of AssetsTab reliably.
    let parts = code.split('function FinanceTab');
    if (parts.length > 1) {
      let beforeFinance = parts[0];
      let endIdx = beforeFinance.lastIndexOf('</div>\n  );\n}');
      if (endIdx !== -1) {
        let rail = `</div>
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Facility Benefits</SectionHeader>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>• <strong>Depot:</strong> Unlocks auto-ops and local yield boosts.</div>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>• <strong>Branch Office:</strong> Reduces interstate dispatch penalty.</div>
        </PanelBox>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Current Lease Burden</SectionHeader>
          <FieldRow label="Monthly Lease Expense" value={formatMoney((company.facilities || []).reduce((s, f) => s + f.leaseCost, 0))} valueColor={T.red} />
        </PanelBox>
        <PanelBox>
          <SectionHeader>Expansion Readiness</SectionHeader>
          <FieldRow label="States with Presence" value={new Set((company.facilities || []).map(f => f.state)).size} />
        </PanelBox>
      </div>
    </div>
  );
}`;
        beforeFinance = beforeFinance.substring(0, endIdx) + rail + beforeFinance.substring(endIdx + 15);
        code = beforeFinance + 'function FinanceTab' + parts[1];
        successes.push('AssetsTab');
      } else {
        failures.push('AssetsTab End');
      }
    } else {
      failures.push('AssetsTab Finance Split');
    }
  } else {
    failures.push('AssetsTab Start');
  }

  console.log('--- RESULTS ---');
  console.log('Successes:', successes);
  console.log('Failures:', failures);

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
}

applyFixes();
