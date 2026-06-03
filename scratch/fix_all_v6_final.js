const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Navigation Setup
c = c.replace(/type SubTab = [^;]+;/, "type SubTab = 'overview' | 'start' | 'companies' | 'market' | 'registry';");
c = c.replace(/const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[([\s\S]*?)\];/, 
\`const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'start',      label: 'Start Business' },
    { id: 'companies',  label: 'My Companies', requiresCompany: true },
    { id: 'market',     label: 'Market' },
    { id: 'registry',   label: 'Registry' }
  ];\`);

c = c.replace(/type CompanyDeskTab = [^;]+;/, "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';");

const tSearch = 'const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [';
const tStartIdx = c.indexOf(tSearch);
const tEndIdx = c.indexOf('];', tStartIdx) + 2;
const newTabs = \`const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets',     label: 'Assets'     },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];\`;
c = c.substring(0, tStartIdx) + newTabs + c.substring(tEndIdx);

// 2. Hide Parent Tabs
const bPageStart = c.indexOf('{/* ── Subtabs & Breadcrumbs ── */}');
const bPageEnd = c.indexOf('{/* ── Back / Breadcrumb Navigation (Anchors) ── */}');
const isManagingCompanyStr = \`
        {/* Dynamic Breadcrumbs */}
        {(() => {
          const isManagingCompany = activeTab === 'companies' && selectedCompanyId && company;
          return (
            <>
              <div style={{ display: 'flex', gap: '8px', padding: '12px 0 4px', fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <span style={{ cursor: 'pointer', color: activeTab === 'overview' ? T.gold : T.muted }} onClick={() => { setActiveTab('overview'); setSelectedCompanyId(null); }}>Business Desk</span>
                {activeTab === 'companies' && (
                  <>
                    <span>→</span>
                    <span style={{ cursor: 'pointer', color: !selectedCompanyId ? T.gold : T.muted }} onClick={() => setSelectedCompanyId(null)}>My Companies</span>
                  </>
                )}
                {isManagingCompany && (
                  <>
                    <span>→</span>
                    <span style={{ color: T.gold }}>{company?.name}</span>
                  </>
                )}
              </div>

              {/* Subtabs */}
              {!isManagingCompany && (
                <div style={{ display: 'flex', gap: '0', overflowX: 'auto', marginTop: '8px' }}>
                  {SUB_TABS.map(tab => {
                    const locked = tab.requiresCompany && !company;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          if (!locked) {
                            setActiveTab(tab.id);
                            if (tab.id !== 'companies') setSelectedCompanyId(null);
                          }
                        }}
                        style={{
                          padding: '10px 16px', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em',
                          fontWeight: isActive ? 700 : 500, color: locked ? T.faint : isActive ? T.gold : T.muted,
                          background: 'transparent', border: 'none', borderBottom: isActive ? \\\`2px solid \\\${T.gold}\\\` : '2px solid transparent',
                          cursor: locked ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s',
                        }}
                        title={locked ? 'Register a company to unlock' : undefined}
                      >
                        {tab.label}{locked ? ' 🔒' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
\`;
let newDiv = \`{/* ── Subtabs & Breadcrumbs ── */}
      <div style={{ padding: '0 24px', borderBottom: \\\`1px solid \\\${T.border}\\\`, flexShrink: 0 }}>\` + isManagingCompanyStr + \`      </div>\\n\\n      \`;
c = c.substring(0, bPageStart) + newDiv + c.substring(bPageEnd);

// 3. Fix Back Anchors
const backNavStart = c.indexOf('{/* ── Back / Breadcrumb Navigation (Anchors) ── */}');
const backNavEnd = c.indexOf('{/* ── Tab Content ── */}');
c = c.substring(0, backNavStart) + 
\`{/* ── Back / Breadcrumb Navigation (Anchors) ── */}
      <div style={{ padding: '8px 24px 0', flexShrink: 0 }}>
        {activeTab === 'companies' && selectedCompanyId && company && (
          <span style={{ cursor: 'pointer', color: T.gold, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => setSelectedCompanyId(null)}>
            ← Back to My Companies
          </span>
        )}
      </div>\\n\\n      \` + c.substring(backNavEnd);


// 4. Update CompanyDeskTab Props
const signatureRegex = /function CompanyDeskTab\\(\\{\\s*company,\\s*fleet,\\s*contracts,\\s*playerCash,\\s*characterName,\\s*onRefresh\\s*\\}:\\s*\\{\\s*company:\\s*Company;\\s*fleet:\\s*Vehicle\\[\\];\\s*contracts:\\s*Contract\\[\\];\\s*playerCash:\\s*number;\\s*characterName:\\s*string;\\s*onRefresh:\\s*\\(\\)\\s*=>\\s*void;\\s*\\}\\) \\{/;
c = c.replace(signatureRegex, \`function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onRefresh, onOpenMarket }: { company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string; onRefresh: () => void; onOpenMarket: () => void; }) {\`);

c = c.replace(/<CompanyDeskTab\\s+company=\\{company\\}\\s+fleet=\\{fleet\\}\\s+contracts=\\{companyContracts\\}\\s+playerCash=\\{playerCash\\}\\s+characterName=\\{characterName\\}\\s+onRefresh=\\{onRefresh\\}\\s*\\/>/, 
\`<CompanyDeskTab company={company} fleet={fleet} contracts={companyContracts} playerCash={playerCash} characterName={characterName} onRefresh={onRefresh} onOpenMarket={() => { setActiveTab('market'); setSelectedCompanyId(company.id); }} />\`);


// 5. Inline Fleet -> Inline Fleet (without range)
const fStart = c.indexOf("{deskTab === 'fleet' && (");
const fEnd = c.indexOf("{deskTab === 'contracts' && (");
if (fStart > -1 && fEnd > -1) {
  const newFleetStr = \`{deskTab === 'fleet' && (
        <div className="business-content-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SectionHeader stamp="OPERATIONS">Current Fleet</SectionHeader>
            {fleet.length === 0 ? (
              <PanelBox style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No vehicles in fleet</div>
              </PanelBox>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fleet.map(v => {
                  const maint = v.monthlyMaintenance || 0;
                  return (
                    <div key={v.id} style={{ background: T.panel, border: \\\`1px solid \\\${T.border}\\\`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{v.type}</div>
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: v.condition > 75 ? T.mint : v.condition > 40 ? T.gold : T.red }}>
                          Condition: {v.condition}%
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: T.muted }}>
                        <span>Capacity: <strong style={{ color: T.ivory }}>{v.capacity}</strong></span>
                        <span>Maint: <strong style={{ color: T.red }}>{formatMoney(maint)}/mo</strong></span>
                      </div>
                      <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase' }}>
                        Assignment: {v.assignedContractId ? <span style={{ color: T.mint }}>Active Contract</span> : v.assignedAutoOpPool ? <span style={{ color: T.gold }}>Auto Op ({v.assignedAutoOpPool})</span> : <span style={{ color: T.muted }}>Idle</span>}
                      </div>
                      <div style={{ borderTop: \\\`1px dashed \\\${T.border}\\\`, paddingTop: '12px', display: 'flex', gap: '8px' }}>
                        <GhostButton onClick={() => handleMaintenance(v.id, 'basic')}>Basic Repair (₯5k)</GhostButton>
                        <GhostButton onClick={() => handleMaintenance(v.id, 'full')}>Full Service (₯15k)</GhostButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <PanelBox>
              <SectionHeader stamp="MARKET">Fleet Expansion</SectionHeader>
              <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>
                Expand your operations by acquiring more transport vehicles. New listings are managed centrally via the Business Market.
              </div>
              <GoldButton onClick={onOpenMarket}>Open Vehicle Market</GoldButton>
            </PanelBox>
          </div>
        </div>
      )}

      \`;
  c = c.substring(0, fStart) + newFleetStr + c.substring(fEnd);
}

// 6. Inline Assets -> Inline Facilities + Assets
const aStart = c.indexOf("{deskTab === 'assets' && (");
const aEnd = c.indexOf("{deskTab === 'records' && (");
if (aStart > -1 && aEnd > -1) {
  const newAssetsStr = \`{deskTab === 'facilities' && (
        <FacilitiesTab company={company} onRefresh={onRefresh} showNotif={showNotif} />
      )}

      {deskTab === 'assets' && (
        <AssetsTab company={company} fleet={fleet} setDeskTab={setDeskTab} onOpenMarket={onOpenMarket} />
      )}

      \`;
  c = c.substring(0, aStart) + newAssetsStr + c.substring(aEnd);
}

// 7. Update function AssetsTab and append FacilitiesTab
const fnAssetsStart = c.indexOf('function AssetsTab');
const fnAssetsEnd = c.indexOf('function RegistryTab');
if (fnAssetsStart > -1 && fnAssetsEnd > -1) {
  const newAssetsFuncStr = \`function AssetsTab({ company, fleet, setDeskTab, onOpenMarket }: any) {
  const vehicleAssetValue = fleet.reduce((sum:any, v:any) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  const totalLeasedCost = (company.facilities || []).reduce((sum:any, f:any) => sum + f.leaseCost, 0);

  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Company Assets Portfolio</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Vehicle Asset Value</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.mint, fontWeight: 700 }}>{formatMoney(vehicleAssetValue)}</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{fleet.length} active units</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Facility Lease Position</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.steel, fontWeight: 700 }}>{formatMoney(totalLeasedCost)}/mo</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{(company.facilities || []).length} active leases</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Property Value</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.faint, fontWeight: 700 }}>₯0</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Locked (Land Purchasing)</div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Total Company Asset Value</div>
            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>{formatMoney(calcCompanyValue(company))}</div>
            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Includes cash & depreciated fleet</div>
          </PanelBox>
        </div>

        <SectionHeader>Asset Details</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          <div style={{ border: \\\`1px solid \\\${T.border}\\\`, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Vehicle Assets</div>
            {fleet.length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No vehicles owned.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fleet.map((v:any) => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: \\\`1px dashed \\\${T.border}\\\`, paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: T.muted }}>{v.type} ({v.condition}%)</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.ivory }}>{formatMoney(Math.round(v.purchaseCost * (v.condition / 100)))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ border: \\\`1px solid \\\${T.border}\\\`, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Facility Assets (Leased)</div>
            {(company.facilities || []).length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No facilities leased.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(company.facilities || []).map((f:any, i:number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: \\\`1px dashed \\\${T.border}\\\`, paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: T.muted }}>{f.type} <span style={{ color: T.faint }}>({f.state})</span></span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.steel }}>{formatMoney(f.leaseCost)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ border: \\\`1px solid \\\${T.border}\\\`, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.faint, fontWeight: 700, marginBottom: '12px' }}>Expansion Sites</div>
            <div style={{ fontSize: '11px', color: T.faint }}>Locked (Future construction update).</div>
          </div>
        </div>
      </div>

      <div>
        <PanelBox>
          <SectionHeader stamp="MANAGEMENT">Asset Controls</SectionHeader>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>
            Facilities are managed in the Facilities tab. Vehicle purchases are managed in Fleet or Business Market. This Assets tab serves as your aggregated asset value summary.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GhostButton onClick={() => setDeskTab('facilities')}>Open Facilities</GhostButton>
            <GhostButton onClick={() => setDeskTab('fleet')}>Open Fleet</GhostButton>
            <GhostButton onClick={onOpenMarket}>Open Market</GhostButton>
          </div>
        </PanelBox>
      </div>
    </div>
  );
}

function FacilitiesTab({ company, onRefresh, showNotif }: any) {
  const [selectedStates, setSelectedStates] = React.useState<Record<string, string>>({
    'Office': company.state,
    'Vehicle Yard': company.state,
    'Small Depot': company.state,
    'Warehouse': company.state,
    'Regional Branch Office': company.state,
  });

  const handleLease = (type: any, leaseCost: number) => {
    const state = selectedStates[type] || company.state;
    const alreadyLeased = (company.facilities || []).some((f:any) => f.type === type && f.state === state);
    if (alreadyLeased) {
      showNotif(\`You already lease a \${type} in \${state}.\`, false);
      return;
    }
    const res = leaseFacility(company.id, type, state, leaseCost);
    showNotif(res.message, res.success);
    if (res.success) onRefresh();
  };

  const availableProperties = [
    { type: 'Office', leaseCost: 10000, benefit: 'Provides legitimacy and client trust later.', leaseable: true },
    { type: 'Vehicle Yard', leaseCost: 15000, benefit: '+2 vehicle support capacity in selected state.', leaseable: true },
    { type: 'Small Depot', leaseCost: 25000, benefit: 'Improves local courier and port shuttle operations.', leaseable: true },
    { type: 'Warehouse', leaseCost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.', leaseable: true },
    { type: 'Regional Branch Office', leaseCost: 30000, benefit: 'Expands business presence to another state.', leaseable: true },
    { type: 'Freight Yard', leaseCost: 70000, benefit: 'Supports larger interstate freight and heavy cargo.', leaseable: true },
    { type: 'Port Warehouse', leaseCost: 90000, benefit: 'Improves port shuttle and port freight contracts.', leaseable: true },
    { type: 'Port Terminal', leaseCost: 250000, benefit: 'Coastal and international shipping later.', leaseable: false, note: 'Locked / later' },
  ];

  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Current Facilities</SectionHeader>
        {(company.facilities || []).length === 0 ? (
          <PanelBox style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No facilities leased</div>
          </PanelBox>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {(company.facilities || []).map((f:any, i:number) => (
              <div key={i} style={{ background: T.panel, border: \\\`1px solid \\\${T.border}\\\`, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {f.type}
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: T.faint, padding: '2px 6px', borderRadius: '2px' }}>{f.state}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>Active Lease</div>
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: T.steel, fontWeight: 700 }}>
                  {formatMoney(f.leaseCost)}/mo
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionHeader>Available Facilities</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {availableProperties.map(fac => (
            <div key={fac.type} style={{ background: 'rgba(0,0,0,0.2)', border: \\\`1px solid \\\${T.border}\\\`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{fac.type}</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px', maxWidth: '400px', lineHeight: 1.5 }}>Benefit: {fac.benefit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: fac.leaseable ? T.mint : T.faint, fontWeight: 700 }}>
                    {fac.leaseable ? \\\`\\\${formatMoney(fac.leaseCost)}/mo\\\` : '---'}
                  </div>
                </div>
              </div>
              {fac.leaseable ? (
                <div style={{ borderTop: \\\`1px dashed \\\${T.border}\\\`, paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>State:</span>
                    <select 
                      value={selectedStates[fac.type] || company.state}
                      onChange={e => setSelectedStates({ ...selectedStates, [fac.type]: e.target.value })}
                      style={{ background: T.bg, border: \\\`1px solid \\\${T.border}\\\`, color: T.ivory, fontSize: '11px', padding: '4px 8px', fontFamily: 'monospace' }}
                    >
                      <option value="Drennport State">Drennport State</option>
                      <option value="Westport State">Westport State</option>
                      <option value="Ironvale State">Ironvale State</option>
                    </select>
                  </div>
                  <GhostButton onClick={() => handleLease(fac.type, fac.leaseCost)} color={T.mint}>Lease Facility</GhostButton>
                </div>
              ) : (
                <div style={{ borderTop: \\\`1px dashed \\\${T.border}\\\`, paddingTop: '12px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>
                  {fac.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <PanelBox>
          <SectionHeader stamp="OVERVIEW">Facility Effects</SectionHeader>
          <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6 }}>
            Facilities form the backbone of your operations. Leasing property in different states unlocks regional contracts, increases vehicle capacity, and enables storage/transfer capabilities.
          </div>
        </PanelBox>
      </div>
    </div>
  );
}

\`;
  c = c.substring(0, fnAssetsStart) + newAssetsFuncStr + c.substring(fnAssetsEnd);
}

// 8. Replace MarketTab
const fnMarketStart = c.indexOf('function MarketTab');
const fnMarketEnd = c.indexOf('export default function BusinessPage');
if (fnMarketStart > -1 && fnMarketEnd > -1) {
  const newMarketFuncStr = \`function MarketTab({ playerCash, onRefresh }: { playerCash: number, onRefresh: () => void }) {
  const [subTab, setSubTab] = React.useState<'vehicles'|'property'|'equipment'|'materials'|'contracts'|'shares'>('vehicles');
  const companies = getCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(companies[0]?.id || '');
  const [notification, setNotification] = React.useState<{ msg: string; success: boolean } | null>(null);

  const company = companies.find(c => c.id === selectedCompanyId);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePurchaseVehicle = (spec: any) => {
    if (!company) {
      showNotif('You need an active company before buying business vehicles.', false);
      return;
    }
    const result = purchaseVehicle(company.id, spec.type);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleLease = (type: string, cost: number, state: string) => {
    if (!company) {
      showNotif('You need an active company before leasing business facilities.', false);
      return;
    }
    const result = leaseFacility(company.id, type as any, state, cost);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const lockedTab = (name: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionHeader>{name}</SectionHeader>
      <div style={{ background: 'rgba(0,0,0,0.2)', border: \\\`1px dashed \\\${T.border}\\\`, padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Locked / Coming Later</div>
        <div style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>This market section is not yet available in pre-alpha.</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-6 px-8 py-3 border-b" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
        {[
          { id: 'vehicles', label: 'Vehicles' },
          { id: 'property', label: 'Property' },
          { id: 'equipment', label: 'Equipment 🔒' },
          { id: 'materials', label: 'Materials 🔒' },
          { id: 'contracts', label: 'Contract Exchange 🔒' },
          { id: 'shares', label: 'Company Shares 🔒' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as any)} style={{ color: subTab === t.id ? T.gold : T.muted, borderBottom: subTab === t.id ? \\\`2px solid \\\${T.gold}\\\` : '2px solid transparent', whiteSpace: 'nowrap' }} className="text-[11px] font-mono uppercase tracking-widest pb-1">
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Buy for:</span>
          <select 
            value={selectedCompanyId} 
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="text-[11px] font-mono px-2 py-1 rounded-sm"
            style={{ background: T.panel, color: T.gold, border: \\\`1px solid \\\${T.border}\\\` }}
          >
            <option value="">-- Select Company --</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {notification && (
        <div className="mx-8 mt-6 px-4 py-3 rounded-sm" style={{ background: notification.success ? 'rgba(54, 211, 153, 0.1)' : 'rgba(184, 85, 85, 0.1)', border: \\\`1px solid \\\${notification.success ? T.mint : T.red}\\\` }}>
          <div className="text-sm font-bold" style={{ color: notification.success ? T.mint : T.red }}>
            {notification.success ? 'Success' : 'Notice'}
          </div>
          <div className="text-xs mt-1" style={{ color: T.ivory }}>{notification.msg}</div>
        </div>
      )}

      <div className="business-content-grid p-8 gap-8 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {subTab === 'vehicles' && (
            <>
              <SectionHeader>🚚 New Vehicle Listings</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                {VEHICLE_CATALOGUE.map(spec => {
                  const canAfford = company && company.companyCash >= spec.cost;
                  return (
                    <div key={spec.type} className="p-4 border rounded-sm flex flex-col" style={{ background: T.panel, borderColor: T.border }}>
                      <div className="text-sm font-bold text-ivory mb-1">{spec.type}</div>
                      <div className="text-[11px] text-zinc-400 mb-4">{spec.desc}</div>
                      <div className="flex items-center justify-between mt-auto">
                        <div>
                          <div className="text-sm font-mono font-bold" style={{ color: canAfford ? T.mint : T.red }}>{formatMoney(spec.cost)}</div>
                          <div className="text-[10px] font-mono" style={{ color: T.faint }}>Maint: {formatMoney(spec.maintenance)}/mo</div>
                        </div>
                        <GoldButton onClick={() => handlePurchaseVehicle(spec)}>Order New</GoldButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <SectionHeader>🏷️ Used Vehicle Listings</SectionHeader>
              <div className="p-4 border rounded-sm text-center" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)' }}>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">No used listings currently available on the market.</div>
              </div>

              <SectionHeader>🏭 Player Manufacturing</SectionHeader>
              <div className="p-4 border border-dashed rounded-sm text-center" style={{ borderColor: T.border }}>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Player manufacturing companies will be able to list vehicles here later.</div>
              </div>
            </>
          )}

          {subTab === 'property' && (
            <>
              <SectionHeader>🏢 Available Properties & Facilities</SectionHeader>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { type: 'Office', state: 'Drennport State', cost: 10000, benefit: 'Provides legitimacy and client trust later.' },
                  { type: 'Vehicle Yard', state: 'Drennport State', cost: 15000, benefit: '+2 vehicle support capacity in selected state.' },
                  { type: 'Small Depot', state: 'Drennport State', cost: 25000, benefit: 'Improves local courier and port shuttle operations.' },
                  { type: 'Warehouse', state: 'Westport State', cost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.' },
                  { type: 'Regional Branch Office', state: 'Ironvale State', cost: 30000, benefit: 'Expands business presence to another state.' }
                ].map((fac, i) => {
                  const canAfford = company && company.companyCash >= fac.cost;
                  return (
                    <div key={i} className="flex flex-row items-center justify-between p-4 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                      <div>
                        <div className="text-sm font-bold text-ivory flex items-center gap-2">
                          {fac.type}
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: T.faint }}>{fac.state}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">{fac.benefit}</div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-sm font-mono font-bold" style={{ color: canAfford ? T.mint : T.red }}>{formatMoney(fac.cost)}/mo</div>
                        </div>
                        <GoldButton onClick={() => handleLease(fac.type, fac.cost, fac.state)}>Lease Facility</GoldButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              <SectionHeader>🔒 Locked Markets</SectionHeader>
              <div className="flex gap-4">
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Port Facilities</span></div>
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Land Purchase</span></div>
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Construction</span></div>
              </div>
            </>
          )}

          {subTab === 'equipment' && lockedTab('Equipment Market')}
          {subTab === 'materials' && lockedTab('Materials Market')}
          {subTab === 'contracts' && lockedTab('Contract Exchange')}
          {subTab === 'shares' && lockedTab('Company Shares')}
        </div>

        <div className="flex flex-col gap-6">
          <SectionHeader>📋 Selected Buyer Context</SectionHeader>
          <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
            {company ? (
              <div className="flex flex-col gap-3">
                <FieldRow label="Company" value={company.name} valueColor={T.ivory} />
                <FieldRow label="Cash Available" value={formatMoney(company.companyCash)} valueColor={T.mint} />
                <FieldRow label="Current Status" value={company.status} valueColor={T.steel} />
              </div>
            ) : (
              <div className="text-[11px] font-mono text-zinc-500 italic">No active company selected. Buying disabled.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

\`;
  c = c.substring(0, fnMarketStart) + newMarketFuncStr + c.substring(fnMarketEnd);
}

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Fixed everything final');
