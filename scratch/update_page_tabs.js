const fs = require('fs');
const file = 'd:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Imports
code = code.replace(/runMonthlyAutoOperations,/g, 'processMonthlyOperations, hireStaff, fireStaff, STAFF_WAGES,');

// 2. Desk Tab Types
code = code.replace(/type CompanyDeskTab = 'overview' \| 'operations' \| 'contracts'/g, "type CompanyDeskTab = 'overview' | 'operations' | 'staff' | 'contracts'");
code = code.replace(/\{ id: 'operations', label: 'Operations' \},/g, "{ id: 'operations', label: 'Operations' },\n    { id: 'staff', label: 'Staff' },");

// 3. StaffTab Component
const staffTabCode = `
// ─────────────────────────────────────────────────────────────────────────────
// STAFF TAB
// ─────────────────────────────────────────────────────────────────────────────
function StaffTab({ company, onRefresh }: any) {
  const staff = company.staff || {};
  const roles = [
    { role: 'Driver', desc: 'Operates vehicles. Vital for fleet utilization.', cost: 18000 },
    { role: 'Dispatcher', desc: 'Coordinates routes. Improves auto ops revenue & success.', cost: 28000 },
    { role: 'Mechanic Crew', desc: 'Maintains fleet. Reduces monthly wear & breakdown risk.', cost: 30000 },
    { role: 'Warehouse Worker', desc: 'Operates depots. Recommended for warehouse leases.', cost: 22000 },
    { role: 'Admin Clerk', desc: 'Handles paperwork. Slowly improves client trust.', cost: 20000 },
    { role: 'Operations Manager', desc: 'Manages scaling. Best for 3+ vehicles.', cost: 50000 }
  ];

  let totalPayroll = 0;
  let totalStaff = 0;
  roles.forEach(r => {
    const count = staff[r.role as keyof typeof staff] || 0;
    totalStaff += count;
    totalPayroll += count * r.cost;
  });

  let payrollMultiplier = 1.0;
  if (company.wagePolicy === 'Low') payrollMultiplier = 0.8;
  else if (company.wagePolicy === 'Generous') payrollMultiplier = 1.2;
  else if (company.wagePolicy === 'Premium') payrollMultiplier = 1.45;

  const actualPayroll = Math.floor(totalPayroll * payrollMultiplier);
  const morale = company.morale || 50;

  let moraleLabel = 'Stable';
  let moraleColor = T.ivory;
  if (morale >= 80) { moraleLabel = 'Excellent'; moraleColor = T.mint; }
  else if (morale >= 60) { moraleLabel = 'Good'; moraleColor = T.mint; }
  else if (morale <= 20) { moraleLabel = 'Very Low'; moraleColor = T.burgundy; }
  else if (morale < 40) { moraleLabel = 'Low'; moraleColor = T.red; }

  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Company Staff</SectionHeader>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {roles.map(r => {
            const count = staff[r.role as keyof typeof staff] || 0;
            return (
              <PanelBox key={r.role}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{r.role} <span style={{ fontSize: '11px', color: T.gold, marginLeft: '8px' }}>x {count}</span></div>
                    <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>{r.desc}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: T.faint, marginTop: '4px' }}>Base Wage: {formatMoney(r.cost)} /mo</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <GhostButton onClick={() => {
                      const res = fireStaff(company.id, r.role as any);
                      if (res.success) onRefresh();
                    }} disabled={count === 0}>Dismiss</GhostButton>
                    <GoldButton onClick={() => {
                      const res = hireStaff(company.id, r.role as any);
                      if (res.success) onRefresh();
                    }}>Hire</GoldButton>
                  </div>
                </div>
              </PanelBox>
            );
          })}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Human Resources</SectionHeader>
        <PanelBox>
          <FieldRow label="Total Employees" value={totalStaff} />
          <FieldRow label="Morale" value={moraleLabel} valueColor={moraleColor} />
          <FieldRow label="Employer Reputation" value={company.reputation} />
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid ' + T.border }}>
            <FieldRow label="Base Payroll" value={formatMoney(totalPayroll)} />
            <FieldRow label="Actual Payroll Burden" value={formatMoney(actualPayroll)} valueColor={T.red} />
          </div>
        </PanelBox>

        <SectionHeader>Wage Policy</SectionHeader>
        <PanelBox>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Adjusting wage policy impacts payroll burden, staff morale, employer reputation, and employee turnover over time.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Low', 'Standard', 'Generous', 'Premium'].map(p => (
              <button
                key={p}
                onClick={() => {
                  company.wagePolicy = p;
                  saveCompany(company);
                  onRefresh();
                }}
                style={{
                  padding: '12px',
                  background: company.wagePolicy === p ? 'rgba(201,162,74,0.08)' : 'rgba(255,255,255,0.02)',
                  border: company.wagePolicy === p ? '1px solid ' + T.gold : '1px solid ' + T.border,
                  color: company.wagePolicy === p ? T.gold : T.ivory,
                  textAlign: 'left', cursor: 'pointer', fontSize: '12px'
                }}
              >
                {p} Wages
              </button>
            ))}
          </div>
        </PanelBox>
      </div>
    </div>
  );
}

`;

