const fs = require('fs');

let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

const bPageStart = c.indexOf('{/* ── Subtabs & Breadcrumbs ── */}');
const bPageEnd = c.indexOf('{/* ── Back / Breadcrumb Navigation (Anchors) ── */}');
const isManagingCompanyStr = `
        {/* Dynamic Breadcrumbs */}
        {(() => {
          const isManagingCompany = activeTab === 'companies' && selectedCompanyId && company;
          return (
            <>
              <div style={{ display: 'flex', gap: '8px', padding: '12px 0 4px', fontSize: '10px', fontFamily: 'monospace', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <span style={{ cursor: 'pointer', color: activeTab === 'overview' ? T.gold : T.muted }} onClick={() => { setActiveTab('overview'); setSelectedCompanyId(null); }}>Business Desk</span>
                {activeTab === 'companies' && (
                  <>
                    <span>→</span>
                    <span style={{ cursor: 'pointer', color: !selectedCompanyId ? T.gold : T.muted }} onClick={() => setSelectedCompanyId(null)}>My Companies</span>
                  </>
                )}
                {isManagingCompany && (
                  <>
                    <span>→</span>
                    <span style={{ color: T.gold }}>{company?.name}</span>
                  </>
                )}
              </div>

              {/* Subtabs */}
              {!isManagingCompany && (
                <div style={{ display: 'flex', gap: '0', overflowX: 'auto', marginTop: '8px' }}>
                  {SUB_TABS.map(tab => {
                    const locked = tab.requiresCompany && !company;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          if (!locked) {
                            setActiveTab(tab.id);
                            if (tab.id !== 'companies') setSelectedCompanyId(null);
                          }
                        }}
                        style={{
                          padding: '10px 16px', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em',
                          fontWeight: isActive ? 700 : 500, color: locked ? T.faint : isActive ? T.gold : T.muted,
                          background: 'transparent', border: 'none', borderBottom: isActive ? \`2px solid \${T.gold}\` : '2px solid transparent',
                          cursor: locked ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s',
                        }}
                        title={locked ? 'Register a company to unlock' : undefined}
                      >
                        {tab.label}{locked ? ' 🔒' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
`;
let newDiv = `{/* ── Subtabs & Breadcrumbs ── */}
      <div style={{ padding: '0 24px', borderBottom: \`1px solid \${T.border}\`, flexShrink: 0 }}>` + isManagingCompanyStr + `      </div>\n\n      `;
c = c.substring(0, bPageStart) + newDiv + c.substring(bPageEnd);

const backNavStart = c.indexOf('{/* ── Back / Breadcrumb Navigation (Anchors) ── */}');
const backNavEnd = c.indexOf('{/* ── Tab Content ── */}');
c = c.substring(0, backNavStart) + 
`{/* ── Back / Breadcrumb Navigation (Anchors) ── */}
      <div style={{ padding: '8px 24px 0', flexShrink: 0 }}>
        {activeTab === 'companies' && selectedCompanyId && company && (
          <span style={{ cursor: 'pointer', color: T.gold, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => setSelectedCompanyId(null)}>
            ← Back to My Companies
          </span>
        )}
      </div>\n\n      ` + c.substring(backNavEnd);

fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Done chunk 2');
