const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

// 1. Inline Fleet -> Inline Fleet (without range)
const fStart = c.indexOf("{deskTab === 'fleet' && (");
const fEnd = c.indexOf("{deskTab === 'contracts' && (");
if (fStart > -1 && fEnd > -1) {
  const newFleetStr = "{deskTab === 'fleet' && (\n" +
"        <div className=\"business-content-grid\">\n" +
"          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>\n" +
"            <SectionHeader stamp=\"OPERATIONS\">Current Fleet</SectionHeader>\n" +
"            {fleet.length === 0 ? (\n" +
"              <PanelBox style={{ textAlign: 'center', padding: '40px 20px' }}>\n" +
"                <div style={{ fontSize: '11px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No vehicles in fleet</div>\n" +
"              </PanelBox>\n" +
"            ) : (\n" +
"              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>\n" +
"                {fleet.map(v => {\n" +
"                  const maint = v.monthlyMaintenance || 0;\n" +
"                  return (\n" +
"                    <div key={v.id} style={{ background: T.panel, border: '1px solid ' + T.border, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>\n" +
"                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>\n" +
"                        <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{v.type}</div>\n" +
"                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: v.condition > 75 ? T.mint : v.condition > 40 ? T.gold : T.red }}>\n" +
"                          Condition: {v.condition}%\n" +
"                        </div>\n" +
"                      </div>\n" +
"                      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: T.muted }}>\n" +
"                        <span>Capacity: <strong style={{ color: T.ivory }}>{v.capacity}</strong></span>\n" +
"                        <span>Maint: <strong style={{ color: T.red }}>{formatMoney(maint)}/mo</strong></span>\n" +
"                      </div>\n" +
"                      <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase' }}>\n" +
"                        Assignment: {v.assignedContractId ? <span style={{ color: T.mint }}>Active Contract</span> : v.assignedAutoOpPool ? <span style={{ color: T.gold }}>Auto Op ({v.assignedAutoOpPool})</span> : <span style={{ color: T.muted }}>Idle</span>}\n" +
"                      </div>\n" +
"                      <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '12px', display: 'flex', gap: '8px' }}>\n" +
"                        <GhostButton onClick={() => handleMaintenance(v.id, 'basic')}>Basic Repair (₯5k)</GhostButton>\n" +
"                        <GhostButton onClick={() => handleMaintenance(v.id, 'full')}>Full Service (₯15k)</GhostButton>\n" +
"                      </div>\n" +
"                    </div>\n" +
"                  );\n" +
"                })}\n" +
"              </div>\n" +
"            )}\n" +
"          </div>\n" +
"          <div>\n" +
"            <PanelBox>\n" +
"              <SectionHeader stamp=\"MARKET\">Fleet Expansion</SectionHeader>\n" +
"              <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>\n" +
"                Expand your operations by acquiring more transport vehicles. New listings are managed centrally via the Business Market.\n" +
"              </div>\n" +
"              <GoldButton onClick={onOpenMarket}>Open Vehicle Market</GoldButton>\n" +
"            </PanelBox>\n" +
"          </div>\n" +
"        </div>\n" +
"      )}\n\n      ";
  c = c.substring(0, fStart) + newFleetStr + c.substring(fEnd);
}

// 2. Inline Assets -> Inline Facilities + Assets
const aStart = c.indexOf("{deskTab === 'assets' && (");
const aEnd = c.indexOf("{deskTab === 'records' && (");
if (aStart > -1 && aEnd > -1) {
  const newAssetsStr = "{deskTab === 'facilities' && (\n" +
"        <FacilitiesTab company={company} onRefresh={onRefresh} showNotif={showNotif} />\n" +
"      )}\n\n" +
"      {deskTab === 'assets' && (\n" +
"        <AssetsTab company={company} fleet={fleet} setDeskTab={setDeskTab} onOpenMarket={onOpenMarket} />\n" +
"      )}\n\n      ";
  c = c.substring(0, aStart) + newAssetsStr + c.substring(aEnd);
}

// 3. Update CompanyDeskTab Props
const signatureRegex = /function CompanyDeskTab\(\{\s*company,\s*fleet,\s*contracts,\s*playerCash,\s*characterName,\s*onRefresh\s*\}\s*:\s*\{\s*company:\s*Company;\s*fleet:\s*Vehicle\[\];\s*contracts:\s*Contract\[\];\s*playerCash:\s*number;\s*characterName:\s*string;\s*onRefresh:\s*\(\)\s*=>\s*void;\s*\}\) \{/;
c = c.replace(signatureRegex, "function CompanyDeskTab({ company, fleet, contracts, playerCash, characterName, onRefresh, onOpenMarket }: { company: Company; fleet: Vehicle[]; contracts: Contract[]; playerCash: number; characterName: string; onRefresh: () => void; onOpenMarket: () => void; }) {");

c = c.replace(/<CompanyDeskTab\s+company=\{company\}\s+fleet=\{fleet\}\s+contracts=\{companyContracts\}\s+playerCash=\{playerCash\}\s+characterName=\{characterName\}\s+onRefresh=\{onRefresh\}\s*\/>/, 
"<CompanyDeskTab company={company} fleet={fleet} contracts={companyContracts} playerCash={playerCash} characterName={characterName} onRefresh={onRefresh} onOpenMarket={() => { setActiveTab('market'); setSelectedCompanyId(company.id); }} />");

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Done chunk 3 safe string concat');
