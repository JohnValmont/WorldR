const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

const tabStart = page.indexOf('// COMPANY DESK TAB');
if (tabStart === -1) throw new Error('Could not find CompanyDeskTab');

// Everything before CompanyDeskTab
const before = page.substring(0, tabStart);

const newComponent = `// ─────────────────────────────────────────────────────────────────────────────
// COMPANY DESK TAB (Shipping & Logistics)
// ─────────────────────────────────────────────────────────────────────────────
type CompanyDeskTab = 'overview' | 'fleet' | 'contracts' | 'contractHistory' | 'routes' | 'finance' | 'records' | 'equity';

function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onTabChange, onRefresh }: {
  company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string;
  onTabChange: (tab: any) => void; onRefresh: () => void;
}) {
  const [deskTab, setDeskTab] = useState<CompanyDeskTab>('overview');
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);
  const [contractFilter, setContractFilter] = useState<string>('All');

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'routes',     label: 'Routes'     },
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
      addRecord(\`Completed \${level === 'basic' ? 'basic maintenance' : 'full service'} on vehicle. Condition restored.\`, 'business');
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
    <div style={{ maxWidth: '900px' }}>
      {notification && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', background: notification.success ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)', border: \`1px solid \${notification.success ? T.mint : T.red}\`, color: notification.success ? T.mint : T.red, fontSize: '12px', lineHeight: 1.6 }}>
          {notification.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: \`1px solid \${T.border}\`, overflowX: 'auto' }}>
        {DESK_TABS.map(tab => {
          const isActive = deskTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setDeskTab(tab.id)} style={{ padding: '8px 14px', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: isActive ? 700 : 500, color: isActive ? T.gold : T.muted, background: 'transparent', border: 'none', borderBottom: isActive ? \`2px solid \${T.gold}\` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {deskTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <SectionHeader>Fleet Status</SectionHeader>
              {fleet.length === 0 ? (
                <p style={{ fontSize: '12px', color: T.faint }}>No vehicles. Go to Fleet tab to buy your first vehicle.</p>
              ) : (
                fleet.map(v => (
                  <FieldRow key={v.id} label={v.type} value={\`Capacity \${v.capacity} · \${v.condition}%\${v.assignedContractId ? ' · ACTIVE' : v.assignedAutoOpPool ? ' · AUTO' : ' · Available'}\`} valueColor={v.assignedContractId || v.assignedAutoOpPool ? T.gold : T.mint} />
                ))
              )}
            </PanelBox>
            <PanelBox>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Completed" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Reliability" value={company.reliability} />
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'fleet' && (
        <div>
          <SectionHeader>Fleet</SectionHeader>
          {fleet.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '12px' }}>Current Fleet</div>
              {fleet.map(v => {
                const spec = VEHICLE_CATALOGUE.find(s => s.type === v.type)!;
                const assetValue = Math.round(v.purchaseCost * (v.condition / 100));
                return (
                  <div key={v.id} style={{ background: T.paper, border: \`1px solid \${T.border}\`, padding: '16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{v.type}</div>
                        <div style={{ fontSize: '11px', color: T.muted }}>Capacity {v.capacity} · Asset value {formatMoney(assetValue)} · Maint {formatMoney(v.monthlyMaintenance)}/mo</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>Condition</div>
                        <div style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: v.condition > 60 ? T.mint : v.condition > 30 ? T.gold : T.red }}>{v.condition}%</div>
                      </div>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }}>
                      <div style={{ height: '100%', width: \`\${v.condition}%\`, background: v.condition > 60 ? T.mint : v.condition > 30 ? T.gold : T.red, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: v.assignedContractId || v.assignedAutoOpPool ? T.gold : T.mint }}>
                        {v.assignedContractId ? '⚡ Assigned to contract' : v.assignedAutoOpPool ? \`⚙ Assigned to \${v.assignedAutoOpPool}\` : '✓ Available'}
                      </div>
                      {!v.assignedContractId && !v.assignedAutoOpPool && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <GhostButton onClick={() => handleMaintenance(v.id, 'basic')} color={T.muted}>
                            Basic Maintenance {formatMoney(5000)} (+10%)
                          </GhostButton>
                          <GhostButton onClick={() => handleMaintenance(v.id, 'full')} color={T.gold}>
                            Full Service {formatMoney(15000)} (+30%)
                          </GhostButton>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <div style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.faint, marginBottom: '12px' }}>Vehicle Procurement</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {VEHICLE_CATALOGUE.map(spec => {
                const canAfford = company.companyCash >= spec.cost;
                const dealer = spec.type === 'Used Delivery Van' ? 'Drennport Motor Works' : spec.type === 'Box Truck' ? 'Kovath Industrial Motors' : 'Ironvale Heavy Machines';
                return (
                  <div key={spec.type} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.gold, marginBottom: '4px' }}>{dealer}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '4px' }}>{spec.type}</div>
                      <div style={{ fontSize: '11px', color: T.muted }}>Capacity {spec.capacity} · Maint {formatMoney(spec.maintenance)}/mo · Cond 100% · Stock: {Math.floor(Math.random() * 5) + 1}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: canAfford ? T.mint : T.red, marginBottom: '8px' }}>{formatMoney(spec.cost)}</div>
                      <GoldButton onClick={() => handleBuyVehicle(spec.type)} disabled={!canAfford}>Purchase</GoldButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {deskTab === 'contracts' && (
        <div>
          {activeContracts.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <SectionHeader stamp="IN PROGRESS">Active Contracts</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeContracts.map(c => {
                  const v = fleet.find(f => f.id === c.assignedVehicleId);
                  return (
                    <PanelBox key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{c.title}</div>
                          <div style={{ fontSize: '11px', color: T.muted }}>{c.originState} → {c.destinationState}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '14px', fontFamily: 'monospace', color: T.mint }}>{formatMoney(c.payment)}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>Assigned: {v?.type || 'Unknown'} (Cond: {v?.condition || 0}%)</div>
                      <GoldButton onClick={() => handleResolve(c.id)}>Resolve (Test Skip Time)</GoldButton>
                    </PanelBox>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '32px' }}>
            <SectionHeader stamp="PUBLIC BOARD">Contract Board</SectionHeader>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {['All', 'NPC Public', 'Player Contracts', 'Government', 'International', 'Local', 'Interstate', 'Requires Bid', 'Direct Accept'].map(f => (
                <button
                  key={f}
                  onClick={() => setContractFilter(f)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    background: contractFilter === f ? 'rgba(201,162,74,0.1)' : 'rgba(255,255,255,0.03)',
                    border: \`1px solid \${contractFilter === f ? T.gold : T.border}\`,
                    color: contractFilter === f ? T.gold : T.muted,
                    cursor: 'pointer'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredContracts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: T.faint, fontSize: '12px', border: \`1px solid \${T.border}\` }}>
                {['Player Contracts', 'Government', 'International'].includes(contractFilter) ? 'Sector locked. Feature coming in future update.' : 'No open contracts match these filters.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredContracts.map(c => {
                  const isEligible = company.sector === c.requiredSector;
                  const availableFleet = fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool);
                  const suitableVehicle = availableFleet.find(v => v.capacity >= c.requiredCapacity && v.condition >= 40);
                  
                  return (
                    <div key={c.id} style={{ background: T.paper, border: \`1px solid \${T.border}\`, padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: T.faint, fontFamily: 'monospace' }}>{c.issuerType === 'npc' ? 'NPC Public' : c.issuerType}</span>
                        <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: T.faint, fontFamily: 'monospace' }}>{c.originState === c.destinationState ? 'Local' : 'Interstate'}</span>
                        <span style={{ fontSize: '9px', padding: '2px 6px', background: c.bidType === 'direct' ? 'rgba(54,211,153,0.1)' : 'rgba(201,162,74,0.1)', color: c.bidType === 'direct' ? T.mint : T.gold, fontFamily: 'monospace' }}>{c.bidType === 'direct' ? 'Direct Accept' : 'Requires Bid'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, marginBottom: '2px' }}>{c.title}</div>
                          <div style={{ fontSize: '11px', color: T.muted }}>Issuer: {c.issuerName}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: T.mint }}>{formatMoney(c.payment)}</div>
                          <div style={{ fontSize: '10px', color: T.red }}>Penalty: {formatMoney(c.penalty)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', lineHeight: 1.6 }}>{c.description}</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '16px' }}>
                        <div><span style={{ color: T.faint }}>Type:</span> {c.contractType || 'Freight'}</div>
                        <div><span style={{ color: T.faint }}>Cargo:</span> {c.cargo}</div>
                        <div><span style={{ color: T.faint }}>Route:</span> {c.originState} → {c.destinationState}</div>
                        <div><span style={{ color: T.faint }}>Capacity Required:</span> {c.requiredCapacity}</div>
                      </div>

                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderTop: \`1px solid \${T.border}\` }}>
                        {!isEligible ? (
                          <div style={{ fontSize: '11px', color: T.red }}>⚠ Ineligible: Requires {c.requiredSector} sector.</div>
                        ) : !suitableVehicle ? (
                          <div style={{ fontSize: '11px', color: T.red }}>⚠ Ineligible: No available vehicle with capacity {c.requiredCapacity} and condition &gt; 40%.</div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select id={\`assign-\${c.id}\`} style={{ padding: '8px', background: T.panel, color: T.ivory, border: \`1px solid \${T.border}\`, outline: 'none', fontSize: '12px', flex: 1 }}>
                              {availableFleet.map(v => (
                                <option key={v.id} value={v.id} disabled={v.capacity < c.requiredCapacity || v.condition < 40}>{v.type} (Cap {v.capacity}, Cond {v.condition}%)</option>
                              ))}
                            </select>
                            {c.bidType === 'direct' ? (
                              <GoldButton onClick={() => {
                                const sel = document.getElementById(\`assign-\${c.id}\`) as HTMLSelectElement;
                                if (sel) handleDirectAccept(c.id, sel.value);
                              }}>Accept directly</GoldButton>
                            ) : (
                              <GoldButton onClick={() => {
                                const sel = document.getElementById(\`assign-\${c.id}\`) as HTMLSelectElement;
                                if (sel) {
                                  const res = evaluatePlayerBid(c.id, company.id, c.payment);
                                  showNotif(res.message, res.accepted);
                                  if (res.accepted) assignVehicleToContract(c.id, sel.value);
                                  onRefresh();
                                }
                              }}>Submit Bid</GoldButton>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <SectionHeader stamp="RECURRING">Auto Operations</SectionHeader>
            <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Assign idle vehicles to recurring local pools. This generates steady monthly income but wears down vehicle condition.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {['Local Delivery Pool', 'Port Shuttle Pool'].map(pool => (
                <PanelBox key={pool}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>{pool}</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                    {pool === 'Local Delivery Pool' ? 'High volume local courier work around Drennport. Steady demand, high competition.' : 'Container and crate movement around Westport docks. High demand.'}
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
              ))}
            </div>

            <GoldButton onClick={handleRunAutoOps} disabled={fleet.filter(v => v.assignedAutoOpPool).length === 0}>
              Run Monthly Auto Operations (Test)
            </GoldButton>
          </div>
        </div>
      )}

      {deskTab === 'contractHistory' && (
        <div>
          <SectionHeader stamp="RECORDS">Contract History</SectionHeader>
          {contractHistory.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.faint, fontSize: '12px', border: \`1px solid \${T.border}\` }}>
              No contracts resolved yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contractHistory.map(h => (
                <div key={h.id} style={{ background: T.paper, border: \`1px solid \${T.border}\`, padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
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
                <div key={rName} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: T.paper, border: \`1px solid \${T.border}\` }}>
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
          <SectionHeader>Finance</SectionHeader>
          <PanelBox>
            <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
            <FieldRow label="Monthly Revenue Estimate" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
            <FieldRow label="Monthly Fixed Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
            <FieldRow label="Projected Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
            <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
          </PanelBox>
          <p style={{ fontSize: '11px', color: T.muted, marginTop: '16px' }}>Finance sector features including loans, credit lines, and taxation will unlock in a future update.</p>
        </div>
      )}

      {deskTab === 'records' && (
        <div>
          <SectionHeader>Company Ledger & Records</SectionHeader>
          {records.length === 0 ? <p style={{ fontSize: '12px', color: T.faint }}>No records found.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {records.map((r: any) => (
                <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: \`2px solid \${r.type === 'failure' ? T.red : r.type === 'business' ? T.gold : T.mint}\`, fontSize: '12px', color: T.ivory, lineHeight: 1.6 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: '8px', paddingBottom: '8px', borderBottom: \`1px solid \${T.border}\`, fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>
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
              <div key={act} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: \`1px solid \${T.border}\`, fontSize: '11px', color: T.faint }}>
                🔒 {act}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', before + newComponent);
