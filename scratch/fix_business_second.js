const fs = require('fs');

let content = fs.readFileSync('d:/WorldR/frontend/src/app/drennia/business/page.tsx', 'utf-8');

// 1. Overview Tab Updates (Fleet Utilization)
const overviewBlock = `          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <SectionHeader>Fleet Status</SectionHeader>
              {fleet.length === 0 ? (
                <p style={{ fontSize: '12px', color: T.faint }}>No vehicles. Go to Fleet tab to buy your first vehicle.</p>
              ) : (
                fleet.map(v => (
                  <FieldRow key={v.id} label={v.type} value={\`Capacity \${v.capacity} · \${v.condition}%\${v.assignedContractId ? ' · ACTIVE' : v.assignedAutoOpPool ? ' · AUTO' : ' · Available'}\`} valueColor={v.assignedContractId || v.assignedAutoOpPool ? T.gold : T.mint} />
                ))
              )}
            </PanelBox>`;

const newOverviewBlock = `          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <SectionHeader>Operations Summary</SectionHeader>
              <FieldRow label="Total Fleet" value={fleet.length} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Auto Ops Pools Active" value={new Set(fleet.filter(v => v.assignedAutoOpPool).map(v => v.assignedAutoOpPool)).size} />
            </PanelBox>`;

content = content.replace(overviewBlock, newOverviewBlock);

// 2. Add Operations Tab
// Wait, deskTab === 'operations' doesn't exist yet, I'll add it right before deskTab === 'fleet'
const fleetTabStart = `      {deskTab === 'fleet' && (`;
const operationsTabBlock = `      {deskTab === 'operations' && (
        <div>
          <SectionHeader>Operations Desk</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Fleet Assignment</div>
              <FieldRow label="Total Vehicles" value={fleet.length} />
              <FieldRow label="On Contracts" value={fleet.filter(v => v.assignedContractId).length} valueColor={T.mint} />
              <FieldRow label="On Auto Ops" value={fleet.filter(v => v.assignedAutoOpPool).length} valueColor={T.gold} />
              <FieldRow label="Idle (Unassigned)" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Run Operations</div>
              <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Run monthly auto operations to process recurring revenue, operating costs, and fixed maintenance. Idle vehicles still incur maintenance.</p>
              <GoldButton onClick={handleRunAutoOps} disabled={fleet.length === 0}>
                Run Monthly Operations (Test)
              </GoldButton>
            </PanelBox>
          </div>

          <SectionHeader stamp="RECURRING">Auto Operations Pools</SectionHeader>
          <p style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>Assign idle vehicles to recurring local pools. This generates steady monthly income but wears down vehicle condition.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {['Local Delivery Pool', 'Port Shuttle Pool'].map(pool => {
              const marketDemand = pool === 'Port Shuttle Pool' ? 'High' : 'Moderate';
              const marketComp = pool === 'Port Shuttle Pool' ? 'Moderate' : 'High';
              return (
              <PanelBox key={pool}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '8px' }}>{pool}</div>
                <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
                  {pool === 'Local Delivery Pool' ? 'High volume local courier work around Drennport. Steady demand, high competition.' : 'Container and crate movement around Westport docks. High demand.'}
                </div>
                
                <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontFamily: 'monospace', color: T.faint, marginBottom: '12px' }}>
                  <span>Demand: <span style={{ color: marketDemand === 'High' ? T.mint : T.gold }}>{marketDemand}</span></span>
                  <span>Competition: <span style={{ color: marketComp === 'High' ? T.red : T.gold }}>{marketComp}</span></span>
                </div>
                
                {fleet.filter(v => v.assignedAutoOpPool === pool).map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', fontSize: '11px' }}>
                    <span>{v.type} ({v.condition}%)</span>
                    <GhostButton onClick={() => handleAssignAutoOp(v.id, null)} color={T.red}>Remove</GhostButton>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <select id={\`pool-sel-\${pool.replace(/\\s+/g, '')}\`} style={{ padding: '6px', background: T.panel, color: T.ivory, border: \`1px solid \${T.border}\`, fontSize: '11px', flex: 1 }}>
                    <option value="">Select available vehicle...</option>
                    {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).map(v => (
                      <option key={v.id} value={v.id}>{v.type} ({v.condition}%)</option>
                    ))}
                  </select>
                  <GhostButton onClick={() => {
                    const sel = document.getElementById(\`pool-sel-\${pool.replace(/\\s+/g, '')}\`) as HTMLSelectElement;
                    if (sel && sel.value) handleAssignAutoOp(sel.value, pool as any);
                  }}>Assign</GhostButton>
                </div>
              </PanelBox>
            )})}
          </div>
        </div>
      )}

      {deskTab === 'fleet' && (`;

content = content.replace(fleetTabStart, operationsTabBlock);

// 3. Remove Auto Operations block from deskTab === 'contracts'
const autoOpsStart = `          <div>
            <SectionHeader stamp="RECURRING">Auto Operations</SectionHeader>`;
const autoOpsEnd = `            <GoldButton onClick={handleRunAutoOps} disabled={fleet.filter(v => v.assignedAutoOpPool).length === 0}>
              Run Monthly Auto Operations (Test)
            </GoldButton>
          </div>`;

const autoOpsRegex = new RegExp(autoOpsStart.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + '.*?' + autoOpsEnd.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 's');
content = content.replace(autoOpsRegex, '');

// 4. Update Finance tab
const financeStart = `      {deskTab === 'finance' && (
        <div>
          <SectionHeader>Finance</SectionHeader>
          <PanelBox>
            <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
            <FieldRow label="Monthly Revenue Estimate" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
            <FieldRow label="Monthly Fixed Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
            <FieldRow label="Projected Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
            <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
          </PanelBox>`;

const newFinanceStart = `      {deskTab === 'finance' && (
        <div>
          <SectionHeader>Finance</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Company Position</div>
              <FieldRow label="Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
              <FieldRow label="Total Fleet Value" value={formatMoney(companyValue - company.companyCash + company.debt)} valueColor={T.steel} />
            </PanelBox>
            <PanelBox>
              <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory, marginBottom: '12px' }}>Monthly Estimate</div>
              <FieldRow label="Monthly Revenue" value={formatMoney(company.monthlyRevenue)} valueColor={T.mint} />
              <FieldRow label="Operating Costs" value={formatMoney(company.monthlyCosts - fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((acc, v) => acc + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Projected Profit" value={formatMoney(company.profit)} valueColor={company.profit >= 0 ? T.mint : T.red} />
            </PanelBox>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <SectionHeader>Recent Financial Activity</SectionHeader>
            {records.filter(r => r.type === 'auto_op' || r.type === 'contract').slice(0, 5).map(r => (
              <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: \`2px solid \${T.gold}\`, fontSize: '12px', color: T.ivory, lineHeight: 1.6, marginBottom: '8px' }}>
                {r.summary}
                <div style={{ fontSize: '10px', color: T.faint, marginTop: '6px' }}>{new Date(r.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>`;

content = content.replace(financeStart, newFinanceStart);

fs.writeFileSync('d:/WorldR/frontend/src/app/drennia/business/page.tsx', content);
console.log('Successfully updated page.tsx with operations, fleet, and finance fixes');
