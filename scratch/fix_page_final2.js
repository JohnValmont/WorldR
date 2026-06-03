const fs = require('fs');

let p = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Fix NPC filter
p = p.replace(
  /if \(contractFilter === 'NPC Public'\) filteredContracts = filteredContracts\.filter\(c => c\.issuerType === 'npc'\);/g,
  \`if (contractFilter === 'NPC Public') filteredContracts = filteredContracts.filter(c => c.issuerType === 'NPC Corporation' || c.issuerType === 'Local Business');\`
);

// 2. Fix activeTab === 'market'
p = p.replace(
  /\{activeTab === 'market' && <MarketTab playerCash=\{playerCash\} onRefresh=\{refreshAll\} \/>\}/g,
  \`{activeTab === 'exchange' && <DrennportExchangeTab />}\`
);
p = p.replace(
  /\{activeTab === 'market' && <MarketTab playerCash=\{playerCash\} onRefresh=\{handleRefresh\} \/>\}/g,
  \`{activeTab === 'exchange' && <DrennportExchangeTab />}\`
);

// 3. Update CompanyDeskTab type
p = p.replace(
  /type CompanyDeskTab = 'overview' \| 'operations' \| 'contracts' \| 'facilities' \| 'assets' \| 'fleet' \| 'routes' \| 'finance' \| 'contractHistory' \| 'records' \| 'equity';/g,
  \`type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'procurement' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';\`
);

// 4. Update DESK_TABS
p = p.replace(
  /\{ id: 'contracts',\s+label: 'Contracts'\s+\},\s+\{\s+id: 'facilities',\s+label: 'Facilities'\s+\},/g,
  \`{ id: 'contracts',  label: 'Contracts'  },
    { id: 'procurement',label: 'Procurement'},
    { id: 'facilities', label: 'Facilities' },\`
);

// 5. Update render logic for deskTab
p = p.replace(
  /\{deskTab === 'contracts' && <ContractsTab \/>\}\s*\{deskTab === 'facilities' && <FacilitiesTab \/>\}/g,
  \`{deskTab === 'contracts' && <ContractsTab />}
        {deskTab === 'procurement' && <ProcurementTab company={company} onRefresh={onRefresh} showNotif={showNotif} />}
        {deskTab === 'facilities' && <FacilitiesTab />}\`
);

// 6. Add procurement button to FleetTab
p = p.replace(
  /function FleetTab\(\{ fleet, setDeskTab \}: any\) \{\s*return \(\s*<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '16px' \}\}>\s*<SectionHeader>Fleet Operations<\/SectionHeader>/g,
  \`function FleetTab({ fleet, setDeskTab }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader>Fleet Operations</SectionHeader>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}><GoldButton onClick={() => setDeskTab('procurement')}>◈ Open Procurement</GoldButton></div>\`
);

// 7. Update FacilitiesTab button to point to procurement instead of assets
p = p.replace(
  /<GoldButton onClick=\{\(\) => setDeskTab\('assets'\)\}>◈ Acquire Facilities<\/GoldButton>/g,
  \`<GoldButton onClick={() => setDeskTab('procurement')}>◈ Open Procurement</GoldButton>\`
);

// 8. Add capital logic in FinanceTab
p = p.replace(
  /<FieldRow label="Last Month Profit" value=\{formatMoney\(company\.profit\)\} valueColor=\{company\.profit >= 0 \? T\.mint : T\.red\} \/>/g,
  \`<FieldRow label="Last Month Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <GoldButton onClick={() => {
            const amountStr = prompt('Amount to inject into company?');
            if (amountStr) {
              const amount = parseInt(amountStr);
              if (amount > 0) {
                const res = require('../../../../lib/businessCore').injectCapital(company.id, amount);
                alert(res.message);
                if (res.success) window.location.reload();
              }
            }
          }}>Inject Capital</GoldButton>
          <GhostButton onClick={() => {
            const amountStr = prompt('Amount to withdraw to personal cash?');
            if (amountStr) {
              const amount = parseInt(amountStr);
              if (amount > 0) {
                const res = require('../../../../lib/businessCore').ownerDrawings(company.id, amount);
                alert(res.message);
                if (res.success) window.location.reload();
              }
            }
          }}>Owner Drawings</GhostButton>
        </div>\`
);

// Append Components
const newTabsCode = \`
// ─── PROCUREMENT TAB ──────────────────────────────────────────────────────────
function ProcurementTab({ company, onRefresh, showNotif }: any) {
  const [procTab, setProcTab] = React.useState<'orders' | 'used' | 'facilities'>('orders');

  const handleOrder = (type: any) => {
    const result = purchaseVehicle(company.id, type);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleLease = (type: string, cost: number, state: string) => {
    const result = leaseFacility(company.id, type as any, state, cost);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '16px', borderBottom: \\\`1px solid \\\${T.border}\\\`, paddingBottom: '16px' }}>
        <button onClick={() => setProcTab('orders')} style={{ background: 'none', border: 'none', color: procTab === 'orders' ? T.gold : T.muted, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px' }}>New Vehicle Orders</button>
        <button onClick={() => setProcTab('used')} style={{ background: 'none', border: 'none', color: procTab === 'used' ? T.gold : T.muted, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px' }}>Used Market (🔒)</button>
        <button onClick={() => setProcTab('facilities')} style={{ background: 'none', border: 'none', color: procTab === 'facilities' ? T.gold : T.muted, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px' }}>Facility Leasing</button>
      </div>

      {procTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {VEHICLE_CATALOGUE.map(v => (
            <PanelBox key={v.type}>
              <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Drennport Motor Works</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>{v.type}</div>
              <FieldRow label="Cost" value={formatMoney(v.cost)} valueColor={T.red} />
              <FieldRow label="Capacity" value={\\\`\\\${v.capacity} Units\\\`} />
              <FieldRow label="Condition" value="100% (New)" valueColor={T.mint} />
              <div style={{ marginTop: '16px' }}>
                <GoldButton onClick={() => handleOrder(v.type)} disabled={company.companyCash < v.cost}>
                  Order Vehicle
                </GoldButton>
              </div>
            </PanelBox>
          ))}
        </div>
      )}

      {procTab === 'used' && (
        <PanelBox>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: T.gold, marginBottom: '8px' }}>Used Vehicle Market Locked</div>
            <div style={{ color: T.muted, fontSize: '12px' }}>Check back later for discounted, lower-condition fleet additions.</div>
          </div>
        </PanelBox>
      )}

      {procTab === 'facilities' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <PanelBox>
            <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '4px' }}>Drennport Small Depot</div>
            <p style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>Local storage for up to 3 vehicles.</p>
            <FieldRow label="Monthly Lease" value={formatMoney(15000)} valueColor={T.red} />
            <FieldRow label="Vehicle Slots" value="3" />
            <div style={{ marginTop: '16px' }}>
              <GoldButton onClick={() => handleLease('Small Depot', 15000, 'Drennport State')} disabled={company.companyCash < 15000}>
                Sign Lease
              </GoldButton>
            </div>
          </PanelBox>
          <PanelBox>
            <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '4px' }}>Westport Medium Yard</div>
            <p style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>Standard logistics yard with basic maintenance facilities.</p>
            <FieldRow label="Monthly Lease" value={formatMoney(45000)} valueColor={T.red} />
            <FieldRow label="Vehicle Slots" value="10" />
            <div style={{ marginTop: '16px' }}>
              <GoldButton onClick={() => handleLease('Medium Yard', 45000, 'Westport State')} disabled={company.companyCash < 45000}>
                Sign Lease
              </GoldButton>
            </div>
          </PanelBox>
        </div>
      )}
    </div>
  );
}

// ─── DRENNPORT EXCHANGE TAB ─────────────────────────────────────────────────
function DrennportExchangeTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      <SectionHeader stamp="MARKET STATUS: OPEN">Drennport Exchange</SectionHeader>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>National Index</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: T.mint }}>14,204.50</div>
          <div style={{ fontSize: '12px', color: T.mint }}>+ 1.2% (Past Quarter)</div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Drennia Govt Bonds (10Y)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: T.ivory }}>4.25%</div>
          <div style={{ fontSize: '12px', color: T.faint }}>Stable</div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Total Listed Entities</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: T.gold }}>42</div>
          <div style={{ fontSize: '12px', color: T.muted }}>8 State-Owned, 34 Private</div>
        </PanelBox>
      </div>

      <SectionHeader>Listed Corporations & State Enterprises</SectionHeader>
      <div style={{ background: T.panel, border: \\\`1px solid \\\${T.border}\\\` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', color: T.muted, borderBottom: \\\`1px solid \\\${T.border}\\\`, textAlign: 'left', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px' }}>Ticker</th>
              <th style={{ padding: '12px' }}>Entity</th>
              <th style={{ padding: '12px' }}>Sector</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Share Price</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: \\\`1px solid \\\${T.border}\\\` }}>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>DCB</td>
              <td style={{ padding: '12px', color: T.ivory }}>Drennport Commercial Bank</td>
              <td style={{ padding: '12px', color: T.muted }}>Finance</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(1450)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
            <tr style={{ borderBottom: \\\`1px solid \\\${T.border}\\\` }}>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>WDA</td>
              <td style={{ padding: '12px', color: T.ivory }}>Westport Dock Authority</td>
              <td style={{ padding: '12px', color: T.muted }}>SOE / Port</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(890)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
            <tr>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>DRF</td>
              <td style={{ padding: '12px', color: T.ivory }}>Drennia Rail Freight</td>
              <td style={{ padding: '12px', color: T.muted }}>SOE / Logistics</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(2100)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', border: \\\`1px dashed \\\${T.border}\\\`, padding: '24px', textAlign: 'center', marginTop: '16px' }}>
        <div style={{ color: T.muted, fontSize: '12px' }}>Public stock trading, corporate bonds, and IPO mechanics are locked in this build.</div>
      </div>
    </div>
  );
}
\`

if (!p.includes('function ProcurementTab')) {
  p += '\n' + newTabsCode;
}

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', p);
console.log('Fixed page.tsx');
