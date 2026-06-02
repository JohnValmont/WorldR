const fs = require('fs');

let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Add MarketTab component definition
const marketTabComp = `
function MarketTab({ playerCash, onRefresh }: { playerCash: number, onRefresh: () => void }) {
  const [subTab, setSubTab] = React.useState<'vehicles'|'property'>('vehicles');
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
    const result = leaseFacility(company.id, type, state, cost);
    showNotif(result.message, result.success);
    if (result.success) onRefresh();
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-6 px-8 py-3 border-b" style={{ borderColor: T.border, background: 'rgba(0,0,0,0.2)' }}>
        {['vehicles', 'property'].map(t => (
          <button key={t} onClick={() => setSubTab(t as any)} style={{ color: subTab === t ? T.gold : T.muted, borderBottom: subTab === t ? \`2px solid \${T.gold}\` : '2px solid transparent' }} className="text-[11px] font-mono uppercase tracking-widest pb-1">
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

      {notification && (
        <div className="mx-8 mt-6 px-4 py-3 rounded-sm" style={{ background: notification.success ? 'rgba(54, 211, 153, 0.1)' : 'rgba(184, 85, 85, 0.1)', border: \`1px solid \${notification.success ? T.mint : T.red}\` }}>
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
              <SectionHeader title="New Vehicle Listings" icon="🚚" />
              <div className="grid grid-cols-2 gap-4">
                {VEHICLE_CATALOGUE.map(spec => {
                  const canAfford = company && company.companyCash >= spec.cost;
                  return (
                    <div key={spec.type} className="p-4 border rounded-sm flex flex-col" style={{ background: T.panel, borderColor: T.border }}>
                      <div className="text-sm font-bold text-white mb-1">{spec.type}</div>
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

if (!code.includes('function MarketTab')) {
  code = code.replace(/export default function BusinessPage\(\) \{/, marketTabComp + 'export default function BusinessPage() {');
}

// 2. Add Market tab button
const marketBtn = `
            <button
              onClick={() => setActiveTab('market')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
              style={{
                color: activeTab === 'market' ? T.gold : T.muted,
                borderBottom: activeTab === 'market' ? \`2px solid \${T.gold}\` : '2px solid transparent'
              }}
            >
              Market
            </button>
`;
if (!code.includes("setActiveTab('market')")) {
  code = code.replace(/(\<button[^>]+onClick=\{\(\) => setActiveTab\('companies'\)\}[^>]+\>[\s\S]+?<\/button>\s*)/, "$1" + marketBtn);
}

// 3. Inject <MarketTab> into main switch
const marketRender = `
        {activeTab === 'market' && <MarketTab playerCash={playerCash} onRefresh={refreshAll} />}
`;
if (!code.includes("<MarketTab")) {
  code = code.replace(/(\{activeTab === 'registry'\s*&&\s*<RegistryTab[^>]+\/>\s*\})/, marketRender + "$1");
}

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
console.log('MarketTab injected!');
