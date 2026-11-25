const { open, BASE } = require('./film-lib.cjs');
const fs = require('fs');
(async () => {
  const { browser, page } = await open('elena.marsh@example.com');
  await page.goto(BASE + '/drennia/politics?tab=world'); await page.waitForTimeout(5000);
  const svgs = await page.$$eval('svg[viewBox="0 0 100 62"]', els => els.map(e => ({ label: e.getAttribute('aria-label'), html: e.outerHTML })));
  const seen = {};
  for (const s of svgs) { const k = (s.label || '').toLowerCase(); const M = { drennia: '#1E2A4A', westmark: '#14364F', eryndor: '#2E5E3A' }; for (const n of Object.keys(M)) if (s.html.toUpperCase().includes(M[n].toUpperCase()) && !seen[n]) { seen[n] = 1; fs.writeFileSync(`${__dirname}/comp/assets/flag-${n}.svg`, s.html.replace(/width="\d+" height="\d+"/, 'width="1000" height="620"').replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')); } }
  console.log(svgs.map(s => s.label), Object.keys(seen));
  await browser.close();
})();
