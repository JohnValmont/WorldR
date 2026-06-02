const fs = require('fs');

function rewrite() {
  // Finance Tab
  let fin = fs.readFileSync('scratch/extract_finance.js', 'utf8');
  fin = fin.replace(/return \(\s*<div style=\{\{ maxWidth: '860px' \}\}>/m, `return (\n    <div className="business-content-grid">\n      <div>`);
  fin = fin.replace(/<\/div>\s*\)\;\s*\}\s*$/m, `      </div>
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Company Valuation</SectionHeader>
          <FieldRow label="Base Equity" value={formatMoney(10000)} valueColor={T.gold} />
          <FieldRow label="Asset Value" value={formatMoney(companyValue - company.companyCash + company.debt)} valueColor={T.mint} />
          <FieldRow label="Cash Reserves" value={formatMoney(company.companyCash)} valueColor={T.mint} />
          <FieldRow label="Liabilities" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
          <div style={{ margin: '16px 0', borderTop: \`1px solid \${T.border}\` }} />
          <FieldRow label="Total Value" value={formatMoney(companyValue)} valueColor={T.gold} />
        </PanelBox>
        <PanelBox>
          <SectionHeader>Credit & Debt</SectionHeader>
          <FieldRow label="Current Debt" value={formatMoney(company.debt)} valueColor={company.debt > 0 ? T.red : T.muted} />
          <FieldRow label="Credit Rating" value="A+" valueColor={T.gold} />
          <div style={{ fontSize: '11px', color: T.faint, marginTop: '8px' }}>Pay off your debts to improve your credit rating and borrow more capital for expansion.</div>
        </PanelBox>
      </div>
    </div>
  );
}\n\n`);
  fs.writeFileSync('scratch/extract_finance.js', fin);

  // Assets Tab
  let ast = fs.readFileSync('scratch/extract_assets.js', 'utf8');
  ast = ast.replace(/return \(\s*<div style=\{\{ maxWidth: '860px' \}\}>/m, `return (\n    <div className="business-content-grid">\n      <div>`);
  ast = ast.replace(/<\/div>\s*\)\;\s*\}\s*$/m, `      </div>
      <div>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Facility Benefits</SectionHeader>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>• <strong>Depot:</strong> Unlocks auto-ops and local yield boosts.</div>
          <div style={{ fontSize: '11px', color: T.muted, marginBottom: '6px' }}>• <strong>Branch Office:</strong> Reduces interstate dispatch penalty.</div>
        </PanelBox>
        <PanelBox style={{ marginBottom: '16px' }}>
          <SectionHeader>Current Lease Burden</SectionHeader>
          <FieldRow label="Monthly Lease Expense" value={formatMoney((company.facilities || []).reduce((s:any, f:any) => s + f.leaseCost, 0))} valueColor={T.red} />
        </PanelBox>
        <PanelBox>
          <SectionHeader>Expansion Readiness</SectionHeader>
          <FieldRow label="States with Presence" value={new Set((company.facilities || []).map((f:any) => f.state)).size} />
        </PanelBox>
      </div>
    </div>
  );
}\n\n`);
  fs.writeFileSync('scratch/extract_assets.js', ast);

  console.log("Rewrote tabs successfully.");
}

rewrite();
