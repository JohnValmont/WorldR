const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove MarketTab
let mTabStart = code.indexOf('function MarketTab(');
let mTabEnd = code.indexOf('export default function BusinessPage() {');
if (mTabStart !== -1 && mTabEnd !== -1) {
  code = code.slice(0, mTabStart) + code.slice(mTabEnd);
}

// 2. Add SUB_TABS
code = code.replace(/const SUB_TABS: \{ id: SubTab; label: string; requiresCompany\?: boolean \}\[\] = \[\s*\];/, `const SUB_TABS: { id: SubTab; label: string; requiresCompany?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'start', label: 'Start Business' },
  { id: 'companies', label: 'My Companies', requiresCompany: true },
  { id: 'exchange', label: 'Drennport Exchange' },
  { id: 'registry', label: 'Registry' }
];`);

// 3. Update DESK_TABS inside CompanyDeskTab
let dTabStart = code.indexOf(`const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [`);
let dTabEnd = code.indexOf(`  ];`, dTabStart) + 4;
code = code.slice(0, dTabStart) + 
`const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'contracts',  label: 'Contracts' },
    { id: 'procurement',label: 'Procurement' },
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets',     label: 'Assets'     },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];` + code.slice(dTabEnd);

// 4. Add procurementSubTab state
let searchStateIdx = code.indexOf(`const [contractSearch, setContractSearch] = useState<string>('');`);
let afterSearchState = searchStateIdx + `const [contractSearch, setContractSearch] = useState<string>('');`.length;
code = code.slice(0, afterSearchState) + `\n  const [procurementSubTab, setProcurementSubTab] = useState<'vehicles'|'used'|'facilities'|'equipment'|'materials'|'suppliers'>('vehicles');` + code.slice(afterSearchState);

// 5. Add DrennportExchangeTab
const exchangeCode = `// ─────────────────────────────────────────────────────────────────────────────
// DRENNPORT EXCHANGE TAB
// ─────────────────────────────────────────────────────────────────────────────
function DrennportExchangeTab() {
  return (
    <div style={{ maxWidth: '1000px', paddingBottom: '40px' }}>
      <SectionHeader stamp="MARKET STATUS">Drennport Stock Exchange</SectionHeader>
      <PanelBox style={{ marginBottom: '24px', background: 'rgba(54, 211, 153, 0.05)', border: '1px solid ' + T.mint }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: T.ivory }}>DSE Operating Normally</div>
            <div style={{ fontSize: '11px', color: T.mint, marginTop: '4px' }}>Indices Active • Corporate Bonds Issuing</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint }}>MARKET LIQUIDITY</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: T.gold }}>HIGH</div>
          </div>
        </div>
      </PanelBox>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <PanelBox>
          <SectionHeader>Public Entities (NPC)</SectionHeader>
          <FieldRow label="Crownbridge Retailers" value="Pre-IPO" valueColor={T.gold} />
          <FieldRow label="Kovath Ironworks" value="Pre-IPO" valueColor={T.gold} />
          <FieldRow label="Greenmere Fresh Supply" value="Private" valueColor={T.faint} />
          <FieldRow label="Saltgate Counting House" value="Private" valueColor={T.faint} />
        </PanelBox>
        <PanelBox>
          <SectionHeader>State-Owned Enterprises</SectionHeader>
          <FieldRow label="Drennport State Railways" value="Bond Issue Only" valueColor={T.muted} />
          <FieldRow label="Westport Dock Authority" value="Bond Issue Only" valueColor={T.muted} />
        </PanelBox>
      </div>

      <SectionHeader stamp="INSTRUMENTS">Future Exchange Instruments</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Government Bonds', desc: 'Low-yield, zero-risk instruments issued by the Drennia Government.' },
          { label: 'Treasury Bills', desc: 'Short-term debt instruments for liquidity management.' },
          { label: 'NPC Listed Companies', desc: 'Buy shares in major NPC corporations.' },
          { label: 'State-Owned Enterprise Shares', desc: 'Partial privatisations of state assets.' },
          { label: 'Player Public Companies', desc: 'List your own company and raise capital from the market.' },
          { label: 'Market Indices', desc: 'Track the performance of sectors like Logistics and Manufacturing.' },
        ].map(inst => (
          <div key={inst.label} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed ' + T.border }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{inst.label} <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.gold, marginLeft: '8px' }}>LOCKED</span></div>
            <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>{inst.desc}</div>
          </div>
        ))}
      </div>
      
      <PanelBox>
        <SectionHeader>My Portfolio</SectionHeader>
        <div style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: '12px' }}>
          Brokerage accounts are currently unavailable.
        </div>
      </PanelBox>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY TAB`;
