const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Replace AssetsTab and inject FacilitiesTab
const aStart = c.indexOf('function AssetsTab');
const aEnd = c.indexOf('function RegistryTab');
if (aStart > -1 && aEnd > -1) {
  const newAssetsStr = "function AssetsTab({ company, fleet, setDeskTab, onOpenMarket }: any) {\n" +
"  const vehicleAssetValue = fleet.reduce((sum:any, v:any) => sum + Math.round(v.purchaseCost * (v.condition / 100)), 0);\n" +
"  const totalLeasedCost = (company.facilities || []).reduce((sum:any, f:any) => sum + f.leaseCost, 0);\n" +
"\n" +
"  return (\n" +
"    <div className=\"business-content-grid\">\n" +
"      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>\n" +
"        <SectionHeader>Company Assets Portfolio</SectionHeader>\n" +
"        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>\n" +
"          <PanelBox>\n" +
"            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Vehicle Asset Value</div>\n" +
"            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.mint, fontWeight: 700 }}>{formatMoney(vehicleAssetValue)}</div>\n" +
"            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{fleet.length} active units</div>\n" +
"          </PanelBox>\n" +
"          <PanelBox>\n" +
"            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Facility Lease Position</div>\n" +
"            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.steel, fontWeight: 700 }}>{formatMoney(totalLeasedCost)}/mo</div>\n" +
"            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>{(company.facilities || []).length} active leases</div>\n" +
"          </PanelBox>\n" +
"          <PanelBox>\n" +
"            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Property Value</div>\n" +
"            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.faint, fontWeight: 700 }}>₯0</div>\n" +
"            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Locked (Land Purchasing)</div>\n" +
"          </PanelBox>\n" +
"          <PanelBox>\n" +
"            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Total Company Asset Value</div>\n" +
"            <div style={{ fontSize: '18px', fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>{formatMoney(calcCompanyValue(company))}</div>\n" +
"            <div style={{ fontSize: '10px', color: T.faint, marginTop: '4px' }}>Includes cash & depreciated fleet</div>\n" +
"          </PanelBox>\n" +
"        </div>\n" +
"\n" +
"        <SectionHeader>Asset Details</SectionHeader>\n" +
"        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>\n" +
"          <div style={{ border: '1px solid ' + T.border, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>\n" +
"            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Vehicle Assets</div>\n" +
"            {fleet.length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No vehicles owned.</div> : (\n" +
"              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>\n" +
"                {fleet.map((v:any) => (\n" +
"                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed ' + T.border, paddingBottom: '4px' }}>\n" +
"                    <span style={{ fontSize: '11px', color: T.muted }}>{v.type} ({v.condition}%)</span>\n" +
"                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.ivory }}>{formatMoney(Math.round(v.purchaseCost * (v.condition / 100)))}</span>\n" +
"                  </div>\n" +
"                ))}\n" +
"              </div>\n" +
"            )}\n" +
"          </div>\n" +
"          <div style={{ border: '1px solid ' + T.border, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>\n" +
"            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700, marginBottom: '12px' }}>Facility Assets (Leased)</div>\n" +
"            {(company.facilities || []).length === 0 ? <div style={{ fontSize: '11px', color: T.faint }}>No facilities leased.</div> : (\n" +
"              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>\n" +
"                {(company.facilities || []).map((f:any, i:number) => (\n" +
"                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed ' + T.border, paddingBottom: '4px' }}>\n" +
"                    <span style={{ fontSize: '11px', color: T.muted }}>{f.type} <span style={{ color: T.faint }}>({f.state})</span></span>\n" +
"                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: T.steel }}>{formatMoney(f.leaseCost)}/mo</span>\n" +
"                  </div>\n" +
"                ))}\n" +
"              </div>\n" +
"            )}\n" +
"          </div>\n" +
"          <div style={{ border: '1px solid ' + T.border, background: 'rgba(0,0,0,0.2)', padding: '16px' }}>\n" +
"            <div style={{ fontSize: '12px', color: T.faint, fontWeight: 700, marginBottom: '12px' }}>Expansion Sites</div>\n" +
"            <div style={{ fontSize: '11px', color: T.faint }}>Locked (Future construction update).</div>\n" +
"          </div>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div>\n" +
"        <PanelBox>\n" +
"          <SectionHeader stamp=\"MANAGEMENT\">Asset Controls</SectionHeader>\n" +
"          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>\n" +
"            Facilities are managed in the Facilities tab. Vehicle purchases are managed in Fleet or Business Market. This Assets tab serves as your aggregated asset value summary.\n" +
"          </div>\n" +
"          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>\n" +
"            <GhostButton onClick={() => setDeskTab('facilities')}>Open Facilities</GhostButton>\n" +
"            <GhostButton onClick={() => setDeskTab('fleet')}>Open Fleet</GhostButton>\n" +
"            <GhostButton onClick={onOpenMarket}>Open Market</GhostButton>\n" +
"          </div>\n" +
"        </PanelBox>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"}\n\n" +
"function FacilitiesTab({ company, onRefresh, showNotif }: any) {\n" +
"  const [selectedStates, setSelectedStates] = React.useState<Record<string, string>>({\n" +
"    'Office': company.state,\n" +
"    'Vehicle Yard': company.state,\n" +
"    'Small Depot': company.state,\n" +
"    'Warehouse': company.state,\n" +
"    'Regional Branch Office': company.state,\n" +
"  });\n" +
"\n" +
"  const handleLease = (type: any, leaseCost: number) => {\n" +
"    const state = selectedStates[type] || company.state;\n" +
"    const alreadyLeased = (company.facilities || []).some((f:any) => f.type === type && f.state === state);\n" +
"    if (alreadyLeased) {\n" +
"      showNotif(`You already lease a ${type} in ${state}.`, false);\n" +
"      return;\n" +
"    }\n" +
"    const res = leaseFacility(company.id, type, state, leaseCost);\n" +
"    showNotif(res.message, res.success);\n" +
"    if (res.success) onRefresh();\n" +
"  };\n" +
"\n" +
"  const availableProperties = [\n" +
"    { type: 'Office', leaseCost: 10000, benefit: 'Provides legitimacy and client trust later.', leaseable: true },\n" +
"    { type: 'Vehicle Yard', leaseCost: 15000, benefit: '+2 vehicle support capacity in selected state.', leaseable: true },\n" +
"    { type: 'Small Depot', leaseCost: 25000, benefit: 'Improves local courier and port shuttle operations.', leaseable: true },\n" +
"    { type: 'Warehouse', leaseCost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.', leaseable: true },\n" +
"    { type: 'Regional Branch Office', leaseCost: 30000, benefit: 'Expands business presence to another state.', leaseable: true },\n" +
"    { type: 'Freight Yard', leaseCost: 70000, benefit: 'Supports larger interstate freight and heavy cargo.', leaseable: true },\n" +
"    { type: 'Port Warehouse', leaseCost: 90000, benefit: 'Improves port shuttle and port freight contracts.', leaseable: true },\n" +
"    { type: 'Port Terminal', leaseCost: 250000, benefit: 'Coastal and international shipping later.', leaseable: false, note: 'Locked / later' },\n" +
"  ];\n" +
"\n" +
"  return (\n" +
"    <div className=\"business-content-grid\">\n" +
"      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>\n" +
"        <SectionHeader>Current Facilities</SectionHeader>\n" +
"        {(company.facilities || []).length === 0 ? (\n" +
"          <PanelBox style={{ textAlign: 'center', padding: '40px 20px' }}>\n" +
"            <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No facilities leased</div>\n" +
"          </PanelBox>\n" +
"        ) : (\n" +
"          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>\n" +
"            {(company.facilities || []).map((f:any, i:number) => (\n" +
"              <div key={i} style={{ background: T.panel, border: '1px solid ' + T.border, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>\n" +
"                <div>\n" +
"                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory, display: 'flex', alignItems: 'center', gap: '8px' }}>\n" +
"                    {f.type}\n" +
"                    <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', color: T.faint, padding: '2px 6px', borderRadius: '2px' }}>{f.state}</span>\n" +
"                  </div>\n" +
"                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>Active Lease</div>\n" +
"                </div>\n" +
"                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: T.steel, fontWeight: 700 }}>\n" +
"                  {formatMoney(f.leaseCost)}/mo\n" +
"                </div>\n" +
"              </div>\n" +
"            ))}\n" +
"          </div>\n" +
"        )}\n" +
"\n" +
"        <SectionHeader>Available Facilities</SectionHeader>\n" +
"        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>\n" +
"          {availableProperties.map(fac => (\n" +
"            <div key={fac.type} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid ' + T.border, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>\n" +
"              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>\n" +
"                <div>\n" +
"                  <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{fac.type}</div>\n" +
"                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px', maxWidth: '400px', lineHeight: 1.5 }}>Benefit: {fac.benefit}</div>\n" +
"                </div>\n" +
"                <div style={{ textAlign: 'right' }}>\n" +
"                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: fac.leaseable ? T.mint : T.faint, fontWeight: 700 }}>\n" +
"                    {fac.leaseable ? `${formatMoney(fac.leaseCost)}/mo` : '---'}\n" +
"                  </div>\n" +
"                </div>\n" +
"              </div>\n" +
"              {fac.leaseable ? (\n" +
"                <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>\n" +
"                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>\n" +
"                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase' }}>State:</span>\n" +
"                    <select \n" +
"                      value={selectedStates[fac.type] || company.state}\n" +
"                      onChange={e => setSelectedStates({ ...selectedStates, [fac.type]: e.target.value })}\n" +
"                      style={{ background: T.bg, border: '1px solid ' + T.border, color: T.ivory, fontSize: '11px', padding: '4px 8px', fontFamily: 'monospace' }}\n" +
"                    >\n" +
"                      <option value=\"Drennport State\">Drennport State</option>\n" +
"                      <option value=\"Westport State\">Westport State</option>\n" +
"                      <option value=\"Ironvale State\">Ironvale State</option>\n" +
"                    </select>\n" +
"                  </div>\n" +
"                  <GhostButton onClick={() => handleLease(fac.type, fac.leaseCost)} color={T.mint}>Lease Facility</GhostButton>\n" +
"                </div>\n" +
"              ) : (\n" +
"                <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '12px', fontSize: '11px', color: T.faint, fontStyle: 'italic' }}>\n" +
"                  {fac.note}\n" +
"                </div>\n" +
"              )}\n" +
"            </div>\n" +
"          ))}\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      <div>\n" +
"        <PanelBox>\n" +
"          <SectionHeader stamp=\"OVERVIEW\">Facility Effects</SectionHeader>\n" +
"          <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6 }}>\n" +
"            Facilities form the backbone of your operations. Leasing property in different states unlocks regional contracts, increases vehicle capacity, and enables storage/transfer capabilities.\n" +
"          </div>\n" +
"        </PanelBox>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"}\n\n";
  c = c.substring(0, aStart) + newAssetsStr + c.substring(aEnd);
}

