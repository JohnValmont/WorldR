function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onRefresh }: {
  company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string;
  onRefresh: () => void;
}) {
  const [deskTab, setDeskTab] = useState<CompanyDeskTab>('overview');
  const [fleetSubTab, setFleetSubTab] = useState<'current' | 'procurement' | 'market' | 'locked'>('current');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [contractFilter, setContractFilter] = useState<string>('All');

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'routes',     label: 'Routes'     },
    { id: 'assets',     label: 'Assets'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];

  const companyValue = calcCompanyValue(company);
  const netWorth = calcNetWorth(playerCash, company);
  const activeContracts = contracts.filter(c => (c.status === 'awarded' || c.status === 'active') && c.awardedToCompanyId === company.id);
  const completedContracts = contracts.filter(c => c.status === 'completed');
  const contractHistory = getContractHistory(company.id);
  const records = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
  const routes = getRouteFamiliarity(company.id);

  const handleBuyVehicle = (type: VehicleType) => {
    const result = purchaseVehicle(company.id, type);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleMaintenance = (vehicleId: string, level: 'basic' | 'full') => {
    const result = performMaintenance(vehicleId, level);
    showNotif(result.message, result.success);
    if (result.success) {
      // Record added inside core now or we add here if missing
      onRefresh();
    }
  };

  const handleAssignVehicle = (contractId: string, vehicleId: string) => {
    const result = assignVehicleToContract(contractId, vehicleId);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };
  
  const handleDirectAccept = (contractId: string, vehicleId: string) => {
    const result = acceptDirectContract(contractId, company.id, vehicleId);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  }

  const handleResolve = (contractId: string) => {
    const result = resolveContract(contractId);
    showNotif(result.message, result.success);
    if (result.success || !result.success) onRefresh();
  };

  const handleAssignAutoOp = (vehicleId: string, poolType: AutoOpPoolType | null) => {
    const result = assignVehicleToAutoOp(vehicleId, poolType);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleRunAutoOps = () => {
    const result = runMonthlyAutoOperations(company.id);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  // Filter logic
  let filteredContracts = contracts.filter(c => c.status === 'open');
  if (contractFilter === 'NPC Public') filteredContracts = filteredContracts.filter(c => c.issuerType === 'npc');
  if (contractFilter === 'Local') filteredContracts = filteredContracts.filter(c => c.originState === c.destinationState);
  if (contractFilter === 'Interstate') filteredContracts = filteredContracts.filter(c => c.originState !== c.destinationState);
  if (contractFilter === 'Requires Bid') filteredContracts = filteredContracts.filter(c => c.bidType === 'bid');
  if (contractFilter === 'Direct Accept') filteredContracts = filteredContracts.filter(c => c.bidType === 'direct');
  if (['Player Contracts', 'Government', 'International'].includes(contractFilter)) filteredContracts = []; // Locked for v1

  return (
    <div style={{ width: '100%' }}>
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6 }}>
          {notification.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
        {DESK_TABS.map(tab => {
          const isActive = deskTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setDeskTab(tab.id)} style={{ padding: '8px 14px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: isActive ? 700 : 500, color: isActive ? T.gold : T.muted, background: 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${T.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {deskTab === 'overview' && (
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
            <PanelBox style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(54,211,153,0.03)', border: `1px solid ${T.mint}40` }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: `6px solid ${T.mint}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 0 20px rgba(54,211,153,0.1)' }}>
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
                <div key={i} style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', paddingBottom: '8px', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
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

      {deskTab === 'operations' && (
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
                    <PanelBox style={{ background: hasWestport ? 'rgba(54,211,153,0.02)' : T.panel, border: `1px solid ${hasWestport ? T.mint : T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasWestport ? T.mint : T.ivory }}>Westport Depot</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hasWestport ? T.mint : T.faint, border: `1px solid ${hasWestport ? T.mint : T.border}`, padding: '1px 5px' }}>{hasWestport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasWestport ? '✓ Port Shuttle yield increased by 35% across Westport routes.' : 'Lease Westport Depot/Warehouse to boost Port Shuttle yield by 35%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: hasDrennport ? 'rgba(54,211,153,0.02)' : T.panel, border: `1px solid ${hasDrennport ? T.mint : T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: hasDrennport ? T.mint : T.ivory }}>Drennport Depot</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: hasDrennport ? T.mint : T.faint, border: `1px solid ${hasDrennport ? T.mint : T.border}`, padding: '1px 5px' }}>{hasDrennport ? 'Active' : 'Missing'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {hasDrennport ? '✓ Courier yield increased by 25% across Drennport routes.' : 'Lease Drennport Depot/Warehouse to boost Local Courier yield by 25%.'}
                      </div>
                    </PanelBox>
                    <PanelBox style={{ background: branchCount > 0 ? 'rgba(54,211,153,0.02)' : T.panel, border: `1px solid ${branchCount > 0 ? T.mint : T.border}`, gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: branchCount > 0 ? T.mint : T.ivory }}>Branch Network</span>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: branchCount > 0 ? T.mint : T.faint, border: `1px solid ${branchCount > 0 ? T.mint : T.border}`, padding: '1px 5px' }}>{branchCount > 0 ? `${branchCount} Active` : 'Inactive'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.4 }}>
                        {branchCount > 0 ? `✓ Unlocks multi-state operations and lowers interstate route dispatch cost.` : 'Lease Regional Branch Offices to establish multi-state presence.'}
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
                      <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.mint, background: 'rgba(54,211,153,0.1)', border: `1px solid ${T.mint}`, padding: '1px 6px' }}>
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
                    <select id={`pool-sel-${pool.replace(/\s+/g, '')}`} style={{ padding: '6px', background: T.panel, color: T.ivory, border: `1px solid ${T.border}`, fontSize: '11px', flex: 1 }}>
                      <option value="">Select available vehicle...</option>
                      {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                        <option key={v.id} value={v.id}>{v.type} ({v.condition}%)</option>
                      ))}
                    </select>
                    <GhostButton onClick={() => {
                      const sel = document.getElementById(`pool-sel-${pool.replace(/\s+/g, '')}`) as HTMLSelectElement;
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
              <div style={{ marginTop: '12px', padding: '10px 0', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Projected Net</span>
                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.muted }}>?</span>
              </div>
            </PanelBox>
            {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 && (
              <PanelBox style={{ marginBottom: '16px', background: 'rgba(184,85,85,0.05)', border: `1px solid ${T.red}` }}>
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

      {deskTab === 'fleet' && (
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
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.border}`, color: T.muted, fontSize: '12px' }}>
                  No vehicles in fleet. Purchase vehicles below to start operating contracts.
                </div>
              )}

              {fleet.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {fleet.map((v:any, idx:number) => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.panel, border: `1px solid ${T.border}`, padding: '12px', fontSize: '11px' }}>
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
                        {v.assignedContractId && <span style={{ color: T.mint, border: `1px solid ${T.mint}`, padding: '2px 6px', background: 'rgba(54,211,153,0.1)' }}>On Contract</span>}
                        {v.assignedAutoOpPool && <span style={{ color: T.gold, border: `1px solid ${T.gold}`, padding: '2px 6px', background: 'rgba(224,185,83,0.1)' }}>{v.assignedAutoOpPool}</span>}
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
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            <div style={{ marginTop: '40px', borderTop: `1px solid ${T.border}`, paddingTop: '24px' }}>
              <SectionHeader stamp="USED MARKET">Player Used Market</SectionHeader>
              <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.border}`, color: T.muted, fontSize: '12px' }}>
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

      {deskTab === 'contracts' && (
        <div className="business-content-grid">
          <div>
            {activeContracts.length > 0 && (
              <PanelBox style={{ marginBottom: '24px', border: `1px solid ${T.mint}` }}>
                <SectionHeader stamp="ACTIVE">Current In-Progress Contracts</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeContracts.map((c:any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(54,211,153,0.05)', padding: '12px', border: `1px solid ${T.mint}40` }}>
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
                style={{ flex: 1, padding: '8px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}
              />
              <select 
                value={contractFilter} 
                onChange={e => setContractFilter(e.target.value)}
                style={{ padding: '8px', background: T.panel, border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px' }}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '8px', border: `1px solid ${T.border}` }}>
                      <div><span style={{ color: T.faint }}>Type:</span> {c.type}</div>
                      <div><span style={{ color: T.faint }}>Req Cap:</span> {c.requiredCapacity}</div>
                      <div><span style={{ color: T.faint }}>Duration:</span> {c.durationMonths}mo</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select id={`assign-${c.id}`} style={{ flex: 1, padding: '8px', background: T.panel, color: T.ivory, border: `1px solid ${T.border}`, fontSize: '12px' }}>
                        <option value="">Select available vehicle...</option>
                        {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                          <option key={v.id} value={v.id} disabled={v.capacity < c.requiredCapacity}>
                            {v.type} (Cap: {v.capacity}) {v.capacity < c.requiredCapacity ? '- Too Small' : ''}
                          </option>
                        ))}
                      </select>
                      <GoldButton 
                        onClick={() => {
                          const sel = document.getElementById(`assign-${c.id}`) as HTMLSelectElement;
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
                <div style={{ padding: '30px', textAlign: 'center', color: T.faint, fontSize: '12px', border: `1px dashed ${T.border}` }}>
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

      {deskTab === 'contractHistory' && (
        <div>
          <SectionHeader stamp="RECORDS">Contract History</SectionHeader>
          {contractHistory.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.faint, fontSize: '12px', border: `1px solid ${T.border}` }}>
              No contracts resolved yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contractHistory.map(h => (
                <div key={h.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', color: h.result === 'completed' ? T.mint : T.red }}>{h.result}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{h.title}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Issuer: {h.issuer}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Route: {h.originState} → {h.destinationState}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>Vehicle: {h.vehicleName}</div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace', color: h.result === 'completed' ? T.mint : T.muted }}>Pay: {formatMoney(h.payment)}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.faint }}>Cost: {formatMoney(h.operatingCost)}</div>
                    {h.penalty > 0 && <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.red }}>Penalty: {formatMoney(h.penalty)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deskTab === 'routes' && (
        <div>
          <SectionHeader>Route Matrix</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {['Drennport State → Westport State', 'Drennport State → Ironvale State', 'Drennport State → Greenmere State', 'Westport State → Ironvale State', 'Westport State → Greenmere State', 'Ironvale State → Greenmere State'].map(rName => {
              const rId = rName.replace(/ State/g, '').replace(' → ', '-');
              const fam = routes.find(r => r.id === rId)?.familiarity || 0;
              return (
                <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: T.paper, border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory, marginBottom: '6px' }}>{rName}</div>
                    <div style={{ fontSize: '10px', color: T.muted, fontFamily: 'monospace' }}>Distance: Medium · Risk: Low · Demand: Variable</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>Familiarity</div>
                    <div style={{ fontSize: '16px', fontFamily: 'monospace', color: fam > 0 ? T.mint : T.faint }}>{fam}%</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '11px', color: T.muted, marginTop: '16px' }}>Higher familiarity will reduce operating costs in future updates.</p>
        </div>
      )}

      {deskTab === 'finance' && (
        <div>
          <SectionHeader>Finance Ledger</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Company Position</div>
              <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
              <FieldRow label="Total Fleet Value" value={formatMoney(fleet.reduce((acc, v) => acc + Math.round(v.purchaseCost * (v.condition / 100)), 0))} valueColor={T.steel} />
              <FieldRow label="Lease Roster Value" value={formatMoney((company.facilities || []).length * 10000)} valueColor={T.muted} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Company Net Value" value={formatMoney(calcCompanyValue(company))} valueColor={T.gold} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Monthly Estimate</div>
              <FieldRow label="Monthly Revenue" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
              <FieldRow label="Operating Costs" value={formatMoney(Math.max(0, company.monthlyCosts - fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0) - (company.facilities || []).reduce((acc, f) => acc + f.leaseCost, 0)))} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <FieldRow label="Facility Lease Expense" value={formatMoney((company.facilities || []).reduce((acc, f) => acc + f.leaseCost, 0))} valueColor={T.red} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Projected Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
            </PanelBox>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <SectionHeader>Recent Financial Activity</SectionHeader>
            {records.filter((r: any) => r.type === 'auto_op' || r.type === 'contract' || r.type === 'business').slice(0, 5).map((r: any) => (
              <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${T.gold}`, fontSize: '12px', color: T.ivory, lineHeight: 1.6, marginBottom: '8px' }}>
                {r.summary}
                <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px' }}>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: T.muted, marginTop: '16px' }}>Finance sector features including loans, credit lines, and taxation will unlock in a future update.</p>
        </div>
      )}

      {deskTab === 'assets' && (
        <AssetsTab company={company} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} />
      )}

      {deskTab === 'records' && (
        <div>
          <SectionHeader>Company Ledger & Records</SectionHeader>
          {records.length === 0 ? <p style={{ fontSize: '12px', color: T.faint }}>No records found.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map((r: any) => (
                <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: `2px solid ${r.type === 'failure' ? T.red : r.type === 'business' ? T.gold : T.mint}`, fontSize: '12px', color: T.ivory, lineHeight: 1.6 }}>
                  {r.summary}
                  <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px' }}>{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deskTab === 'equity' && (
        <div>
          <SectionHeader stamp="OWNERSHIP">Equity & Shares</SectionHeader>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <PanelBox style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Ownership Summary</div>
              <ul style={{ fontSize: '11px', color: T.muted, lineHeight: 1.8, paddingLeft: '16px', margin: 0 }}>
                <li>Founder owns 100%</li>
                <li>No outside investors</li>
                <li>No shares issued yet</li>
                <li>Personal ownership applies</li>
              </ul>
            </PanelBox>
          </div>

          <PanelBox style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '16px' }}>Ownership Table</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '8px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}`, fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>
              <div>Holder</div>
              <div>Role</div>
              <div style={{ textAlign: 'right' }}>Ownership</div>
              <div style={{ textAlign: 'right' }}>Voting Power</div>
              <div style={{ textAlign: 'right' }}>Dividend Right</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '8px', paddingTop: '12px', fontSize: '12px', color: T.ivory, alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{company.ownerName}</div>
              <div style={{ color: T.muted }}>Founder & CEO</div>
              <div style={{ textAlign: 'right', color: T.mint, fontFamily: 'monospace' }}>100%</div>
              <div style={{ textAlign: 'right', color: T.mint, fontFamily: 'monospace' }}>100%</div>
              <div style={{ textAlign: 'right', color: T.mint, fontFamily: 'monospace' }}>100%</div>
            </div>
          </PanelBox>

          <SectionHeader stamp="LOCKED">Future Actions</SectionHeader>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Add Partner', 'Sell Stake', 'Issue Shares', 'Convert to Private Company', 'Convert to Corporation'].map(act => (
              <div key={act} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, fontSize: '11px', color: T.faint }}>
                🔒 {act}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetsTab({ company, fleet, onRefresh, showNotif }: {
  company: Company; fleet: Vehicle[];
  onRefresh: () => void;
  showNotif: (msg: string, success: boolean) => void;
}) {
  const [selectedStates, setSelectedStates] = useState<Record<string, string>>({
    'Office': company.state,
    'Vehicle Yard': company.state,
    'Small Depot': company.state,
    'Warehouse': company.state,
    'Regional Branch Office': company.state,
  });

  const handleLease = (type: any, leaseCost: number) => {
    const state = selectedStates[type] || company.state;
    // Check if company already has this facility type in this state
    const alreadyLeased = (company.facilities || []).some(f => f.type === type && f.state === state);
    if (alreadyLeased) {
      showNotif(`You already lease a ${type} in ${state}.`, false);
      return;
    }

    const res = leaseFacility(company.id, type, state, leaseCost);
    showNotif(res.message, res.success);
    if (res.success) {
      onRefresh();
    }
  };

  const vehicleAssetValue = fleet.reduce((sum, v) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  const totalLeasedCost = (company.facilities || []).reduce((sum, f) => sum + f.leaseCost, 0);

  const availableProperties = [
    {
      type: 'Office' as const,
      leaseCost: 10000,
      benefit: 'Administrative base. Improves company legitimacy and unlocks better client trust later.',
      leaseable: true,
    },
    {
      type: 'Vehicle Yard' as const,
      leaseCost: 15000,
      benefit: '+2 vehicle capacity in that state. Serves as local hub.',
      leaseable: true,
    },
    {
      type: 'Small Depot' as const,
      leaseCost: 25000,
      benefit: 'Local freight handling. Unlocks local auto operations and small regional contracts. Westport depot boosts Port Shuttle yield by 35%. Drennport depot boosts Local Courier yield by 25%.',
      leaseable: true,
    },
    {
      type: 'Warehouse' as const,
      leaseCost: 40000,
      benefit: 'Cargo storage. Unlocks storage contracts and retail restock contracts.',
      leaseable: true,
    },
    {
      type: 'Regional Branch Office' as const,
      leaseCost: 30000,
      benefit: 'Expands official presence to another state. Unlocks auto operations and better contracts in that state.',
      leaseable: true,
    },
    {
      type: 'Freight Yard' as const,
      leaseCost: 70000,
      benefit: 'Larger vehicle and cargo operation. Supports larger interstate freight and capacity scaling.',
      leaseable: false,
      note: 'Locked: Requires Construction update',
    },
    {
      type: 'Port Warehouse' as const,
      leaseCost: 90000,
      benefit: 'Westport port-adjacent storage. Unlocks higher-value port transfer contracts.',
      leaseable: false,
      note: 'Locked: Requires Construction update',
    },
    {
      type: 'Port Terminal' as const,
      leaseCost: 250000,
      benefit: 'International maritime trade hub. Unlocks deep sea shipping and coastal vessels.',
      leaseable: false,
      note: 'Locked/Later',
    },
  ];

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* 1. Asset Summary */}
      <SectionHeader stamp="PORTFOLIO SUMMARY">Asset Summary</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>Total Fleet Assets</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: T.steel }}>{fleet.length} Vehicles</div>
          <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>Depreciated Value: {formatMoney(vehicleAssetValue)}</div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>Properties & Facilities</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{(company.facilities || []).length} Active Leases</div>
          <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>Monthly Cost: {formatMoney(totalLeasedCost)}/mo</div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>Expansion Sites</div>
          <div style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 700, color: T.faint }}>0 Sites</div>
          <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>Pre-Alpha construction limit</div>
        </PanelBox>
      </div>

      {/* 2. Current Assets */}
      <SectionHeader stamp="CURRENT ASSETS">Leased Properties & Facilities</SectionHeader>
      {(!company.facilities || company.facilities.length === 0) ? (
        <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: `1px solid ${T.border}`, color: T.faint, fontSize: '11px', marginBottom: '24px' }}>
          No leased properties on file. Lease an Office, Depot, or Yard below to start establishing your network.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {(company.facilities || []).map(f => (
            <div key={f.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${T.mint}` }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{f.type}</div>
                <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>Location: <strong style={{ color: T.gold }}>{f.state}</strong> · Leased on: {new Date(f.leasedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontFamily: 'monospace', color: T.red }}>{formatMoney(f.leaseCost)}/mo</div>
                <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Leased Base</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Properties & Facilities Options */}
      <SectionHeader stamp="ACQUISITION">Available Properties & Facilities</SectionHeader>
      <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>
        Lease key real estate to support your logistics empire. Small Depots and Warehouses unlock higher-value operations.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {availableProperties.map(prop => {
          const isLeaseable = prop.leaseable;
          const canAfford = company.companyCash >= prop.leaseCost;
          const selectedState = selectedStates[prop.type] || company.state;
          const alreadyLeased = (company.facilities || []).some(f => f.type === prop.type && f.state === selectedState);
          
          return (
            <div key={prop.type} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isLeaseable ? 1 : 0.6 }}>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{prop.type}</span>
                  {!isLeaseable && (
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint, border: `1px solid ${T.border}`, padding: '1px 6px' }}>{(prop as any).note || 'LOCKED'}</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.5, marginBottom: '8px' }}>{prop.benefit}</div>
                {isLeaseable && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>Target State:</span>
                    <select
                      value={selectedState}
                      onChange={e => setSelectedStates({ ...selectedStates, [prop.type]: e.target.value })}
                      style={{ padding: '4px 8px', background: T.paper, color: T.ivory, border: `1px solid ${T.border}`, fontSize: '11px', outline: 'none' }}
                    >
                      <option value="Drennport State">Drennport State</option>
                      <option value="Westport State">Westport State</option>
                      <option value="Ironvale State">Ironvale State</option>
                      <option value="Greenmere State">Greenmere State</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: isLeaseable && canAfford ? T.mint : T.red, marginBottom: '8px' }}>
                  {formatMoney(prop.leaseCost)}<span style={{ fontSize: '10px', color: T.faint }}>/mo</span>
                </div>
                {isLeaseable ? (
                  <GoldButton
                    disabled={!canAfford || alreadyLeased}
                    onClick={() => handleLease(prop.type, prop.leaseCost)}
                  >
                    {alreadyLeased ? 'Leased in State' : 'Lease Facility'}
                  </GoldButton>
                ) : (
                  <div style={{ fontSize: '10px', color: T.faint, fontFamily: 'monospace' }}>Future Construction Only</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Construction Projects (Locked) */}
      <SectionHeader stamp="FUTURE UPGRADE">Construction Projects</SectionHeader>
      <PanelBox style={{ background: T.paper }}>
        <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, marginBottom: '16px' }}>
          “Future update: buy land, commission construction companies, and build offices, depots, warehouses, freight yards, and terminals. Player construction companies will be able to bid on these projects.”
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            'Buy Land',
            'Request Construction Bids',
            'Build Office',
            'Build Depot',
            'Build Warehouse',
            'Build Freight Yard',
            'Build Port Terminal',
          ].map(action => (
            <div key={action} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>
              🔒 {action}
            </div>
          ))}
        </div>
      </PanelBox>
    </div>
  );
}

// CONTRACTS TAB (global business tab)
// ─────────────────────────────────────────────────────────────────────────────
function ContractsTab({ company, contracts, fleet, onRefresh }: { company: Company; contracts: Contract[]; fleet: Vehicle[]; onRefresh: () => void }) {
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const showNotif = (msg: string, success: boolean) => { setNotification({ msg, success }); setTimeout(() => setNotification(null), 4000); };
  const handleAssign = (contractId: string, vehicleId: string) => { const r = assignVehicleToContract(contractId, vehicleId); showNotif(r.message, r.success); if (r.success) onRefresh(); };
  const handleResolve = (contractId: string) => { const r = resolveContract(contractId); showNotif(r.message, r.success); onRefresh(); };
  return (
    <div style={{ maxWidth: '860px' }}>
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: `1px solid ${notification.success ? T.mint : T.red}`, color: notification.success ? T.mint : T.red, fontSize: '12px' }}>
          {notification.msg}
        </div>
      )}
      <ContractsTabInner company={company} contracts={contracts} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} handleAssign={handleAssign} handleResolve={handleResolve} />
    </div>
  );
}

// ─── Shared Contracts Inner Component ────────────────────────────────────────
function ContractsTabInner({ company, contracts, fleet, onRefresh, showNotif, handleAssign, handleResolve }: {
  company: Company; contracts: Contract[]; fleet: Vehicle[];
  onRefresh: () => void;
  showNotif: (msg: string, success: boolean) => void;
  handleAssign: (contractId: string, vehicleId: string) => void;
  handleResolve: (contractId: string) => void;
}) {
  const [biddingOn, setBiddingOn] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [assigningFor, setAssigningFor] = useState<string | null>(null);
  const availableFleet = fleet.filter(v => !v.assignedContractId);

  const openContracts = contracts.filter(c => c.status === 'open');
  const myActive = contracts.filter(c => (c.status === 'awarded' || c.status === 'active') && c.awardedToCompanyId === company.id);
  const myCompleted = contracts.filter(c => (c.status === 'completed' || c.status === 'failed') && contract_belongsToMe(c, company.id));

  function contract_belongsToMe(c: Contract, compId: string) {
    return c.awardedToCompanyId === compId || c.bids.some(b => b.companyId === compId);
  }

  const handleBid = () => {
    if (!biddingOn) return;
    const result = evaluatePlayerBid(biddingOn, company.id, bidAmount);
    showNotif(result.message, result.accepted);
    setBiddingOn(null);
    setBidAmount(0);
    onRefresh();
  };

  const hasFleet = fleet.length > 0;

  return (
    <div>
      {/* OPEN CONTRACTS */}
      <div style={{ marginBottom: '32px' }}>
        <SectionHeader stamp={`${openContracts.length} OPEN`}>Public Contract Board</SectionHeader>
        {!hasFleet && (
          <div style={{ padding: '12px 16px', background: 'rgba(201,162,74,0.05)', border: `1px solid ${T.borderGold}`, marginBottom: '16px', fontSize: '12px', color: T.gold }}>
            ⚠ You need at least one vehicle to bid on contracts. Go to My Companies → Fleet.
          </div>
        )}
        {openContracts.length === 0 ? (
          <PanelBox><p style={{ fontSize: '12px', color: T.faint }}>No open contracts currently.</p></PanelBox>
        ) : (
          openContracts.map(c => {
            const suitableVehicle = availableFleet.find(v => v.capacity >= c.requiredCapacity);
            const canBid = hasFleet && !!suitableVehicle;
            const myBid = c.bids.find(b => b.companyId === company.id);
            return (
              <div key={c.id} style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '16px', marginBottom: '12px', borderLeft: `3px solid ${T.gold}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '3px' }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>{c.issuerName} · {c.cargo} · {c.originState} → {c.destinationState}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>{formatMoney(c.payment)}</div>
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>Penalty: {formatMoney(c.penalty)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>
                  <span>Capacity {c.requiredCapacity} required</span>
                  <span>Deadline {c.deadlineDays}d</span>
                  {!canBid && <span style={{ color: T.red }}>⚠ Need capacity-{c.requiredCapacity} vehicle</span>}
                  {suitableVehicle && <span style={{ color: T.mint }}>✓ {suitableVehicle.type} eligible</span>}
                </div>
                <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6, margin: '0 0 12px' }}>{c.description}</p>
                {myBid ? (
                  <div style={{ fontSize: '11px', color: T.gold }}>Your bid: {formatMoney(myBid.amount)} — awaiting decision</div>
                ) : biddingOn === c.id ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <Label>Your Bid (₯)</Label>
                      <input type="number" min={1} value={bidAmount} onChange={e => setBidAmount(parseInt(e.target.value) || 0)}
                        style={{ padding: '8px 12px', background: T.panel, border: `1px solid ${T.border}`, color: T.mint, fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, outline: 'none', width: '160px' }} />
                    </div>
                    <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                      <GoldButton onClick={handleBid} disabled={bidAmount <= 0}>Submit Bid</GoldButton>
                      <GhostButton onClick={() => { setBiddingOn(null); setBidAmount(0); }}>Cancel</GhostButton>
                    </div>
                  </div>
                ) : (
                  <GoldButton onClick={() => { if (canBid) { setBiddingOn(c.id); setBidAmount(c.payment); } }} disabled={!canBid}>
                    {canBid ? 'Place Bid →' : 'Insufficient Fleet Capacity'}
                  </GoldButton>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ACTIVE CONTRACTS */}
      {myActive.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <SectionHeader stamp="ACTIVE">Your Active Contracts</SectionHeader>
          {myActive.map(c => {
            const assignedVehicle = fleet.find(v => v.id === c.assignedVehicleId);
            const bid = c.bids.find(b => b.companyId === company.id);
            return (
              <div key={c.id} style={{ background: T.paper, border: `1px solid ${T.mint}30`, padding: '16px', marginBottom: '12px', borderLeft: `3px solid ${T.mint}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '3px' }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: T.muted }}>{c.originState} → {c.destinationState} · Capacity {c.requiredCapacity}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>{formatMoney(bid?.amount ?? c.payment)}</div>
                    <div style={{ fontSize: '9px', color: T.faint }}>Your bid</div>
                  </div>
                </div>

                {/* Assign vehicle */}
                {!assignedVehicle ? (
                  <div>
                    <div style={{ fontSize: '11px', color: T.gold, marginBottom: '8px' }}>⚠ No vehicle assigned — assign before resolving.</div>
                    {assigningFor === c.id ? (
                      <div>
                        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Select available vehicle (min capacity {c.requiredCapacity}):</div>
                        {availableFleet.filter(v => v.capacity >= c.requiredCapacity).map(v => (
                          <button key={v.id} onClick={() => { handleAssign(c.id, v.id); setAssigningFor(null); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, color: T.ivory, cursor: 'pointer', marginBottom: '6px', fontSize: '12px' }}>
                            {v.type} — Capacity {v.capacity} · Condition {v.condition}%
                          </button>
                        ))}
                        {availableFleet.filter(v => v.capacity >= c.requiredCapacity).length === 0 && (
                          <div style={{ fontSize: '11px', color: T.red }}>No suitable available vehicles.</div>
                        )}
                        <GhostButton onClick={() => setAssigningFor(null)}>Cancel</GhostButton>
                      </div>
                    ) : (
                      <GhostButton onClick={() => setAssigningFor(c.id)} color={T.mint}>Assign Vehicle →</GhostButton>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '11px', color: T.mint, marginBottom: '8px' }}>✓ Vehicle: {assignedVehicle.type} · Condition {assignedVehicle.condition}%</div>
                    <GoldButton onClick={() => handleResolve(c.id)}>Resolve Contract →</GoldButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HISTORY */}
      {myCompleted.length > 0 && (
        <div>
          <SectionHeader stamp={`${myCompleted.length}`}>Contract History</SectionHeader>
          {myCompleted.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', color: c.status === 'completed' ? T.mint : T.red, marginRight: '8px' }}>{c.status}</span>
                <span style={{ fontSize: '12px', color: T.muted }}>{c.title}</span>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: c.status === 'completed' ? T.mint : T.red }}>{formatMoney(c.payment)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REGISTRY TAB ─────────────────────────────────────────────────────────────
function RegistryTab({ company }: { company: Company | null }) {
  const all = getCompanies();
  return (
    <div style={{ maxWidth: '720px' }}>
      <SectionHeader stamp="PUBLIC RECORD">Drennia Commercial Registry</SectionHeader>
      {all.length === 0 ? (
        <PanelBox><p style={{ fontSize: '12px', color: T.faint }}>No companies registered yet.</p></PanelBox>
      ) : (
        all.map(c => (
          <div key={c.id} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '14px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: T.ivory }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: T.muted }}>{c.legalStructure} · {c.sector} · {c.state}</div>
              </div>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>{c.id === company?.id ? '(You)' : 'NPC/Player'}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── FINANCE TAB ─────────────────────────────────────────────────────────────
function FinanceTab({ company, fleet, playerCash, netWorth }: { company: Company; fleet: Vehicle[]; playerCash: number; netWorth: number }) {
  const companyValue = calcCompanyValue(company);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '760px' }}>
      <PanelBox>
        <SectionHeader stamp="LEDGER">Company Financials</SectionHeader>
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
        <FieldRow label="Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
        <FieldRow label="Monthly Revenue" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
        <FieldRow label="Monthly Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
        <FieldRow label="Net Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
      </PanelBox>
      <PanelBox>
        <SectionHeader stamp="NET WORTH">Personal Balance Sheet</SectionHeader>
        <FieldRow label="Cash in Hand" value={formatMoney(playerCash)} valueColor={T.mint} />
        <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
        <FieldRow label="Vehicle Assets" value={formatMoney(companyValue - company.companyCash)} valueColor={T.steel} />
        <FieldRow label="Company Value" value={formatMoney(companyValue)} valueColor={T.gold} />
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Net Worth</span>
          <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(netWorth)}</span>
        </div>
      </PanelBox>
    </div>
  );
}

// ─── EQUITY TAB ──────────────────────────────────────────────────────────────
