const fs = require('fs');
let c = fs.readFileSync('scratch/page_backup.tsx', 'utf8');
c = c.replace(/\r\n/g, '\n');

// 1. Add imports
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

// 3. StartBusinessTab layout and Filing Summary Rail
const oldStartBusiness = `function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, onRegister, checkName, chosenCapital, setChosenCapital, selectedModel, setSelectedModel }: any) {`;

const newStartBusiness = oldStartBusiness + `
  const totalCost = 5000 + chosenCapital;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', height: '100%', overflow: 'hidden' }}>
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
`;

// Wrap the current return of StartBusinessTab in the grid column.
// The easiest way is just to replace the `return (` in StartBusinessTab with the new grid layout, and append the right rail before the final `</div>`.
// But it's safer to extract the entire body of StartBusinessTab and rewrite it. Let's just find and replace specific parts.
c = c.replace(oldStartBusiness, `function StartBusinessTab({ step, setStep, selectedSector, setSelectedSector, selectedHQ, setSelectedHQ, companyNameInput, setCompanyNameInput, nameError, setNameError, startError, playerCash, company, onRegister, checkName, chosenCapital, setChosenCapital, selectedModel, setSelectedModel }: any) {
  const totalCost = 5000 + chosenCapital;`);

// We need to inject the layout.
// StartBusinessTab's return starts with:
// return (
//   <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
c = c.replace(
  "return (\\n    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>",
  "return (\\n    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', height: '100%', alignItems: 'start' }}>\\n      <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>"
);

// At the end of StartBusinessTab, before CompanyDeskTab, we inject the right rail and close the grid.
const endOfStart = `          </div>
        </div>
      )}
    </div>
  );
}`;
const rightRail = `          </div>
        </div>
      )}
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
c = c.replace(endOfStart, rightRail);


// 4. CompanyDeskTab & DESK_TABS
c = c.replace(
  "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';",
  "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'procurement' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';"
);

const oldDeskTabs = `const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
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
  ];`;

const newDeskTabs = `const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'procurement',label: 'Procurement'},
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets',     label: 'Assets'     },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];`;

c = c.replace(oldDeskTabs, newDeskTabs);

// 5. Replace MarketTab entirely with ProcurementTab & DrennportExchangeTab
// Since I know exactly what MarketTab looks like, I'll slice it out.
const startMarket = c.indexOf("function MarketTab({");
const endMarket = c.indexOf("function OverviewTab({");

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
          {VEHICLE_CATALOGUE.filter(v => v.type === 'Van' || v.type === 'Light Truck' || v.type === 'Heavy Truck').map(v => (
            <PanelBox key={v.type}>
              <div style={{ fontSize: '10px', color: T.muted, textTransform: 'uppercase', marginBottom: '4px' }}>Drennport Motor Works</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: T.ivory, marginBottom: '12px' }}>{v.type}</div>
              <FieldRow label="Cost" value={formatMoney(v.baseCost)} valueColor={T.red} />
              <FieldRow label="Capacity" value={\`\${v.capacity} Units\`} />
              <FieldRow label="Condition" value="100% (New)" valueColor={T.mint} />
              <div style={{ marginTop: '16px' }}>
                <GoldButton onClick={() => handleOrder(v.type)} disabled={company.companyCash < v.baseCost}>
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
  "{deskTab === 'contracts' && <ContractsTab />}\\n        {deskTab === 'procurement' && <ProcurementTab company={company} onRefresh={onRefresh} showNotif={showNotif} />}"
);

// 7. Update FleetTab
c = c.replace(
  "function FleetTab({ company, fleet, setDeskTab, onRefresh, showNotif }: any)",
  "function FleetTab({ company, fleet, setDeskTab, onRefresh, showNotif }: any)"
);
// In FleetTab, find the header "Fleet Operations" and add the Open Procurement button there instead of handlePurchaseVehicle.
const fleetHeader = `<SectionHeader>Fleet Operations</SectionHeader>`;
c = c.replace(fleetHeader, `<SectionHeader>Fleet Operations</SectionHeader>\\n      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}><GoldButton onClick={() => setDeskTab('procurement')}>◈ Open Procurement</GoldButton></div>`);

// 8. Update FacilitiesTab
// Find `<GoldButton onClick={() => setDeskTab('assets')}>` and replace with procurement
c = c.replace(
  "<GoldButton onClick={() => setDeskTab('assets')}>◈ Acquire Facilities</GoldButton>",
  "<GoldButton onClick={() => setDeskTab('procurement')}>◈ Open Procurement</GoldButton>"
);

// 9. Update Finance Tab
// Inject Owner Capital Movements
const financeEnd = `        </PanelBox>
      </div>
    </div>
  );
}`;
const ownerCapital = `        </PanelBox>
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
c = c.replace(financeEnd, ownerCapital);

// 10. Update Contracts Filters
c = c.replace(
  "['All', 'government', 'npc', 'player'].map",
  "['All', 'Government', 'State-Owned Enterprise', 'NPC Corporation', 'Local Business', 'Private Client'].map"
);
// Note: contract.issuerType capitalization matters. We changed it in businessCore.ts

// 11. Dispatch UX update
// Inside OperationsTab
c = c.replace(
  "<GoldButton onClick={handleRunOps} disabled={!company.activeContracts || company.activeContracts.length === 0}>",
  "<GoldButton onClick={handleRunOps}>"
);
// In handleRunOps, add logic:
const oldHandleRunOps = `const handleRunOps = () => {
      const result = runMonthlyAutoOperations(company.id);
      showNotif(result.message, result.success);
      if (result.success) onRefresh();
    };`;
const newHandleRunOps = `const handleRunOps = () => {
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
console.log("Success");
