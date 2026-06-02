const fs = require('fs');

function rewrite() {
  let content = fs.readFileSync('scratch/extract.js', 'utf8');

  // 1. Rewrite deskTab === 'overview'
  content = content.replace(
    /\{deskTab === 'overview' && \([\s\S]*?(?=\{deskTab === 'operations' && \()/m,
    `{deskTab === 'overview' && (
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

      `
  );

  // 2. Rewrite deskTab === 'operations'
  content = content.replace(
    /\{deskTab === 'operations' && \([\s\S]*?(?=\{deskTab === 'fleet' && \()/m,
    `{deskTab === 'operations' && (
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

      `
  );

  // 3. Rewrite deskTab === 'fleet'
  content = content.replace(
    /\{deskTab === 'fleet' && \([\s\S]*?(?=\{deskTab === 'contracts' && \()/m,
    `{deskTab === 'fleet' && (
        <div className="business-content-grid">
          <div>
            <SectionHeader>Fleet Control & Logistics Desk</SectionHeader>
            
            <PanelBox style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>Current Active Fleet</div>
                  <div style={{ fontSize: '11px', color: T.muted }}>Manage vehicles owned by the company.</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px' }}>
                  Total Capacity: <strong style={{ color: T.gold }}>{fleet.reduce((sum, v) => sum + v.capacity, 0)} items</strong>
                </div>
              </div>

              {fleet.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: \`1px dashed \${T.border}\`, color: T.muted, fontSize: '12px' }}>
                  No vehicles in fleet. Purchase vehicles below to start operating contracts.
                </div>
              )}

              {fleet.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fleet.map((v:any, idx:number) => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.panel, border: \`1px solid \${T.border}\`, padding: '12px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: T.ivory }}>{v.type}</div>
                          <div style={{ color: T.faint }}>ID: {v.id.substring(0, 8)} • Capacity: {v.capacity}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ color: v.condition > 80 ? T.mint : v.condition > 50 ? T.gold : T.red }}>Cond: {v.condition}%</span>
                          <span style={{ color: T.muted }}>Maint: {formatMoney(v.monthlyMaintenance)}/mo</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {v.assignedContractId && <span style={{ color: T.mint, border: \`1px solid \${T.mint}\`, padding: '2px 6px', background: 'rgba(54,211,153,0.1)' }}>On Contract</span>}
                        {v.assignedAutoOpPool && <span style={{ color: T.gold, border: \`1px solid \${T.gold}\`, padding: '2px 6px', background: 'rgba(224,185,83,0.1)' }}>{v.assignedAutoOpPool}</span>}
                        {!v.assignedContractId && !v.assignedAutoOpPool && <span style={{ color: T.faint }}>Idle</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelBox>

            <SectionHeader stamp="PROCURE">Vehicle Procurement Market</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {VVEHICLES.map((v, i) => (
                <PanelBox key={i}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: T.ivory, marginBottom: '4px' }}>{v.type}</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', minHeight: '34px' }}>{v.description}</div>
                  
                  <FieldRow label="Capacity" value={v.capacity} />
                  <FieldRow label="Maint /mo" value={formatMoney(v.monthlyMaintenance)} valueColor={T.red} />
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: T.gold }}>{formatMoney(v.purchaseCost)}</div>
                    <GoldButton 
                      onClick={() => handlePurchaseVehicle(v.type, v.capacity, v.purchaseCost, v.monthlyMaintenance)}
                      disabled={company.companyCash < v.purchaseCost}
                    >
                      Buy Asset
                    </GoldButton>
                  </div>
                </PanelBox>
              ))}
            </div>

            <div style={{ marginTop: '40px', borderTop: \`1px solid \${T.border}\`, paddingTop: '24px' }}>
              <SectionHeader stamp="USED MARKET">Player Used Market</SectionHeader>
              <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: \`1px dashed \${T.border}\`, color: T.muted, fontSize: '12px' }}>
                Used vehicle listings from other players will appear here in Beta.
              </div>
            </div>
          </div>
          <div>
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
          </div>
        </div>
      )}

      `
  );

  // 4. Rewrite deskTab === 'contracts'
  content = content.replace(
    /\{deskTab === 'contracts' && \([\s\S]*?(?=\{deskTab === 'contractHistory' && \()/m,
    `{deskTab === 'contracts' && (
        <div className="business-content-grid">
          <div>
            {activeContracts.length > 0 && (
              <PanelBox style={{ marginBottom: '24px', border: \`1px solid \${T.mint}\` }}>
                <SectionHeader stamp="ACTIVE">Current In-Progress Contracts</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeContracts.map((c:any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(54,211,153,0.05)', padding: '12px', border: \`1px solid \${T.mint}40\` }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: T.mint, marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: T.ivory }}>From: {c.issuer}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px' }}>
                        <div style={{ color: T.gold, fontWeight: 700 }}>{formatMoney(c.reward)}</div>
                        <div style={{ color: T.muted }}>Assigned: {c.assignedVehicleType || 'Vehicle'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelBox>
            )}

            <SectionHeader stamp="BOARD">Open Contract Board</SectionHeader>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Search contracts..." 
                value={contractSearch}
                onChange={e => setContractSearch(e.target.value)}
                style={{ flex: 1, padding: '8px', background: T.panel, border: \`1px solid \${T.border}\`, color: T.ivory, fontSize: '12px' }}
              />
              <select 
                value={contractFilter} 
                onChange={e => setContractFilter(e.target.value)}
                style={{ padding: '8px', background: T.panel, border: \`1px solid \${T.border}\`, color: T.ivory, fontSize: '12px' }}
              >
                <option value="all">All Types</option>
                <option value="delivery">Delivery</option>
                <option value="logistics">Logistics</option>
                <option value="freight">Freight</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredContracts.map((c:any) => {
                const canAccept = fleet.some(v => v.capacity >= c.requiredCapacity && !v.assignedContractId && !v.assignedAutoOpPool);
                return (
                  <PanelBox key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '11px', color: T.faint }}>Issuer: <strong style={{ color: T.muted }}>{c.issuer}</strong></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.gold }}>{formatMoney(c.reward)}</div>
                        <div style={{ fontSize: '10px', color: T.red }}>Pen: {formatMoney(c.penalty)}</div>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      {c.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '8px', border: \`1px solid \${T.border}\` }}>
                      <div><span style={{ color: T.faint }}>Type:</span> {c.type}</div>
                      <div><span style={{ color: T.faint }}>Req Cap:</span> {c.requiredCapacity}</div>
                      <div><span style={{ color: T.faint }}>Duration:</span> {c.durationMonths}mo</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select id={\`assign-\${c.id}\`} style={{ flex: 1, padding: '8px', background: T.panel, color: T.ivory, border: \`1px solid \${T.border}\`, fontSize: '12px' }}>
                        <option value="">Select available vehicle...</option>
                        {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                          <option key={v.id} value={v.id} disabled={v.capacity < c.requiredCapacity}>
                            {v.type} (Cap: {v.capacity}) {v.capacity < c.requiredCapacity ? '- Too Small' : ''}
                          </option>
                        ))}
                      </select>
                      <GoldButton 
                        onClick={() => {
                          const sel = document.getElementById(\`assign-\${c.id}\`) as HTMLSelectElement;
                          if (sel && sel.value) handleAcceptContract(c.id, sel.value);
                        }}
                        disabled={!canAccept}
                      >
                        Accept & Dispatch
                      </GoldButton>
                    </div>
                  </PanelBox>
                );
              })}
              {filteredContracts.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: T.faint, fontSize: '12px', border: \`1px dashed \${T.border}\` }}>
                  No contracts found matching your filters.
                </div>
              )}
            </div>
          </div>
          <div>
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
          </div>
        </div>
      )}

      `
  );

  // Also replace `<div style={{ maxWidth: '900px' }}>` with `<div style={{ width: '100%' }}>`
  content = content.replace(/<div style=\{\{ maxWidth: '900px' \}\}>/g, `<div style={{ width: '100%' }}>`);

  fs.writeFileSync('scratch/extract.js', content);
  console.log("Rewrote extract.js successfully.");
}

rewrite();