code = code.replace(/\/\/ ─────────────────────────────────────────────────────────────────────────────\r?\n\/\/ REGISTRY TAB/g, exchangeCode);

// 6. Update FinanceTab
let financeStart = code.indexOf(`{deskTab === 'finance' && (`);
let financeEnd = code.indexOf(`{deskTab === 'contractHistory' && (`);
if (financeStart !== -1 && financeEnd !== -1) {
  const newFinanceTabCode = `{deskTab === 'finance' && (
        <div className="business-content-grid">
          <div>
            <SectionHeader>Finance Desk</SectionHeader>
            <PanelBox style={{ marginBottom: '24px' }}>
              <SectionHeader stamp="LEDGER">Company Financials</SectionHeader>
              <FieldRow label="Available Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              <FieldRow label="Monthly Operating Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
              <FieldRow label="Outstanding Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.burgundy : T.muted} />
            </PanelBox>
            
            <SectionHeader stamp="OWNERSHIP">Owner Capital Movement</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <PanelBox>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Inject Capital</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', minHeight: '34px' }}>Transfer personal cash into the company's ledger.</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" id="inject-amount" placeholder="₯ Amount" style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.mint, fontSize: '12px' }} />
                  <GoldButton onClick={() => {
                    const el = document.getElementById('inject-amount');
                    if (el && el.value) {
                      const amount = parseInt(el.value);
                      if (amount > 0) {
                        const { injectCapital } = require('@/lib/businessCore');
                        const res = injectCapital(company.id, amount);
                        showNotif(res.message, res.success);
                        if (res.success) { el.value = ''; onRefresh(); }
                      }
                    }
                  }}>Inject</GoldButton>
                </div>
              </PanelBox>
              <PanelBox>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>Owner Drawings</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', minHeight: '34px' }}>Withdraw company cash to your personal holdings.</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" id="withdraw-amount" placeholder="₯ Amount" style={{ flex: 1, padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.gold, fontSize: '12px' }} />
                  <GhostButton color={T.gold} onClick={() => {
                    const el = document.getElementById('withdraw-amount');
                    if (el && el.value) {
                      const amount = parseInt(el.value);
                      if (amount > 0) {
                        const { withdrawOwnerDrawings } = require('@/lib/businessCore');
                        const res = withdrawOwnerDrawings(company.id, amount);
                        showNotif(res.message, res.success);
                        if (res.success) { el.value = ''; onRefresh(); }
                      }
                    }
                  }}>Withdraw</GhostButton>
                </div>
              </PanelBox>
            </div>

            <SectionHeader stamp="LENDING">Debt & Financing</SectionHeader>
            <PanelBox>
              <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed ' + T.border, background: 'rgba(255,255,255,0.02)', color: T.muted, fontSize: '12px' }}>
                Bank loans, corporate bonds, and credit facilities are currently unavailable.
              </div>
            </PanelBox>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Performance</SectionHeader>
              <FieldRow label="Company Value" value={formatMoney(calcCompanyValue(company))} valueColor={T.gold} />
              <FieldRow label="Last Month Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
              <FieldRow label="Credit Rating" value="Unrated" />
            </PanelBox>
            <PanelBox>
              <SectionHeader>Your Personal Finances</SectionHeader>
              <FieldRow label="Cash in Hand" value={formatMoney(playerCash)} valueColor={T.ivory} />
              <FieldRow label="Net Worth" value={formatMoney(playerCash + calcCompanyValue(company))} valueColor={T.gold} />
            </PanelBox>
          </div>
        </div>
      )}

      `;
  code = code.slice(0, financeStart) + newFinanceTabCode + code.slice(financeEnd);
}

