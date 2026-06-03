const fs = require('fs');

let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Imports (replace using precise index)
c = c.replace(
  "import { useRouter } from 'next/navigation';",
  "import { useRouter } from 'next/navigation';\nimport { getGameDate, formatGameDate, injectCapital, ownerDrawings } from '../../../lib/businessCore';"
);

// 2. SubTabs
c = c.replace(
  "type SubTab = 'overview' | 'start' | 'companies' | 'market' | 'registry';",
  "type SubTab = 'overview' | 'start' | 'companies' | 'exchange' | 'registry';"
);
c = c.replace(
  "{ id: 'market',     label: 'Market' },",
  "{ id: 'exchange',   label: 'Drennport Exchange' },"
);

// 3. StartBusinessTab layout and right rail
const startBusDecl = "function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, onRegister, checkName, chosenCapital, setChosenCapital, selectedModel, setSelectedModel }: any) {";

// Find the index of StartBusinessTab
let startBusIdx = c.indexOf(startBusDecl);
if (startBusIdx !== -1) {
  // Find the first "return (" after this index
  let retIdx = c.indexOf("return (", startBusIdx);
  if (retIdx !== -1) {
    let preReturn = c.substring(0, retIdx);
    // Add totalCost calculation
    preReturn += "  const totalCost = 5000 + chosenCapital;\n  ";
    
    // Find the NEXT return ( which belongs to the next component `CompanyDeskTab`) to know where StartBusinessTab ends
    let nextCompIdx = c.indexOf("function CompanyDeskTab", retIdx);
    
    // The closing brace of StartBusinessTab is just before nextCompIdx
    let startBusBody = c.substring(retIdx, nextCompIdx);
    
    // Replace the opening div inside the return of StartBusinessTab
    startBusBody = startBusBody.replace(
      "return (\n    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>",
      "return (\n    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', height: '100%', alignItems: 'start' }}>\n      <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>"
    );
    
    // Inject the right rail right before the last closing div of StartBusinessTab
    // The last few lines of StartBusinessTab look like:
    //       )}
    //     </div>
    //   );
    // }
    
    const oldEnd = `      )}
    </div>
  );
}`;
    const newEnd = `      )}
      </div>

      {/* Right Rail - Filing Summary */}
      <div style={{ borderLeft: \`1px solid \${T.border}\`, paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase', color: T.gold, letterSpacing: '0.15em', borderBottom: \`1px solid \${T.border}\`, paddingBottom: '8px' }}>
          Filing Summary
        </div>
        <FieldRow label="Company Name" value={companyNameInput || 'TBD'} />
        <FieldRow label="Legal Structure" value="Sole Trader" />
        <FieldRow label="Sector" value={selectedSector || 'TBD'} />
        <FieldRow label="Headquarters" value={selectedHQ || 'TBD'} />
        <FieldRow label="Operating Model" value={selectedModel || 'TBD'} valueColor={T.gold} />
        <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor={T.mint} />
        <FieldRow label="Total Cost" value={formatMoney(totalCost)} valueColor={T.red} />
        <FieldRow label="Remaining Cash" value={formatMoney(playerCash - totalCost)} valueColor={T.ivory} />
        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(54, 211, 153, 0.05)', border: \`1px dashed \${T.mint}\` }}>
          <div style={{ fontSize: '10px', color: T.mint, textTransform: 'uppercase', marginBottom: '8px' }}>Recommendation</div>
          <div style={{ fontSize: '11px', color: T.ivory, lineHeight: 1.5 }}>After filing, your first step should be to visit the Procurement desk to acquire your first operational vehicle.</div>
        </div>
      </div>

    </div>
  );
}`;
    // Replace only the LAST occurrence in startBusBody
    let lastIndex = startBusBody.lastIndexOf(oldEnd);
    if (lastIndex !== -1) {
      startBusBody = startBusBody.substring(0, lastIndex) + newEnd + startBusBody.substring(lastIndex + oldEnd.length);
    }
    
    c = preReturn + startBusBody + c.substring(nextCompIdx);
  }
}

// 4. CompanyDeskTab & DESK_TABS
c = c.replace(
  "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';",
  "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'procurement' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';"
);
c = c.replace(
  "{ id: 'contracts',  label: 'Contracts'  },",
  "{ id: 'contracts',  label: 'Contracts'  },\n    { id: 'procurement',label: 'Procurement'},"
);

