const fs = require('fs');

function build() {
  let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');

  // I will literally do exact substring replaces.
  let target1 = `<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>`;
  code = code.replace(target1, target1 + `\n      {/* ── Global Back to Chronicle ── */}\n      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>\n        <span style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => router.push('/drennia/chronicle')}>\n          ← Back to Chronicle\n        </span>\n      </div>`);

  let target2 = `<div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>`;
  code = code.replace(target2, `<div style={{ flex: 1, overflowY: 'auto' }}>\n        <div className="business-page-inner">`);

  let target3 = `        {activeTab === 'registry'  && <RegistryTab company={company} />}\r\n      </div>\r\n    </div>\r\n  );\r\n}`;
  let target3Unix = target3.replace(/\\r\\n/g, '\\n');
  if (code.includes(target3)) {
    code = code.replace(target3, `        {activeTab === 'registry'  && <RegistryTab company={company} />}\r\n      </div>\r\n    </div>\r\n    </div>\r\n  );\r\n}`);
  } else if (code.includes(target3Unix)) {
    code = code.replace(target3Unix, `        {activeTab === 'registry'  && <RegistryTab company={company} />}\n      </div>\n    </div>\n    </div>\n  );\n}`);
  }

  let target4 = `<span style={{ cursor: 'pointer', color: T.gold, fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }} onClick={() => setStep(0)}>\r\n            ← Back to Business Overview\r\n          </span>`;
  let target4Unix = target4.replace(/\\r\\n/g, '\\n');
  code = code.replace(target4, "");
  code = code.replace(target4Unix, "");

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
  console.log("Stage 1 done.");
}

build();
