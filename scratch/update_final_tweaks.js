const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Inject StaffTab into CompanyDeskTab render
const opsTabRender = "{deskTab === 'operations' && <OperationsTab company={company} fleet={fleet} setDeskTab={setDeskTab} onRefresh={onRefresh} />}";
const staffTabRender = "{deskTab === 'staff' && <StaffTab company={company} onRefresh={onRefresh} />}";
code = code.replace(opsTabRender, opsTabRender + '\n      ' + staffTabRender);

// Update ContractsTab
const contractRenderOld = /<FieldRow label="Sector" value=\{c\.requiredSector\} \/>\s*<FieldRow label="Cargo" value=\{c\.cargo \|\| 'General Freight'\} \/>\s*<div style=\{\{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid ' \+ T\.border \}\}>/;
const contractRenderNew = `<FieldRow label="Sector" value={c.requiredSector} />
                  <FieldRow label="Cargo" value={c.cargo || 'General Freight'} />
                  {c.issuerType !== 'Government' && c.issuerType !== 'Player Company' && (
                    <FieldRow label="Client Trust" value={(company.clientTrusts && company.clientTrusts[c.issuerCompanyId]) || 'Unknown'} valueColor={T.mint} />
                  )}
                  <FieldRow label="Required Capacity" value={c.requiredCapacity || 1} />
                  <FieldRow label="Required Drivers" value={c.requiredDrivers || 1} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid ' + T.border }}>`;
code = code.replace(contractRenderOld, contractRenderNew);


// Update FinanceTab to include Maintenance Policy, Contract Strategy, Cash Reserve Policy
const finTabRegex = /<SectionHeader stamp="LENDING">Debt & Financing<\/SectionHeader>[^]*?Bank loans, corporate bonds, and credit facilities are currently unavailable.[^]*?<\/PanelBox>/;
const newFinPolicies = `<SectionHeader stamp="POLICIES">Company Financial Policies</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
              <PanelBox>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Maintenance Policy</div>
                <select value={company.maintenancePolicy || 'Standard'} onChange={(e) => { company.maintenancePolicy = e.target.value as any; saveCompany(company); onRefresh(); }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                  <option value="Minimal">Minimal (Cost x0.70, Wear x1.35)</option>
                  <option value="Standard">Standard (Cost x1.00, Wear x1.00)</option>
                  <option value="Preventive">Preventive (Cost x1.30, Wear x0.75)</option>
                  <option value="Premium">Premium Fleet Care (Cost x1.60, Wear x0.55)</option>
                </select>
              </PanelBox>
              <PanelBox>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Contract Strategy</div>
                <select value={company.contractStrategy || 'Balanced Freight'} onChange={(e) => { company.contractStrategy = e.target.value as any; saveCompany(company); onRefresh(); }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                  <option value="Safe Local">Safe Local Work (Low Risk)</option>
                  <option value="Balanced Freight">Balanced Freight (Normal)</option>
                  <option value="Aggressive Growth">Aggressive Growth (High Risk/Reward)</option>
                </select>
              </PanelBox>
              <PanelBox>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '8px' }}>Cash Reserve Policy</div>
                <select value={company.cashReservePolicy || 'Growth'} onChange={(e) => { company.cashReservePolicy = e.target.value as any; saveCompany(company); onRefresh(); }} style={{ padding: '8px', background: T.panel, border: '1px solid ' + T.border, color: T.ivory, fontSize: '12px', width: '100%' }}>
                  <option value="Conservative">Conservative Reserve</option>
                  <option value="Growth">Growth Focus</option>
                  <option value="Aggressive">Aggressive Expansion</option>
                </select>
              </PanelBox>
            </div>
            
            <SectionHeader stamp="LENDING">Debt & Financing</SectionHeader>
            <PanelBox>
              <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed ' + T.border, background: 'rgba(255,255,255,0.02)', color: T.muted, fontSize: '12px' }}>
                Bank loans, corporate bonds, and credit facilities are currently unavailable.
              </div>
            </PanelBox>`;
code = code.replace(finTabRegex, newFinPolicies);

fs.writeFileSync(file, code);
console.log('Final tweaks injected');