// 7. Add ProcurementTab just before Facilities
let facStart = code.indexOf(`{deskTab === 'facilities' && (`);
if (facStart !== -1) {
  const procurementTabCode = `{deskTab === 'procurement' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingBottom: '16px', borderBottom: '1px solid ' + T.border, marginBottom: '24px', overflowX: 'auto' }}>
            {[
              { id: 'vehicles', label: 'Vehicle Orders' },
              { id: 'used', label: 'Used Market' },
              { id: 'facilities', label: 'Facility Leasing' },
              { id: 'equipment', label: 'Equipment 🔒' },
              { id: 'materials', label: 'Materials 🔒' },
              { id: 'suppliers', label: 'Suppliers 🔒' },
            ].map(t => (
              <button key={t.id} onClick={() => setProcurementSubTab(t.id as any)} style={{ color: procurementSubTab === t.id ? T.gold : T.muted, borderBottom: procurementSubTab === t.id ? '2px solid ' + T.gold : '2px solid transparent', whiteSpace: 'nowrap', paddingBottom: '4px', background: 'transparent', border: 'none', borderBottom: procurementSubTab === t.id ? '2px solid ' + T.gold : '2px solid transparent', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="business-content-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {procurementSubTab === 'vehicles' && (
                <>
                  <SectionHeader stamp="PROCURE">New Vehicle Listings</SectionHeader>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {VEHICLE_CATALOGUE.map((spec, i) => {
                      const canAfford = company && company.companyCash >= spec.cost;
                      return (
                        <PanelBox key={i}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: T.ivory, marginBottom: '4px' }}>{spec.type}</div>
                          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px', minHeight: '34px' }}>{spec.desc}</div>
                          <FieldRow label="Capacity" value={spec.capacity} />
                          <FieldRow label="Maint /mo" value={formatMoney(spec.maintenance)} valueColor={T.red} />
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: canAfford ? T.mint : T.red }}>{formatMoney(spec.cost)}</div>
                            <GoldButton onClick={() => handleBuyVehicle(spec.type as any)} disabled={!canAfford}>Order New</GoldButton>
                          </div>
                        </PanelBox>
                      );
                    })}
                  </div>
                </>
              )}
              {procurementSubTab === 'used' && (
                <>
                  <SectionHeader stamp="USED MARKET">Player Used Market</SectionHeader>
                  <PanelBox style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No used listings currently available on the market.</div>
                  </PanelBox>
                </>
              )}
              {procurementSubTab === 'facilities' && (
                <>
                  <SectionHeader stamp="PROPERTIES">Available Properties & Facilities</SectionHeader>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    {[
                      { type: 'Office', state: 'Drennport State', cost: 10000, benefit: 'Provides legitimacy and client trust later.' },
                      { type: 'Vehicle Yard', state: 'Drennport State', cost: 15000, benefit: '+2 vehicle support capacity in selected state.' },
                      { type: 'Small Depot', state: 'Drennport State', cost: 25000, benefit: 'Improves local courier and port shuttle operations.' },
                      { type: 'Warehouse', state: 'Westport State', cost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.' },
                      { type: 'Regional Branch Office', state: 'Ironvale State', cost: 30000, benefit: 'Expands business presence to another state.' }
                    ].map((fac, i) => {
                      const canAfford = company && company.companyCash >= fac.cost;
                      return (
                        <PanelBox key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {fac.type}
                                <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: T.faint, borderRadius: '2px' }}>{fac.state}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>{fac.benefit}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: canAfford ? T.mint : T.red }}>{formatMoney(fac.cost)}/mo</div>
                              <GoldButton onClick={() => {
                                const { leaseFacility } = require('@/lib/businessCore');
                                const res = leaseFacility(company.id, fac.type as any, fac.state, fac.cost);
                                showNotif(res.message, res.success);
                                if (res.success) onRefresh();
                              }} disabled={!canAfford}>Lease</GoldButton>
                            </div>
                          </div>
                        </PanelBox>
                      );
                    })}
                  </div>
                </>
              )}
              {['equipment', 'materials', 'suppliers'].includes(procurementSubTab) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <SectionHeader>{procurementSubTab.charAt(0).toUpperCase() + procurementSubTab.slice(1)} Market</SectionHeader>
                  <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed ' + T.border, padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Locked / Coming Later</div>
                    <div style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>This market section is not yet available in pre-alpha.</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SectionHeader>Buyer Context</SectionHeader>
              <PanelBox>
                <FieldRow label="Company" value={company.name} valueColor={T.ivory} />
                <FieldRow label="Cash Available" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              </PanelBox>
            </div>
          </div>
        </div>
      )}

      `;
  code = code.slice(0, facStart) + procurementTabCode + code.slice(facStart);
}

// 8. Update Contracts filter select and logic
let cSelectStart = code.indexOf(`<select \n                value={contractFilter}`);
if (cSelectStart !== -1) {
  let cSelectEnd = code.indexOf(`</select>`, cSelectStart) + 9;
  const newContractSelect = `<select 
                value={contractFilter} 
                onChange={e => setContractFilter(e.target.value)}
                style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', minWidth: '160px' }}
              >
                <option value="All">All Types</option>
                <optgroup label="Issuer Type">
                  <option value="Government">Government</option>
                  <option value="State-Owned Enterprise">State-Owned Enterprise</option>
                  <option value="NPC Corporation">NPC Corporation</option>
                  <option value="Local Business">Local Business</option>
                  <option value="Private Client">Private Client</option>
                  <option value="Player Company">Player Company</option>
                </optgroup>
                <optgroup label="Sector">
                  <option value="Local">Local Delivery</option>
                  <option value="Interstate">Interstate Freight</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Produce">Agriculture</option>
                  <option value="Port">Port Transfer</option>
                  <option value="Retail">Retail</option>
                </optgroup>
                <optgroup label="Acceptance">
                  <option value="Requires Bid">Requires Bid</option>
                  <option value="Direct Accept">Direct Accept</option>
                </optgroup>
              </select>`;
  code = code.slice(0, cSelectStart) + newContractSelect + code.slice(cSelectEnd);
}

