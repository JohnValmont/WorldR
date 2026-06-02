const fs = require('fs');

function applyFixes() {
  let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');
  
  // 1. Global Back to Chronicle button + Page Inner
  code = code.replace(
    /<div style=\{\{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T\.bg, color: T\.ivory, overflow: 'hidden' \}\}>/, 
    `<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* ── Global Back to Chronicle ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <span style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => router.push('/drennia/chronicle')}>
          ← Back to Chronicle
        </span>
      </div>`
  );

  code = code.replace(/<div style=\{\{ flex: 1, overflowY: 'auto', padding: '24px' \}\}>/, 
`<div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="business-page-inner">`);

  code = code.replace(/(\s*)(<\/div>\n\s*<\/div>\n\s*\)\;\n\}\n\n\/\/ ───)/, 
`$1  </div>
      </div>
    </div>
  );
}

// ───`);

  // 2. Remove "Back to Business Overview"
  code = code.replace(/\{activeTab === 'start' && \([\s\S]*?← Back to Business Overview[\s\S]*?<\/span>\s*\)\}/, '');

  // 3. Start Business Layout
  code = code.replace(/(function StartBusinessTab[\s\S]*?return \(\n\s*)(<div style=\{\{ maxWidth: '620px' \}\}>)/, 
`$1<div className="business-content-grid">
      $2`);
  
  let startEndRegex = /(Step 7 — Confirm[\s\S]*?Next: Confirm Filing →[\s\S]*?<\/div>\n\s*\}?)\n(\s*)(<\/div>\n\s*\)\;\n\})/;
  code = code.replace(startEndRegex,
`$1
$2  {/* Right Rail: Filing Summary */}
$2  <div>
$2    <PanelBox style={{ position: 'sticky', top: '24px' }}>
$2      <SectionHeader stamp="SUMMARY">Filing Application</SectionHeader>
$2      <FieldRow label="Name" value={companyNameInput || 'Pending'} />
$2      <FieldRow label="Sector" value={selectedSector || 'Pending'} />
$2      <FieldRow label="HQ State" value={selectedHQ || 'Pending'} />
$2      <FieldRow label="Structure" value="Sole Trader" />
$2      <FieldRow label="Operating Model" value={selectedModel || 'Pending'} valueColor={T.gold} />
$2      <div style={{ margin: '16px 0', borderTop: \`1px solid \${T.border}\` }} />
$2      <FieldRow label="Capital Filed" value={formatMoney(chosenCapital)} valueColor={T.mint} />
$2      <FieldRow label="Filing Fee" value={formatMoney(5000)} valueColor={T.red} />
$2      <div style={{ marginTop: '12px', padding: '10px 0', borderTop: \`1px solid \${T.border}\`, display: 'flex', justifyContent: 'space-between' }}>
$2        <span style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>Total Cost</span>
$2        <span style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: T.gold }}>{formatMoney(chosenCapital + 5000)}</span>
$2      </div>
$2      <FieldRow label="Remaining Cash" value={formatMoney(playerCash - (chosenCapital + 5000))} valueColor={playerCash >= (chosenCapital + 5000) ? T.mint : T.red} />
$2    </PanelBox>
$2  </div>
$3</div>
  );
}`);

  // 4. Overview Tab (Global)
  code = code.replace(/return \(\n\s*<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '860px' \}\}>/g,
`return (
    <div className="business-content-grid">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>`);
  code = code.replace(/(<FieldRow label="Net Worth \(total\)"[\s\S]*?<\/PanelBox>\n\s*)(<\/div>\n\s*\);)/,
`$1</div>
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
    </div>
  );`);

  // 5. My Companies List View
  code = code.replace(/(<div style=\{\{ maxWidth: '860px' \}\}>)/, '<div className="business-content-grid">\n            <div>');
  code = code.replace(/(“Multiple company ownership, subsidiaries, holding companies, and cross-sector business groups will unlock later. Pre-alpha currently supports one active company.”\n\s*<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*)(<\/div>\n\s*\}\))/g,
`$1</div>
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
          </div>
        )}`);

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
  console.log('Successfully applied top half fixes.');
}
applyFixes();
