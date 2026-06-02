const fs = require('fs');

function applyFixes() {
  const content = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');
  let lines = content.split(/\\r?\\n/);
  
  // Find lines to replace
  function findLineRange(startMarker, endMarker, fromIndex = 0) {
    let startIdx = -1;
    let endIdx = -1;
    for (let i = fromIndex; i < lines.length; i++) {
      if (startIdx === -1 && lines[i].includes(startMarker)) {
        startIdx = i;
      }
      if (startIdx !== -1 && endIdx === -1 && lines[i].includes(endMarker)) {
        endIdx = i;
        break;
      }
    }
    return [startIdx, endIdx];
  }

  // 1. BusinessPage layout modifications
  let [startApp, _] = findLineRange("<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>", "");
  if (startApp !== -1) {
    lines.splice(startApp + 1, 0, 
`      {/* ── Global Back to Chronicle ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <span style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => router.push('/drennia/chronicle')}>
          ← Back to Chronicle
        </span>
      </div>`
    );
  }

  let [innerApp, __] = findLineRange("<div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>", "");
  if (innerApp !== -1) {
    lines[innerApp] = `<div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="business-page-inner">`;
  }

  // Find the end of BusinessPage
  let [endAppStart, endAppEnd] = findLineRange("{activeTab === 'registry'", "// ───");
  if (endAppStart !== -1 && endAppEnd !== -1) {
    // The original structure is:
    // {activeTab === 'registry'  && <RegistryTab company={company} />}
    //       </div>
    //     </div>
    //   );
    // }
    for (let i = endAppStart; i < endAppEnd; i++) {
      if (lines[i].trim() === "</div>") {
        // We need to add one extra </div>
        lines.splice(i, 0, "      </div>");
        break;
      }
    }
  }

  // 2. Remove "Back to Business Overview" from StartBusiness
  let [backToOverview, ___] = findLineRange("← Back to Business Overview", "");
  if (backToOverview !== -1) {
    lines[backToOverview] = "";
    lines[backToOverview - 1] = "";
    lines[backToOverview + 1] = "";
    lines[backToOverview + 2] = ""; // remove the whole span
  }

  // 3. StartBusinessTab Wrapper
  let [startBusIdx, ____] = findLineRange("function StartBusinessTab", "");
  let [startBusDiv, _____] = findLineRange("<div style={{ maxWidth: '620px' }}>", "", startBusIdx);
  if (startBusDiv !== -1) {
    lines.splice(startBusDiv, 0, `    <div className="business-content-grid">`);
  }

  let [startBusEnd, ______] = findLineRange("Next: Confirm Filing →", "", startBusDiv);
  if (startBusEnd !== -1) {
    for (let i = startBusEnd; i < startBusEnd + 10; i++) {
      if (lines[i].includes("</div>")) {
        lines.splice(i + 1, 0, 
`  {/* Right Rail: Filing Summary */}
  <div>
    <PanelBox style={{ position: 'sticky', top: '24px' }}>
      <SectionHeader stamp="SUMMARY">Filing Application</SectionHeader>
      <FieldRow label="Name" value={companyNameInput || 'Pending'} />
      <FieldRow label="Sector" value={selectedSector || 'Pending'} />
      <FieldRow label="HQ State" value={selectedHQ || 'Pending'} />
      <FieldRow label="Structure" value="Sole Trader" />
      <FieldRow label="Operating Model" value={selectedModel || 'Pending'} valueColor={T.gold} />
      <div style={{ margin: '16px 0', borderTop: \`1px solid \${T.border}\` }} />
      <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor={T.mint} />
      <FieldRow label="Filing Fee" value={formatMoney(5000)} valueColor={T.red} />
      <div style={{ marginTop: '12px', padding: '10px 0', borderTop: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Total Cost</span>
        <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(chosenCapital + 5000)}</span>
      </div>
      <FieldRow label="Remaining Cash" value={formatMoney(playerCash - (chosenCapital + 5000))} valueColor={playerCash >= (chosenCapital + 5000) ? T.mint : T.red} />
    </PanelBox>
  </div>
</div>`
        );
        break;
      }
    }
  }

  // 4. Overview Tab Wrapper
  let [overviewIdx, _______] = findLineRange("function OverviewTab", "");
  let [overviewDiv, ________] = findLineRange("<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '860px' }}>", "", overviewIdx);
  if (overviewDiv !== -1) {
    lines[overviewDiv] = `    <div className="business-content-grid">\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>`;
  }
  let [overviewEnd, _________] = findLineRange('<FieldRow label="Net Worth (total)"', "", overviewDiv);
  if (overviewEnd !== -1) {
    for (let i = overviewEnd; i < overviewEnd + 5; i++) {
      if (lines[i].includes("</PanelBox>")) {
        lines.splice(i + 1, 0, 
`      </div>
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Operations Summary</SectionHeader>
          <FieldRow label="Total Fleet" value={company.facilities?.length ? "See Fleet" : "0"} />
          <FieldRow label="Active Auto Ops" value="0" />
        </PanelBox>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Contract Pipeline</SectionHeader>
          <FieldRow label="Active" value={company.activeContracts?.length || 0} valueColor={T.gold} />
        </PanelBox>
        <PanelBox>
          <SectionHeader stamp="ACTIONS">Next Actions</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GhostButton onClick={() => onViewContracts()}>Manage Company</GhostButton>
            <GhostButton onClick={() => onViewContracts()}>View Contract Board</GhostButton>
            <GhostButton onClick={() => onViewRegistry()}>View Registry</GhostButton>
          </div>
        </PanelBox>
      </div>
    </div>`
        );
        break;
      }
    }
  }

  // 5. My Companies List View
  let [myCompIdx, __________] = findLineRange("Additional Companies", "");
  if (myCompIdx !== -1) {
    let [myCompStart, ___________] = findLineRange("<div style={{ maxWidth: '860px' }}>", "", 0);
    // Find the closest maxWidth 860px BEFORE the myCompIdx
    let correctStart = -1;
    for (let i = myCompIdx; i >= 0; i--) {
      if (lines[i].includes("<div style={{ maxWidth: '860px' }}>")) {
        correctStart = i;
        break;
      }
    }
    if (correctStart !== -1) {
      lines[correctStart] = `<div className="business-content-grid">\n            <div>`;
    }

    let [myCompEnd, ____________] = findLineRange("Multiple company ownership", "", myCompIdx);
    if (myCompEnd !== -1) {
      for (let i = myCompEnd; i < myCompEnd + 10; i++) {
        if (lines[i].includes(")}")) {
          // This is the closing of {activeTab === 'companies' && company && !selectedCompanyId && (
          // Insert BEFORE this line
          lines.splice(i - 3, 3); // Remove the 3 closing divs from the old layout
          lines.splice(i - 3, 0, 
`            </div>
            <div>
              <PanelBox style={{ marginBottom: '16px' }}>
                <SectionHeader stamp="PORTFOLIO">Ownership Summary</SectionHeader>
                <FieldRow label="Companies Owned" value="1 / 1" />
                <FieldRow label="Total Company Value" value={formatMoney(calcCompanyValue(company))} valueColor={T.gold} />
                <FieldRow label="Total Company Cash" value={formatMoney(company.companyCash)} valueColor={T.mint} />
              </PanelBox>
              <PanelBox style={{ marginBottom: '16px', borderLeft: \`2px dashed \${T.faint}\`, opacity: 0.8 }}>
                <SectionHeader>Expansion Locked</SectionHeader>
                <p style={{ fontSize: '11px', color: T.muted }}>Multiple companies, subsidiaries, and holding structures coming soon.</p>
              </PanelBox>
              <PanelBox>
                <SectionHeader stamp="ACTIONS">Quick Actions</SectionHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <GoldButton onClick={() => setSelectedCompanyId(company.id)}>Manage Active Company</GoldButton>
                  <GhostButton onClick={() => setActiveTab('registry')}>Open Registry</GhostButton>
                </div>
              </PanelBox>
            </div>
          </div>`
          );
          break;
        }
      }
    }
  }

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', lines.join('\n'));
  console.log("Safely applied top level grid wrappers.");
}

applyFixes();