// Update filter logic
let fLogStart = code.indexOf(`let filteredContracts = contracts.filter(c => c.status === 'open');`);
let fLogEnd = code.indexOf(`return (`, fLogStart);
if (fLogStart !== -1 && fLogEnd !== -1) {
  const newFilterLogic = `let filteredContracts = contracts.filter(c => c.status === 'open');
  if (contractSearch) {
    filteredContracts = filteredContracts.filter(c => c.title.toLowerCase().includes(contractSearch.toLowerCase()) || c.issuerName.toLowerCase().includes(contractSearch.toLowerCase()));
  }
  if (['Government', 'State-Owned Enterprise', 'NPC Corporation', 'Local Business', 'Private Client', 'Player Company'].includes(contractFilter)) {
    filteredContracts = filteredContracts.filter(c => c.issuerType === contractFilter);
  } else if (contractFilter === 'Local') {
    filteredContracts = filteredContracts.filter(c => c.originState === c.destinationState);
  } else if (contractFilter === 'Interstate') {
    filteredContracts = filteredContracts.filter(c => c.originState !== c.destinationState);
  } else if (contractFilter === 'Industrial') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Industrial Freight');
  } else if (contractFilter === 'Produce') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Produce Delivery');
  } else if (contractFilter === 'Port') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Port Transfer');
  } else if (contractFilter === 'Retail') {
    filteredContracts = filteredContracts.filter(c => c.contractType === 'Local Delivery' || c.contractType === 'Interstate Freight');
  } else if (contractFilter === 'Requires Bid') {
    filteredContracts = filteredContracts.filter(c => c.bidType === 'bid');
  } else if (contractFilter === 'Direct Accept') {
    filteredContracts = filteredContracts.filter(c => c.bidType === 'direct');
  }

  `;
  code = code.slice(0, fLogStart) + newFilterLogic + code.slice(fLogEnd);
}

// 9. Fix Fleet Tab "Open Procurement" and remove vehicle listing
code = code.replace(/<PanelBox style=\{\{ marginBottom: '16px' \}\}>\s*<SectionHeader>Fleet Summary<\/SectionHeader>/, `<PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Procurement Market</SectionHeader>
              <FieldRow label="Player Listings" value="Locked" valueColor={T.faint} />
              <FieldRow label="NPC Stock" value="Available" valueColor={T.mint} />
              <div style={{ marginTop: '16px' }}>
                <GhostButton onClick={() => setDeskTab('procurement')}>Open Procurement →</GhostButton>
              </div>
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Summary</SectionHeader>`);

let fleetListStart = code.indexOf(`<SectionHeader stamp="PROCURE">Vehicle Procurement Market</SectionHeader>`);
let fleetListEnd = code.indexOf(`<div>\s*<PanelBox style={{ marginBottom: '16px' }}>\s*<SectionHeader>Procurement Market</SectionHeader>`, fleetListStart);
if (fleetListStart !== -1) {
  // We need to cut out the vehicle market from Fleet tab. 
  // It ends at `</PanelBox>` right before the `Fleet Summary` wrapper starts.
  // The structure: `Vehicle Procurement Market ... </div> </div>` and then `<div> <PanelBox> Procurement Market...`
  // Actually, let's just use replace to wipe it.
  const fleetDelRegex = /<SectionHeader stamp="PROCURE">Vehicle Procurement Market<\/SectionHeader>[^]*?Used vehicle listings from other players will appear here in Beta\.[\s\S]*?<\/div>\s*<\/div>/;
  code = code.replace(fleetDelRegex, '');
}

// 10. StartBusiness right rail text
code = code.replace(/<div style=\{\{ fontSize: '11px', color: T\.ivory, lineHeight: 1\.5 \}\}>After filing, your first step should be to visit the Procurement desk to acquire your first operational vehicle\.<\/div>/, `<div style={{ fontSize: '11px', color: T.ivory, lineHeight: 1.5 }}>After filing, your first step should be to visit the Procurement desk to acquire your first operational asset: {selectedModel === 'Port Shuttle Operator' || selectedModel === 'Local Courier Operator' ? 'Used Delivery Van' : 'Box Truck'}.</div>`);

// 11. Operations Dispatch button
code = code.replace(/<GoldButton onClick=\{handleRunAutoOps\} disabled=\{fleet\.length === 0\}>/, `<GoldButton onClick={handleRunAutoOps}>`);


fs.writeFileSync(file, code);
console.log('Precise Update Complete!');