// 5. Replace MarketTab with ProcurementTab & DrennportExchangeTab
let startMarket = c.indexOf("function MarketTab({");
let endMarket = c.indexOf("function OverviewTab({");
if (startMarket !== -1 && endMarket !== -1) {
  const newTabsCode = `
// ─── PROCUREMENT TAB ──────────────────────────────────────────────────────────
function ProcurementTab({ company, onRefresh, showNotif }: any) {
  const [procTab, setProcTab] = useState<'orders' | 'used' | 'facilities'>('orders');

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
  c = c.substring(0, startMarket) + newTabsCode + c.substring(endMarket);
}

// 6. Update rendering logic in Main Component
c = c.replace(
  "{activeTab === 'market' && <MarketTab playerCash={playerCash} onRefresh={handleRefresh} />}",
  "{activeTab === 'exchange' && <DrennportExchangeTab />}"
);

c = c.replace(
  "{deskTab === 'contracts' && <ContractsTab />}",
  "{deskTab === 'contracts' && <ContractsTab />}\n        {deskTab === 'procurement' && <ProcurementTab company={company} onRefresh={onRefresh} showNotif={showNotif} />}"
);

// 7. Update FleetTab
c = c.replace(
  "<SectionHeader>Fleet Operations</SectionHeader>",
  "<SectionHeader>Fleet Operations</SectionHeader>\n      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}><GoldButton onClick={() => setDeskTab('procurement')}>◈ Open Procurement</GoldButton></div>"
);

// 8. Update FacilitiesTab
c = c.replace(
  "<GoldButton onClick={() => setDeskTab('assets')}>◈ Acquire Facilities</GoldButton>",
  "<GoldButton onClick={() => setDeskTab('procurement')}>◈ Open Procurement</GoldButton>"
);

// 9. Update Finance Tab
let financeEnd = `        </PanelBox>
      </div>
    </div>
  );
}`;
let ownerCapital = `        </PanelBox>
      </div>

      <SectionHeader>Owner Capital Movement</SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <PanelBox>
          <div style={{ fontSize: '12px', color: T.gold, marginBottom: '8px' }}>Inject Capital</div>
          <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Transfer personal funds into the company. Current Personal Cash: {formatMoney(playerCash)}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <GoldButton onClick={() => {
              const res = injectCapital(company.id, 10000, { cash: playerCash });
              alert(res.message);
              window.dispatchEvent(new Event('player-cash-changed'));
            }}>+ {formatMoney(10000)}</GoldButton>
            <GoldButton onClick={() => {
              const res = injectCapital(company.id, 50000, { cash: playerCash });
              alert(res.message);
              window.dispatchEvent(new Event('player-cash-changed'));
            }}>+ {formatMoney(50000)}</GoldButton>
          </div>
        </PanelBox>
        <PanelBox>
          <div style={{ fontSize: '12px', color: T.gold, marginBottom: '8px' }}>Owner Drawings</div>
          <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Withdraw company funds to your personal account.</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <GhostButton onClick={() => {
              const res = ownerDrawings(company.id, 10000, { cash: playerCash });
              alert(res.message);
              window.dispatchEvent(new Event('player-cash-changed'));
            }}>- {formatMoney(10000)}</GhostButton>
            <GhostButton onClick={() => {
              const res = ownerDrawings(company.id, 50000, { cash: playerCash });
              alert(res.message);
              window.dispatchEvent(new Event('player-cash-changed'));
            }}>- {formatMoney(50000)}</GhostButton>
          </div>
        </PanelBox>
      </div>

    </div>
  );
}`;
let financeIdx = c.lastIndexOf("function EquityTab");
if (financeIdx !== -1) {
  let sub = c.substring(0, financeIdx);
  let lastFinanceEnd = sub.lastIndexOf(financeEnd);
  if (lastFinanceEnd !== -1) {
    c = sub.substring(0, lastFinanceEnd) + ownerCapital + c.substring(financeIdx);
  }
}

// 10. Update Contracts Filters
c = c.replace(
  "['All', 'government', 'npc', 'player'].map",
  "['All', 'Government', 'State-Owned Enterprise', 'NPC Corporation', 'Local Business', 'Private Client'].map"
);

c = c.replace(/c\.issuerType === 'npc'/g, "c.issuerType === 'NPC Corporation' || c.issuerType === 'Local Business'");

// 11. Dispatch UX update
c = c.replace(
  "<GoldButton onClick={handleRunOps} disabled={!company.activeContracts || company.activeContracts.length === 0}>",
  "<GoldButton onClick={handleRunOps}>"
);
let oldHandleRunOps = `const handleRunOps = () => {
      const result = runMonthlyAutoOperations(company.id);
      showNotif(result.message, result.success);
      if (result.success) onRefresh();
    };`;
let newHandleRunOps = `const handleRunOps = () => {
      if (fleet.length === 0) {
        showNotif('No vehicles available for operations. Acquire vehicles in Procurement.', false);
        return;
      }
      const result = runMonthlyAutoOperations(company.id);
      showNotif(result.message, result.success);
      onRefresh();
    };`;
c = c.replace(oldHandleRunOps, newHandleRunOps);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log("Robust rewrite success");
