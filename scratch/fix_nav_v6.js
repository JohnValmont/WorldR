const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

try {
  // 1. Add Market to SUB_TABS (find registry and put market before it)
  c = c.replace(
    /\{ id: 'companies',  label: 'My Companies', requiresCompany: true \},\s*\{ id: 'registry',   label: 'Registry' \}/,
    `{ id: 'companies',  label: 'My Companies', requiresCompany: true },\n    { id: 'market',     label: 'Market' },\n    { id: 'registry',   label: 'Registry' }`
  );

  // 2. Fix DESK_TABS order and add facilities
  c = c.replace(
    /const DESK_TABS: \{ id: CompanyDeskTab; label: string \}.. = \[\s*(?:\{[^}]+\},\s*)+\];/,
    `const DESK_TABS: { id: CompanyDeskTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'operations', label: 'Operations' },
    { id: 'contracts',  label: 'Contracts'  },
    { id: 'facilities', label: 'Facilities' },
    { id: 'assets',     label: 'Assets'     },
    { id: 'fleet',      label: 'Fleet'      },
    { id: 'routes',     label: 'Routes'     },
    { id: 'finance',    label: 'Finance'    },
    { id: 'contractHistory', label: 'Contract History' },
    { id: 'records',    label: 'Records'    },
    { id: 'equity',     label: 'Equity'     },
  ];`
  );

  // 3. Update CompanyDeskTab type signature
  c = c.replace(
    /type CompanyDeskTab = [^;]+;/,
    "type CompanyDeskTab = 'overview' | 'operations' | 'contracts' | 'facilities' | 'assets' | 'fleet' | 'routes' | 'finance' | 'contractHistory' | 'records' | 'equity';"
  );

  // 4. Hide parent tabs when inside company
  c = c.replace(
    /\{\/\* Subtabs \*\/\}\s*<div style=\{\{ display: 'flex', gap: '0', overflowX: 'auto', marginTop: '8px' \}\}>\s*\{SUB_TABS\.map\(tab => \{/,
    `{/* Subtabs */}
        {!(activeTab === 'companies' && selectedCompanyId) && (
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto', marginTop: '8px' }}>
          {SUB_TABS.map(tab => {`
  );

  c = c.replace(
    /\{tab\.label\}\{locked \? ' 🔒' : ''\}\s*<\/button>\s*\);\s*\}\)\}\s*<\/div>\s*<\/div>\s*\{\/\* ── Back \/ Breadcrumb Navigation \(Anchors\) ── \*\/\}/,
    `{tab.label}{locked ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* ── Back / Breadcrumb Navigation (Anchors) ── */}`
  );

  // 5. Remove useless back button for Start Business
  c = c.replace(
    /\{activeTab === 'start' && \(\s*<span[^>]+onClick=\{[^>]+setActiveTab\('overview'\)[^>]*>[^<]+<\/span>\s*\)\}/,
    ``
  );

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
  console.log("Success");
} catch (e) {
  console.error(e.message);
}