code = code.replace(/\/\/ ─────────────────────────────────────────────────────────────────────────────\r?\n\/\/ OPERATIONS TAB/, staffTabCode + "\n// ─────────────────────────────────────────────────────────────────────────────\n// OPERATIONS TAB");


// 4. Update Operations Tab completely
const opsTabStart = code.indexOf(`function OperationsTab({ company, fleet, setDeskTab, onRefresh }: any) {`);
const opsTabEnd = code.indexOf(`function ContractsTab`, opsTabStart);

if (opsTabStart !== -1 && opsTabEnd !== -1) {
  const newOpsTab = `function OperationsTab({ company, fleet, setDeskTab, onRefresh }: any) {
  const [report, setReport] = useState<any>(company.lastMonthlyReport || null);

  const handleRunMonthly = () => {
    const res = processMonthlyOperations(company.id);
    if (res.success) {
      setReport(res.report);
      onRefresh();
    }
  };

  const autoOpVehicles = fleet.filter((v:any) => v.assignedAutoOpPool);
  const driverCount = company.staff?.['Driver'] || 0;
  const founderException = (fleet.length === 1 && driverCount === 0 && fleet[0].capacity <= 2) ? 1 : 0;
  const totalDrivers = driverCount + founderException;
  const driverShortage = autoOpVehicles.length > totalDrivers;

  return (
    <div className="business-content-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Monthly Operations</SectionHeader>
        <PanelBox>
          <div style={{ fontSize: '13px', color: T.ivory, marginBottom: '8px', fontWeight: 700 }}>Close Business Month</div>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: 1.6 }}>
            Process monthly operations to advance the game date by 1 month. This will calculate auto operations revenue, deduct fleet maintenance, process facility lease expenses, and pay staff payroll.
            Morale, reliability, and vehicle conditions will update based on company policies.
          </div>
          <GoldButton onClick={handleRunMonthly} style={{ width: '100%', padding: '16px' }}>⚡ Close Business Month</GoldButton>
        </PanelBox>

        {report && (
          <PanelBox>
            <SectionHeader stamp={report.gameDateStr}>Monthly Operations Report</SectionHeader>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: T.gold, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}>Revenue</div>
              <FieldRow label="Auto Operations" value={formatMoney(report.autoRevenue)} valueColor={T.mint} />
              <FieldRow label="Manual Contracts" value={formatMoney(report.manualRevenue)} valueColor={T.mint} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: T.red, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}>Costs & Expenses</div>
              <FieldRow label="Direct Operating Costs" value={formatMoney(report.operatingCosts)} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(report.fleetMaintenance)} valueColor={T.red} />
              <FieldRow label="Facility Lease Expense" value={formatMoney(report.facilityLeaseExpense)} valueColor={T.red} />
              <FieldRow label="Payroll Expense" value={formatMoney(report.payrollExpense)} valueColor={T.red} />
            </div>
            <div style={{ borderTop: '1px solid ' + T.border, paddingTop: '16px', marginBottom: '16px' }}>
              <FieldRow label={report.netProfit >= 0 ? "Net Profit" : "Operating Loss"} value={formatMoney(Math.abs(report.netProfit))} valueColor={report.netProfit >= 0 ? T.mint : T.burgundy} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}>Staff & Fleet Effects</div>
              <FieldRow label="Morale Shift" value={report.moraleChange} />
              <FieldRow label="Reliability" value={report.reliabilityChange} />
              <FieldRow label="Employer Reputation" value={report.reputationChange} />
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', fontSize: '10px', color: T.muted }}>
                {report.fleetConditionChanges.length > 0 ? report.fleetConditionChanges.map((c: string, i: number) => <div key={i}>{c}</div>) : 'No fleet deterioration.'}
              </div>
            </div>
          </PanelBox>
        )}

        <SectionHeader stamp="RECURRING">Auto Operations Pools</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {[
            { id: 'Local Delivery Pool', name: 'Local Courier & Delivery', desc: 'Short-range city ops.', minCap: 1 },
            { id: 'Retail Restock Pool', name: 'Retail Restocking', desc: 'Mid-range supply runs.', minCap: 2 },
            { id: 'Port Shuttle Pool', name: 'Port Cargo Shuttles', desc: 'Dockside container movement.', minCap: 2 },
            { id: 'Farm Collection Pool', name: 'Agricultural Collection', desc: 'Rural routes.', minCap: 3 },
            { id: 'Industrial Supply Pool', name: 'Industrial Supply Runs', desc: 'Heavy industry transport.', minCap: 4 }
          ].map(pool => {
            const count = fleet.filter((v:any) => v.assignedAutoOpPool === pool.id).length;
            return (
              <PanelBox key={pool.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pool.name}
                    {count > 0 && <span style={{ fontSize: '10px', background: T.mint, color: T.bg, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{count} Active</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: T.muted, marginTop: '4px' }}>{pool.desc} (Min Cap {pool.minCap})</div>
                </div>
                <GhostButton onClick={() => setDeskTab('fleet')}>Manage</GhostButton>
              </PanelBox>
            );
          })}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SectionHeader>Operations Context</SectionHeader>
        <PanelBox>
          <FieldRow label="Vehicles assigned to Ops" value={autoOpVehicles.length} />
          <FieldRow label="Drivers Available" value={totalDrivers} />
          <FieldRow label="Fleet Utilization" value={Math.round((autoOpVehicles.length / (fleet.length || 1)) * 100) + '%'} />
          {driverShortage && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(143,61,61,0.1)', border: '1px solid ' + T.burgundy, fontSize: '11px', color: T.red }}>
              ⚠ Driver Shortage! You have more vehicles assigned to operations than available drivers. Unstaffed vehicles will stay idle and earn zero revenue.
            </div>
          )}
          {company.staff?.['Dispatcher'] > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(54, 211, 153, 0.05)', border: '1px dashed ' + T.mint, fontSize: '11px', color: T.mint }}>
              ✓ Dispatcher Active: +8% Auto Operations Revenue
            </div>
          )}
          {company.staff?.['Mechanic Crew'] > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(201,162,74,0.05)', border: '1px dashed ' + T.gold, fontSize: '11px', color: T.gold }}>
              ✓ Mechanic Crew Active: Slower vehicle condition wear.
            </div>
          )}
        </PanelBox>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// `;
  code = code.slice(0, opsTabStart) + newOpsTab + code.slice(opsTabEnd - 105); 
  // Wait, opsTabEnd is `function ContractsTab`. I should just slice up to `function ContractsTab`.
  code = code.slice(0, opsTabStart) + newOpsTab + code.slice(opsTabEnd);
}

fs.writeFileSync(file, code);
console.log('Tabs updated');