// 2. Replace MarketTab
const mStart = c.indexOf('function MarketTab');
const mEnd = c.indexOf('export default function BusinessPage');
if (mStart > -1 && mEnd > -1) {
  const newMarketStr = "function MarketTab({ playerCash, onRefresh }: { playerCash: number, onRefresh: () => void }) {\n" +
"  const [subTab, setSubTab] = React.useState<'vehicles'|'property'|'equipment'|'materials'|'contracts'|'shares'>('vehicles');\n" +
"  const companies = getCompanies();\n" +
"  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(companies[0]?.id || '');\n" +
"  const [notification, setNotification] = React.useState<{ msg: string; success: boolean } | null>(null);\n" +
"\n" +
"  const company = companies.find(c => c.id === selectedCompanyId);\n" +
"\n" +
"  const showNotif = (msg: string, success: boolean) => {\n" +
"    setNotification({ msg, success });\n" +
"    setTimeout(() => setNotification(null), 4000);\n" +
"  };\n" +
"\n" +
"  const handlePurchaseVehicle = (spec: any) => {\n" +
"    if (!company) {\n" +
"      showNotif('You need an active company before buying business vehicles.', false);\n" +
"      return;\n" +
"    }\n" +
"    const result = purchaseVehicle(company.id, spec.type);\n" +
"    showNotif(result.message, result.success);\n" +
"    if (result.success) onRefresh();\n" +
"  };\n" +
"\n" +
"  const handleLease = (type: string, cost: number, state: string) => {\n" +
"    if (!company) {\n" +
"      showNotif('You need an active company before leasing business facilities.', false);\n" +
"      return;\n" +
"    }\n" +
"    const result = leaseFacility(company.id, type as any, state, cost);\n" +
"    showNotif(result.message, result.success);\n" +
"    if (result.success) onRefresh();\n" +
"  };\n" +
"\n" +
"  const lockedTab = (name: string) => (\n" +
"    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>\n" +
"      <SectionHeader>{name}</SectionHeader>\n" +
"      <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed ' + T.border, padding: '40px', textAlign: 'center' }}>\n" +
"        <div style={{ fontSize: '12px', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Locked / Coming Later</div>\n" +
"        <div style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>This market section is not yet available in pre-alpha.</div>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"\n" +
"  return (\n" +
"    <div className=\"flex flex-col h-full w-full\">\n" +
"      <div className=\"flex items-center gap-6 px-8 py-3 border-b\" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>\n" +
"        {[\n" +
"          { id: 'vehicles', label: 'Vehicles' },\n" +
"          { id: 'property', label: 'Property' },\n" +
"          { id: 'equipment', label: 'Equipment 🔒' },\n" +
"          { id: 'materials', label: 'Materials 🔒' },\n" +
"          { id: 'contracts', label: 'Contract Exchange 🔒' },\n" +
"          { id: 'shares', label: 'Company Shares 🔒' },\n" +
"        ].map(t => (\n" +
"          <button key={t.id} onClick={() => setSubTab(t.id as any)} style={{ color: subTab === t.id ? T.gold : T.muted, borderBottom: subTab === t.id ? '2px solid ' + T.gold : '2px solid transparent', whiteSpace: 'nowrap' }} className=\"text-[11px] font-mono uppercase tracking-widest pb-1\">\n" +
"            {t.label}\n" +
"          </button>\n" +
"        ))}\n" +
"        <div className=\"ml-auto flex items-center gap-2\">\n" +
"          <span className=\"text-[10px] font-mono text-zinc-500 uppercase\">Buy for:</span>\n" +
"          <select \n" +
"            value={selectedCompanyId} \n" +
"            onChange={e => setSelectedCompanyId(e.target.value)}\n" +
"            className=\"text-[11px] font-mono px-2 py-1 rounded-sm\"\n" +
"            style={{ background: T.panel, color: T.gold, border: '1px solid ' + T.border }}\n" +
"          >\n" +
"            <option value=\"\">-- Select Company --</option>\n" +
"            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}\n" +
"          </select>\n" +
"        </div>\n" +
"      </div>\n" +
"\n" +
"      {notification && (\n" +
"        <div className=\"mx-8 mt-6 px-4 py-3 rounded-sm\" style={{ background: notification.success ? 'rgba(54, 211, 153, 0.1)' : 'rgba(184, 85, 85, 0.1)', border: '1px solid ' + (notification.success ? T.mint : T.red) }}>\n" +
"          <div className=\"text-sm font-bold\" style={{ color: notification.success ? T.mint : T.red }}>\n" +
"            {notification.success ? 'Success' : 'Notice'}\n" +
"          </div>\n" +
"          <div className=\"text-xs mt-1\" style={{ color: T.ivory }}>{notification.msg}</div>\n" +
"        </div>\n" +
"      )}\n" +
"\n" +
"      <div className=\"business-content-grid p-8 gap-8 overflow-y-auto\">\n" +
"        <div className=\"flex flex-col gap-6\">\n" +
"          {subTab === 'vehicles' && (\n" +
"            <>\n" +
"              <SectionHeader>🚚 New Vehicle Listings</SectionHeader>\n" +
"              <div className=\"grid grid-cols-2 gap-4\">\n" +
"                {VEHICLE_CATALOGUE.map(spec => {\n" +
"                  const canAfford = company && company.companyCash >= spec.cost;\n" +
"                  return (\n" +
"                    <div key={spec.type} className=\"p-4 border rounded-sm flex flex-col\" style={{ background: T.panel, borderColor: T.border }}>\n" +
"                      <div className=\"text-sm font-bold text-ivory mb-1\">{spec.type}</div>\n" +
"                      <div className=\"text-[11px] text-zinc-400 mb-4\">{spec.desc}</div>\n" +
"                      <div className=\"flex items-center justify-between mt-auto\">\n" +
"                        <div>\n" +
"                          <div className=\"text-sm font-mono font-bold\" style={{ color: canAfford ? T.mint : T.red }}>{formatMoney(spec.cost)}</div>\n" +
"                          <div className=\"text-[10px] font-mono\" style={{ color: T.faint }}>Maint: {formatMoney(spec.maintenance)}/mo</div>\n" +
"                        </div>\n" +
"                        <GoldButton onClick={() => handlePurchaseVehicle(spec)}>Order New</GoldButton>\n" +
"                      </div>\n" +
"                    </div>\n" +
"                  );\n" +
"                })}\n" +
"              </div>\n" +
"\n" +
"              <SectionHeader>🏷️ Used Vehicle Listings</SectionHeader>\n" +
"              <div className=\"p-4 border rounded-sm text-center\" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)' }}>\n" +
"                <div className=\"text-[11px] font-mono text-zinc-500 uppercase tracking-widest\">No used listings currently available on the market.</div>\n" +
"              </div>\n" +
"\n" +
"              <SectionHeader>🏭 Player Manufacturing</SectionHeader>\n" +
"              <div className=\"p-4 border border-dashed rounded-sm text-center\" style={{ borderColor: T.border }}>\n" +
"                <div className=\"text-[11px] font-mono text-zinc-500 uppercase tracking-widest\">Player manufacturing companies will be able to list vehicles here later.</div>\n" +
"              </div>\n" +
"            </>\n" +
"          )}\n" +
"\n" +
"          {subTab === 'property' && (\n" +
"            <>\n" +
"              <SectionHeader>🏢 Available Properties & Facilities</SectionHeader>\n" +
"              <div className=\"grid grid-cols-1 gap-4\">\n" +
"                {[\n" +
"                  { type: 'Office', state: 'Drennport State', cost: 10000, benefit: 'Provides legitimacy and client trust later.' },\n" +
"                  { type: 'Vehicle Yard', state: 'Drennport State', cost: 15000, benefit: '+2 vehicle support capacity in selected state.' },\n" +
"                  { type: 'Small Depot', state: 'Drennport State', cost: 25000, benefit: 'Improves local courier and port shuttle operations.' },\n" +
"                  { type: 'Warehouse', state: 'Westport State', cost: 40000, benefit: 'Unlocks storage and larger retail restock contracts.' },\n" +
"                  { type: 'Regional Branch Office', state: 'Ironvale State', cost: 30000, benefit: 'Expands business presence to another state.' }\n" +
"                ].map((fac, i) => {\n" +
"                  const canAfford = company && company.companyCash >= fac.cost;\n" +
"                  return (\n" +
"                    <div key={i} className=\"flex flex-row items-center justify-between p-4 border rounded-sm\" style={{ background: T.panel, borderColor: T.border }}>\n" +
"                      <div>\n" +
"                        <div className=\"text-sm font-bold text-ivory flex items-center gap-2\">\n" +
"                          {fac.type}\n" +
"                          <span className=\"text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm\" style={{ background: 'rgba(255,255,255,0.05)', color: T.faint }}>{fac.state}</span>\n" +
"                        </div>\n" +
"                        <div className=\"text-[11px] text-zinc-400 mt-1\">{fac.benefit}</div>\n" +
"                      </div>\n" +
"                      <div className=\"text-right flex items-center gap-4\">\n" +
"                        <div>\n" +
"                          <div className=\"text-sm font-mono font-bold\" style={{ color: canAfford ? T.mint : T.red }}>{formatMoney(fac.cost)}/mo</div>\n" +
"                        </div>\n" +
"                        <GoldButton onClick={() => handleLease(fac.type, fac.cost, fac.state)}>Lease Facility</GoldButton>\n" +
"                      </div>\n" +
"                    </div>\n" +
"                  );\n" +
"                })}\n" +
"              </div>\n" +
"\n" +
"              <SectionHeader>🔒 Locked Markets</SectionHeader>\n" +
"              <div className=\"flex gap-4\">\n" +
"                <div className=\"flex-1 p-3 border border-dashed text-center\" style={{ borderColor: T.border }}><span className=\"text-[10px] font-mono text-zinc-500\">Port Facilities</span></div>\n" +
"                <div className=\"flex-1 p-3 border border-dashed text-center\" style={{ borderColor: T.border }}><span className=\"text-[10px] font-mono text-zinc-500\">Land Purchase</span></div>\n" +
"                <div className=\"flex-1 p-3 border border-dashed text-center\" style={{ borderColor: T.border }}><span className=\"text-[10px] font-mono text-zinc-500\">Construction</span></div>\n" +
"              </div>\n" +
"            </>\n" +
"          )}\n" +
"\n" +
"          {subTab === 'equipment' && lockedTab('Equipment Market')}\n" +
"          {subTab === 'materials' && lockedTab('Materials Market')}\n" +
"          {subTab === 'contracts' && lockedTab('Contract Exchange')}\n" +
"          {subTab === 'shares' && lockedTab('Company Shares')}\n" +
"        </div>\n" +
"\n" +
"        <div className=\"flex flex-col gap-6\">\n" +
"          <SectionHeader>📋 Selected Buyer Context</SectionHeader>\n" +
"          <div className=\"p-5 border rounded-sm\" style={{ background: T.panel, borderColor: T.border }}>\n" +
"            {company ? (\n" +
"              <div className=\"flex flex-col gap-3\">\n" +
"                <FieldRow label=\"Company\" value={company.name} valueColor={T.ivory} />\n" +
"                <FieldRow label=\"Cash Available\" value={formatMoney(company.companyCash)} valueColor={T.mint} />\n" +
"                <FieldRow label=\"Current Status\" value={company.status} valueColor={T.steel} />\n" +
"              </div>\n" +
"            ) : (\n" +
"              <div className=\"text-[11px] font-mono text-zinc-500 italic\">No active company selected. Buying disabled.</div>\n" +
"            )}\n" +
"          </div>\n" +
"        </div>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"}\n\n";
  c = c.substring(0, mStart) + newMarketStr + c.substring(mEnd);
}

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Done chunk 4 tabs');
