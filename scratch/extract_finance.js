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
    <div className="business-content-grid">
      <div>
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
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Company Valuation</SectionHeader>
          <FieldRow label="Base Equity" value={formatMoney(10000)} valueColor={T.gold} />
          <FieldRow label="Asset Value" value={formatMoney(companyValue - company.companyCash + company.debt)} valueColor={T.mint} />
          <FieldRow label="Cash Reserves" value={formatMoney(company.companyCash)} valueColor={T.mint} />
          <FieldRow label="Liabilities" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
          <div style={{ margin: '16px 0', borderTop: `1px solid ${T.border}` }} />
          <FieldRow label="Total Value" value={formatMoney(companyValue)} valueColor={T.gold} />
        </PanelBox>
        <PanelBox>
          <SectionHeader>Credit & Debt</SectionHeader>
          <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
          <FieldRow label="Credit Rating" value="A+" valueColor={T.gold} />
          <div style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>Pay off your debts to improve your credit rating and borrow more capital for expansion.</div>
        </PanelBox>
      </div>
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
