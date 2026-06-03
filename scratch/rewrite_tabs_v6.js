const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// The best way to cleanly rewrite these tabs is to locate them and replace them.
const tStartAssets = c.indexOf('function AssetsTab');
const tEndAssets = c.indexOf('function RecordsTab', tStartAssets); // Assuming RecordsTab is next, wait I'll just check `function` next.

function findFunctionEnd(code, startIndex) {
  let depth = 0;
  let started = false;
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
      depth++;
      started = true;
    }
    if (code[i] === '}') {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return -1;
}

const assetsTabEnd = findFunctionEnd(c, tStartAssets);

const newAssetsTab = `function AssetsTab({ company, fleet, setDeskTab, onOpenMarket }: {
  company: Company; fleet: Vehicle[];
  setDeskTab: (t: CompanyDeskTab) => void;
  onOpenMarket: () => void;
}) {
  const vehicleAssetValue = fleet.reduce((sum, v) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);
  const totalLeasedCost = (company.facilities || []).reduce((sum, f) => sum + f.leaseCost, 0);

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
          <div style={{ border: \`1px solid \${T.border}\`, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Vehicle Assets</div>
            {fleet.length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No vehicles owned.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fleet.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: \`1px dashed \${T.border}\`, paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: T.muted }}>{v.type} ({v.condition}%)</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.ivory }}>{formatMoney(Math.round(v.purchaseCost * (v.condition / 100)))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ border: \`1px solid \${T.border}\`, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Facility Assets (Leased)</div>
            {(company.facilities || []).length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No facilities leased.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(company.facilities || []).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: \`1px dashed \${T.border}\`, paddingBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: T.muted }}>{f.type} <span style={{ color: T.faint }}>({f.state})</span></span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.steel }}>{formatMoney(f.leaseCost)}/mo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ border: \`1px solid \${T.border}\`, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: T.faint, fontWeight: 700, marginBottom: '12px' }}>Expansion Sites</div>
            <div style={{ fontSize: '11px', color: T.faint }}>Locked (Future construction update).</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionHeader>Asset Management</SectionHeader>
        <PanelBox>
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
}`;

c = c.substring(0, tStartAssets) + newAssetsTab + "\n\n" + c.substring(assetsTabEnd);

// Find and replace FleetTab
const tStartFleet = c.indexOf('function FleetTab');
const fleetTabEnd = findFunctionEnd(c, tStartFleet);

const newFleetTab = `function FleetTab({ company, fleet, onRefresh, showNotif, onOpenMarket }: {
  company: Company; fleet: Vehicle[];
  onRefresh: () => void;
  showNotif: (msg: string, success: boolean) => void;
  onOpenMarket: () => void;
}) {
  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Current Fleet</SectionHeader>
        {fleet.length === 0 ? (
          <PanelBox style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No vehicles in fleet</div>
          </PanelBox>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {fleet.map(v => {
              const maint = v.monthlyMaintenance || 0;
              return (
                <div key={v.id} style={{ background: T.panel, border: \`1px solid \${T.border}\`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{v.type}</div>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: v.condition > 75 ? T.mint : v.condition > 40 ? T.gold : T.red }}>
                      Condition: {v.condition}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: T.muted }}>
                    <span>Capacity: <strong style={{ color: T.ivory }}>{v.capacity}</strong></span>
                    <span>Range: <strong style={{ color: T.ivory }}>{v.range}</strong></span>
                    <span>Maint: <strong style={{ color: T.red }}>{formatMoney(maint)}/mo</strong></span>
                  </div>
                  <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase' }}>
                    Assignment: {v.assignedContractId ? <span style={{ color: T.mint }}>Active Contract</span> : v.assignedAutoOpPool ? <span style={{ color: T.gold }}>Auto Op ({v.assignedAutoOpPool})</span> : <span style={{ color: T.muted }}>Idle</span>}
                  </div>
                  <div style={{ borderTop: \`1px dashed \${T.border}\`, paddingTop: '12px', display: 'flex', gap: '8px' }}>
                    <GhostButton onClick={() => {
                      const res = performMaintenance(v.id, 'basic');
                      showNotif(res.message, res.success);
                      if (res.success) onRefresh();
                    }}>Basic Repair (₯5k)</GhostButton>
                    <GhostButton onClick={() => {
                      const res = performMaintenance(v.id, 'full');
                      showNotif(res.message, res.success);
                      if (res.success) onRefresh();
                    }}>Full Service (₯15k)</GhostButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionHeader>Fleet Management</SectionHeader>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>
            Expand your fleet by purchasing new or used vehicles on the business market.
          </div>
          <GoldButton onClick={onOpenMarket}>Open Vehicle Market</GoldButton>
        </PanelBox>
      </div>
    </div>
  );
}`;

c = c.substring(0, tStartFleet) + newFleetTab + "\n\n" + c.substring(fleetTabEnd);

