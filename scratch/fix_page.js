const fs = require('fs');

let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Add 'market' to SubTab
code = code.replace(/type SubTab = 'overview' \| 'start' \| 'companies' \| 'registry';/, "type SubTab = 'overview' | 'start' | 'companies' | 'market' | 'registry';");

// 2. Add Market to top tabs
const topTabsRegex = /(<button\s+onClick=\{\(\) => setActiveTab\('companies'\)\}\s+className=\{[^}]+\}\s+style=\{[^\}]+\}\s*>\s*My Companies\s*<\/button>)/;
code = code.replace(topTabsRegex, `$1\n            <button\n              onClick={() => setActiveTab('market')}\n              className="px-4 py-2 text-xs font-bold uppercase tracking-widest"\n              style={{\n                color: activeTab === 'market' ? T.gold : T.muted,\n                borderBottom: activeTab === 'market' ? \\\`2px solid \\\${T.gold}\\\` : '2px solid transparent'\n              }}\n            >\n              Market\n            </button>`);

// 3. Inject Market tab view in main switch
const switchRegex = /(setActiveTab=\{setActiveTab\}\s*\/>\s*\))(\s*:\s*activeTab === 'registry'\s*\?\s*\(\s*<RegistryTab[^>]+>\s*\))/;
code = code.replace(switchRegex, `setActiveTab={setActiveTab} />\n          )\n          : activeTab === 'market' ? (\n            <MarketTab \n              playerCash={playerCash}\n              companies={companies}\n              setNotification={showNotif}\n              onRefresh={loadData}\n            />\n          )$2`);

// 4. Create MarketTab component
const marketTabComp = `
function MarketTab({ playerCash, companies, setNotification, onRefresh }: {
  playerCash: number;
  companies: Company[];
  setNotification: (msg: string, success: boolean) => void;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = React.useState<'vehicles'|'property'>('vehicles');
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(companies[0]?.id || '');

  const company = companies.find(c => c.id === selectedCompanyId);

  const handlePurchaseVehicle = (spec: any) => {
    if (!company) {
      setNotification('You need an active company before buying business vehicles.', false);
      return;
    }
    const result = purchaseVehicle(company.id, spec.type);
    setNotification(result.message, result.success);
    if (result.success) onRefresh();
  };

  const handleLease = (type: any, cost: number, state: string) => {
    if (!company) {
      setNotification('You need an active company before leasing business facilities.', false);
      return;
    }
    const result = leaseFacility(company.id, type, state, cost);
    setNotification(result.message, result.success);
    if (result.success) onRefresh();
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-6 px-8 py-3 border-b" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)' }}>
        {['vehicles', 'property'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} style={{ color: subTab === t ? T.gold : T.muted, borderBottom: subTab === t ? \`1px solid \${T.gold}\` : '1px solid transparent' }} className="text-[11px] font-mono uppercase tracking-widest pb-1">
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Buy for:</span>
          <select 
            value={selectedCompanyId} 
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="text-[11px] font-mono px-2 py-1 rounded-sm"
            style={{ background: T.panel, color: T.gold, border: \`1px solid \${T.border}\` }}
          >
            <option value="">-- Select Company --</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="business-content-grid p-8 gap-8 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {subTab === 'vehicles' && (
            <>
              <SectionHeader title="New Vehicle Listings" icon="🚚" />
              <div className="grid grid-cols-2 gap-4">
                {VEHICLE_CATALOGUE.map(spec => {
                  const canAfford = company && company.companyCash >= spec.cost;
                  return (
                    <div key={spec.type} className="p-4 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                      <div className="text-sm font-bold text-white mb-1">{spec.type}</div>
                      <div className="text-[11px] text-zinc-400 mb-3">{spec.desc}</div>
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

              <SectionHeader title="Used Vehicle Listings" icon="🏷️" />
              <div className="p-4 border rounded-sm text-center" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)' }}>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">No used listings currently available on the market.</div>
              </div>

              <SectionHeader title="Player Manufacturing" icon="🏭" />
              <div className="p-4 border border-dashed rounded-sm text-center" style={{ borderColor: T.border }}>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Player manufacturing companies will be able to list vehicles here later.</div>
              </div>
            </>
          )}

          {subTab === 'property' && (
            <>
              <SectionHeader title="Available Properties & Facilities" icon="🏢" />
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
                        <div className="text-sm font-bold text-white flex items-center gap-2">
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

              <SectionHeader title="Locked Markets" icon="🔒" />
              <div className="flex gap-4">
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Port Facilities</span></div>
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Land Purchase</span></div>
                <div className="flex-1 p-3 border border-dashed text-center" style={{ borderColor: T.border }}><span className="text-[10px] font-mono text-zinc-500">Construction</span></div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <SectionHeader title="Selected Buyer Context" icon="📋" />
          <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
            {company ? (
              <div className="flex flex-col gap-3">
                <FieldRow label="Company" value={company.name} valueColor={T.white} />
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
`;

