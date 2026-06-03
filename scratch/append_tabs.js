const fs = require('fs');

let p = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

const newTabsCode = `
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
      <div style={{ display: 'flex', gap: '16px', borderBottom: \`1px solid \${T.border}\`, paddingBottom: '16px' }}>
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
              <FieldRow label="Capacity" value={\`\${v.capacity} Units\`} />
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
      <div style={{ background: T.panel, border: \`1px solid \${T.border}\` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', color: T.muted, borderBottom: \`1px solid \${T.border}\`, textAlign: 'left', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px' }}>Ticker</th>
              <th style={{ padding: '12px' }}>Entity</th>
              <th style={{ padding: '12px' }}>Sector</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Share Price</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: \`1px solid \${T.border}\` }}>
              <td style={{ padding: '12px', color: T.gold, fontFamily: 'monospace' }}>DCB</td>
              <td style={{ padding: '12px', color: T.ivory }}>Drennport Commercial Bank</td>
              <td style={{ padding: '12px', color: T.muted }}>Finance</td>
              <td style={{ padding: '12px', textAlign: 'right', color: T.ivory }}>{formatMoney(1450)}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}><GhostButton>Trade (🔒)</GhostButton></td>
            </tr>
            <tr style={{ borderBottom: \`1px solid \${T.border}\` }}>
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

      <div style={{ background: 'rgba(0,0,0,0.2)', border: \`1px dashed \${T.border}\`, padding: '24px', textAlign: 'center', marginTop: '16px' }}>
        <div style={{ color: T.muted, fontSize: '12px' }}>Public stock trading, corporate bonds, and IPO mechanics are locked in this build.</div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', p + '\n' + newTabsCode);
console.log('Appended');