// Create FacilitiesTab and add it right before OperationsTab or anywhere
const newFacilitiesTab = `function FacilitiesTab({ company, onRefresh, showNotif }: {
  company: Company;
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
    const alreadyLeased = (company.facilities || []).some(f => f.type === type && f.state === state);
    if (alreadyLeased) {
      showNotif(\`You already lease a \${type} in \${state}.\`, false);
      return;
    }
    const res = leaseFacility(company.id, type, state, leaseCost);
    showNotif(res.message, res.success);
    if (res.success) onRefresh();
  };

  const availableProperties = [
    { type: 'Office' as const, leaseCost: 10000, benefit: 'Provides legitimacy and client trust later.', leaseable: true },
    { type: 'Vehicle Yard' as const, leaseCost: 15000, benefit: '+2 vehicle support capacity in selected state.', leaseable: true },
    { type: 'Small Depot' as const, leaseCost: 25000, benefit: 'Improves local courier and port shuttle operations.', leaseable: true },
    { type: 'Warehouse' as const, leaseCost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.', leaseable: true },
    { type: 'Regional Branch Office' as const, leaseCost: 30000, benefit: 'Expands business presence to another state.', leaseable: true },
    { type: 'Freight Yard' as const, leaseCost: 70000, benefit: 'Supports larger interstate freight and heavy cargo.', leaseable: true },
    { type: 'Port Warehouse' as const, leaseCost: 90000, benefit: 'Improves port shuttle and port freight contracts.', leaseable: true },
    { type: 'Port Terminal' as const, leaseCost: 250000, benefit: 'Coastal and international shipping later.', leaseable: false, note: 'Locked / later' },
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
            {(company.facilities || []).map((f, i) => (
              <div key={i} style={{ background: T.panel, border: \`1px solid \${T.border}\`, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <div key={fac.type} style={{ background: 'rgba(0,0,0,0.2)', border: \`1px solid \${T.border}\`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{fac.type}</div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px', maxWidth: '400px', lineHeight: 1.5 }}>Benefit: {fac.benefit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: fac.leaseable ? T.mint : T.faint, fontWeight: 700 }}>
                    {fac.leaseable ? \`\${formatMoney(fac.leaseCost)}/mo\` : '---'}
                  </div>
                </div>
              </div>
              {fac.leaseable ? (
                <div style={{ borderTop: \`1px dashed \${T.border}\`, paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>State:</span>
                    <select 
                      value={selectedStates[fac.type] || company.state}
                      onChange={e => setSelectedStates({ ...selectedStates, [fac.type]: e.target.value })}
                      style={{ background: T.bg, border: \`1px solid \${T.border}\`, color: T.ivory, fontSize: '11px', padding: '4px 8px', fontFamily: 'monospace' }}
                    >
                      <option value="Drennport State">Drennport State</option>
                      <option value="Westport State">Westport State</option>
                      <option value="Ironvale State">Ironvale State</option>
                    </select>
                  </div>
                  <GhostButton onClick={() => handleLease(fac.type, fac.leaseCost)} color={T.mint}>Lease Facility</GhostButton>
                </div>
              ) : (
                <div style={{ borderTop: \`1px dashed \${T.border}\`, paddingTop: '12px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>
                  {fac.note}
                </div>
              )}
            </div>
          ))}
        </div>

        <SectionHeader>Construction Projects</SectionHeader>
        <div style={{ background: 'rgba(0,0,0,0.2)', border: \`1px dashed \${T.border}\`, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Locked / Later</div>
          <p style={{ fontSize: '12px', color: T.muted, lineHeight: 1.6, margin: '8px 0 0', maxWidth: '500px', display: 'inline-block' }}>
            Future update: buy land, request construction bids, and hire NPC/player construction companies to build offices, depots, warehouses, freight yards, and terminals.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionHeader>Facility Effects</SectionHeader>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6 }}>
            Facilities form the backbone of your operations. Leasing property in different states unlocks regional contracts, increases vehicle capacity, and enables storage/transfer capabilities.
          </div>
        </PanelBox>
      </div>
    </div>
  );
}`;

c = c + "\n\n" + newFacilitiesTab;

// Update CompanyDeskTab to pass props
// Find <AssetsTab company={company} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} />
// Replace with <AssetsTab company={company} fleet={fleet} setDeskTab={setDeskTab} onOpenMarket={onOpenMarket} />
// Find <FleetTab ... />
// Replace with <FleetTab ... onOpenMarket={onOpenMarket} />

c = c.replace(/function CompanyDeskTab\(\{([^}]*)\}\) \{/g, `function CompanyDeskTab({$1, onOpenMarket}: any) {`);
c = c.replace(/<AssetsTab[^>]*\/>/g, `<AssetsTab company={company} fleet={fleet} setDeskTab={setDeskTab} onOpenMarket={onOpenMarket} />`);
c = c.replace(/<FleetTab[^>]*\/>/g, `<FleetTab company={company} fleet={fleet} onRefresh={onRefresh} showNotif={showNotif} onOpenMarket={onOpenMarket} />`);
c = c.replace(/\{deskTab === 'assets' && \(/g, `{deskTab === 'facilities' && (\n        <FacilitiesTab company={company} onRefresh={onRefresh} showNotif={showNotif} />\n      )}\n      {deskTab === 'assets' && (`);

// Finally, inside BusinessPage where CompanyDeskTab is rendered, pass onOpenMarket
c = c.replace(/<CompanyDeskTab ([^>]*) \/>/g, `<CompanyDeskTab $1 onOpenMarket={() => { setActiveTab('market'); setSelectedCompanyId(company.id); }} />`);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Fixed tabs step 2');
