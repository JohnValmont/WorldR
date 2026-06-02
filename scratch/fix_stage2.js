const fs = require('fs');

function build() {
  let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

  // Overview Tab layout in CompanyDeskTab
  let overviewTarget = `          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>`;
  let newOverview = `          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>`;
  if (code.includes(overviewTarget)) {
    code = code.replace(overviewTarget, newOverview);
  } else {
    console.error("Could not find overviewTarget");
  }

  // Find where Overview tab ends (before Operations tab) and insert the right rail
  let overviewEndTarget = `      {deskTab === 'operations' && (`;
  let newOverviewEnd = `          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Operations Summary</SectionHeader>
              <FieldRow label="Total Fleet" value={fleet.length} />
              <FieldRow label="Assigned Vehicles" value={fleet.filter(v => v.assignedContractId || v.assignedAutoOpPool).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
              <div style={{ height: '1px', background: T.border, margin: '12px 0' }} />
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Auto Ops Pools Active" value={new Set(fleet.filter(v => v.assignedAutoOpPool).map(v => v.assignedAutoOpPool)).size} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active Contracts" value={activeContracts.length} />
              <FieldRow label="Completed" value={contractHistory.filter(h => h.result === 'completed').length} />
              <FieldRow label="Failed" value={contractHistory.filter(h => h.result === 'failed').length} valueColor={T.red} />
            </PanelBox>
            <PanelBox>
              <SectionHeader stamp="RECORDS">Recent Records</SectionHeader>
              {records.filter((r:any) => r.companyId === company.id).slice(0, 3).map((r:any, i:number) => (
                <div key={i} style={{ fontSize: '11px', color: T.muted, marginBottom: '8px', paddingBottom: '8px', borderBottom: i < 2 ? \`1px solid \${T.border}\` : 'none' }}>
                  {r.text || r.msg}
                </div>
              ))}
              {records.filter((r:any) => r.companyId === company.id).length === 0 && (
                <div style={{ fontSize: '11px', color: T.faint }}>No recent records.</div>
              )}
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'operations' && (`;
  
  // We need to also wrap {deskTab === 'overview' && ( ... )} in <div className="business-content-grid">
  let overviewStartTarget = `{deskTab === 'overview' && (\r\n        <div>`;
  let overviewStartTargetUnix = `{deskTab === 'overview' && (\n        <div>`;
  let newOverviewStart = `{deskTab === 'overview' && (\n        <div className="business-content-grid">\n          <div>`;
  if (code.includes(overviewStartTarget)) {
    code = code.replace(overviewStartTarget, newOverviewStart);
  } else if (code.includes(overviewStartTargetUnix)) {
    code = code.replace(overviewStartTargetUnix, newOverviewStart);
  }

  // Find the exact text before Operations
  let oldOverviewEnd = `              </div>\r\n            </PanelBox>\r\n          </div>\r\n        </div>\r\n      )}\r\n\r\n      {deskTab === 'operations' && (`;
  let oldOverviewEndUnix = oldOverviewEnd.replace(/\\r\\n/g, '\\n');
  if (code.includes(oldOverviewEnd)) {
    code = code.replace(oldOverviewEnd, `              </div>\r\n            </PanelBox>\r\n` + newOverviewEnd);
  } else if (code.includes(oldOverviewEndUnix)) {
    code = code.replace(oldOverviewEndUnix, `              </div>\n            </PanelBox>\n` + newOverviewEnd);
  }

  // Operations Wrapper
  let opsStartTarget = `{deskTab === 'operations' && (\r\n        <div>\r\n          <SectionHeader>Operations Desk</SectionHeader>`;
  let opsStartTargetUnix = opsStartTarget.replace(/\\r\\n/g, '\\n');
  let newOpsStart = `{deskTab === 'operations' && (\n        <div className="business-content-grid">\n          <div>\n          <SectionHeader>Operations Desk</SectionHeader>`;
  if (code.includes(opsStartTarget)) code = code.replace(opsStartTarget, newOpsStart);
  else if (code.includes(opsStartTargetUnix)) code = code.replace(opsStartTargetUnix, newOpsStart);

  let opsEndTarget = `              </PanelBox>\r\n            </div>\r\n          </div>\r\n        </div>\r\n      )}\r\n\r\n      {deskTab === 'fleet' && (`;
  let opsEndTargetUnix = opsEndTarget.replace(/\\r\\n/g, '\\n');
  let newOpsEnd = `              </PanelBox>
            </div>
          </div>
          <div>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Fleet Utilization</SectionHeader>
              <FieldRow label="Total Vehicles" value={fleet.length} />
              <FieldRow label="Assigned to Auto Ops" value={fleet.filter(v => v.assignedAutoOpPool).length} valueColor={T.gold} />
              <FieldRow label="Assigned to Contracts" value={fleet.filter(v => v.assignedContractId).length} valueColor={T.mint} />
              <FieldRow label="Idle Vehicles" value={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length} valueColor={fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 ? T.red : T.muted} />
            </PanelBox>
            <PanelBox style={{ marginBottom: '16px' }}>
              <SectionHeader>Monthly Estimate</SectionHeader>
              <FieldRow label="Est. Auto Revenue" value="Varies" valueColor={T.mint} />
              <FieldRow label="Operating Costs" value={formatMoney(company.monthlyCosts)} valueColor={T.red} />
              <FieldRow label="Fleet Maintenance" value={formatMoney(fleet.reduce((sum, v) => sum + v.monthlyMaintenance, 0))} valueColor={T.red} />
              <div style={{ marginTop: '12px', padding: '10px 0', borderTop: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Projected Net</span>
                <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.muted }}>?</span>
              </div>
            </PanelBox>
            {fleet.filter(v => !v.assignedContractId && !v.assignedAutoOpPool).length > 0 && (
              <PanelBox style={{ marginBottom: '16px', background: 'rgba(184,85,85,0.05)', border: \`1px solid \${T.red}\` }}>
                <SectionHeader>Idle Fleet Warning</SectionHeader>
                <div style={{ fontSize: '11px', color: T.red }}>You have idle vehicles. They cost maintenance without generating revenue.</div>
              </PanelBox>
            )}
            <PanelBox>
              <SectionHeader>Contract Pipeline</SectionHeader>
              <FieldRow label="Active Contracts" value={activeContracts.length} />
            </PanelBox>
          </div>
        </div>
      )}

      {deskTab === 'fleet' && (`
  if (code.includes(opsEndTarget)) code = code.replace(opsEndTarget, newOpsEnd);
  else if (code.includes(opsEndTargetUnix)) code = code.replace(opsEndTargetUnix, newOpsEnd);


  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
  console.log("Stage 2a done.");
}

build();