code = code.replace(/export default function BusinessPage\(\) \{/, marketTabComp + '\n\nexport default function BusinessPage() {');

// 5. Assets tab fixes (remove property leasing from CompanyDeskTab, use 2-column)
const assetsOldRegex = /\{deskTab === 'assets' && \(\s*<div className="flex flex-col gap-6">[\s\S]*?\{deskTab === 'finance'/;

const assetsNew = `{deskTab === 'assets' && (
            <div className="business-content-grid">
              <div className="flex flex-col gap-6">
                <SectionHeader title="Company Assets & Facilities" icon="🏢" />
                {(company.facilities && company.facilities.length > 0) ? (
                  <div className="grid grid-cols-1 gap-4">
                    {company.facilities.map(f => (
                      <div key={f.id} className="p-4 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-white">{f.type}</div>
                          <div className="text-[10px] font-mono uppercase px-2 py-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: T.faint }}>{f.state}</div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span style={{ color: T.muted }}>Lease Expense:</span>
                          <span style={{ color: T.red }}>{formatMoney(f.leaseCost)}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-zinc-500 italic">No facilities or properties leased.</div>
                )}
              </div>
              <div className="flex flex-col gap-6">
                <SectionHeader title="Asset Portfolio Summary" icon="📊" />
                <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                  <div className="flex flex-col gap-3">
                    <FieldRow label="Total Fleet Assets" value={fleet.length.toString()} valueColor={T.steel} />
                    <FieldRow label="Active Property Leases" value={(company.facilities || []).length.toString()} valueColor={T.steel} />
                    <FieldRow label="Total Asset Value" value={formatMoney((companyValue - company.companyCash) + ((company.facilities || []).length * 10000))} valueColor={T.gold} />
                  </div>
                </div>

                <SectionHeader title="Facility Benefits" icon="✨" />
                <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                  <div className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                    • Office: boosts legitimacy and client trust.<br/>
                    • Vehicle Yard: increases vehicle capacity.<br/>
                    • Depot: improves local/port auto operations.<br/>
                    • Warehouse: unlocks storage contracts.<br/>
                    • Branch Office: state expansion.
                  </div>
                </div>

                <SectionHeader title="Expansion Readiness" icon="🗺️" />
                <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                  <div className="flex flex-col gap-3">
                    <FieldRow label="Current HQ" value={company.state} valueColor={T.white} />
                    <FieldRow label="States with Presence" value={Array.from(new Set([company.state, ...(company.facilities || []).map(f => f.state)])).length.toString()} valueColor={T.mint} />
                  </div>
                </div>

                {((company.facilities || []).reduce((sum, f) => sum + f.leaseCost, 0) > 0) && (
                  <div className="p-4 border rounded-sm" style={{ background: 'rgba(143, 61, 61, 0.1)', borderColor: T.red }}>
                    <div className="text-[11px] font-mono text-red-400">
                      Warning: Monthly facility lease expense is {formatMoney((company.facilities || []).reduce((sum, f) => sum + f.leaseCost, 0))}. Ensure operations revenue covers this overhead.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {deskTab === 'finance'`;

code = code.replace(assetsOldRegex, assetsNew);

// 6. Fleet tab fixes (remove procurement, use 2-column layout)
const fleetOldRegex = /\{deskTab === 'fleet' && \(\s*<div className="flex flex-col gap-6">[\s\S]*?\{deskTab === 'contracts'/;

const fleetNew = `{deskTab === 'fleet' && (
            <div className="business-content-grid">
              <div className="flex flex-col gap-6">
                <SectionHeader title="Current Fleet" icon="🚚" />
                {fleet.length === 0 ? (
                  <div className="text-[11px] font-mono text-zinc-500 italic p-4 border rounded-sm" style={{ borderColor: T.border }}>No vehicles in fleet. Open the Business Market to order vehicles.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {fleet.map(v => (
                      <div key={v.id} className="p-4 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-bold text-white">{v.type}</div>
                          <div className="text-[10px] font-mono px-2 py-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: v.condition > 50 ? T.mint : T.red }}>Cond: {v.condition}%</div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono mb-3">
                          <span style={{ color: T.faint }}>Cap: {v.capacity}</span>
                          <span style={{ color: T.red }}>Maint: {formatMoney(v.monthlyMaintenance)}/mo</span>
                        </div>
                        <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                          <span className="text-[10px] font-mono" style={{ color: T.gold }}>
                            {v.assignedContractId ? 'Assigned to Contract' : v.assignedAutoOpPool ? \`Assigned to \${v.assignedAutoOpPool}\` : 'Idle'}
                          </span>
                          <button className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: T.muted }}>Service</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-6">
                <SectionHeader title="Fleet Management" icon="📊" />
                <div className="p-5 border rounded-sm" style={{ background: T.panel, borderColor: T.border }}>
                  <div className="flex flex-col gap-3">
                    <FieldRow label="Total Vehicles" value={fleet.length.toString()} valueColor={T.white} />
                    <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length.toString()} valueColor={T.steel} />
                    <FieldRow label="Monthly Maintenance" value={formatMoney(fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0))} valueColor={T.red} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {deskTab === 'contracts'`;

code = code.replace(fleetOldRegex, fleetNew);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
console.log('Replaced Business page components');
