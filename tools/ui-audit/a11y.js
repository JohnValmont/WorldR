// axe-core accessibility audit (WCAG 2.1 A/AA + best practice) of the key screens, desktop + phone.
// LOCAL ONLY (guard.js). Signs in with the account journey.js created (.last-account.json).
// Usage: node a11y.js   → prints a tally and every violation; exits 1 if any.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { BASE } = require('./guard');

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const accountFile = path.join(__dirname, '.last-account.json');
if (!fs.existsSync(accountFile)) { console.error('Run `node journey.js` first: it creates the test account this audit signs in with.'); process.exit(2); }
const account = JSON.parse(fs.readFileSync(accountFile, 'utf8'));
const API = BASE.replace(/:\d+$/, '') + ':4000/api/v1';

const PAGES = [
  ['landing', '/landing/index.html', false], ['sign-up', '/landing/onboarding.html?action=register', false],
  ['login', '/login', false], ['register', '/register', false],
  ['home', '/drennia/chronicle', true], ['politics', '/drennia/politics', true],
  ['politics-chamber', '/drennia/politics?tab=chamber', true], ['politics-nation', '/drennia/politics?tab=nation', true],
  ['politics-map', '/drennia/politics?tab=map', true], ['politics-party', '/drennia/politics?tab=party', true],
  ['business', '/drennia/business', true], ['money', '/drennia/money', true], ['world', '/drennia/world', true],
  ['exchange', '/drennia/exchange', true], ['investments', '/drennia/investments', true],
];

(async () => {
  const login = await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(account) }).then(r => r.json());
  if (!login.accessToken) { console.error('Could not sign in the test account:', login.error || login); process.exit(2); }
  const session = JSON.stringify({ state: { user: { email: account.email }, accessToken: login.accessToken, refreshToken: login.refreshToken, isAuthenticated: true }, version: 0 });
  const b = await chromium.launch();
  const results = {};
  for (const mobile of [false, true]) {
    const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/landing/index.html');
    await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('worldr_seen_')) localStorage.removeItem(k); });
    await p.evaluate(({ a, r }) => { localStorage.setItem('worldr_access_token', a); localStorage.setItem('worldr_refresh_token', r); localStorage.setItem('worldr_seen_first_day_modal_v1', 'true'); localStorage.setItem('worldr_seen_3m_bonus_modal', 'true'); }, { a: login.accessToken, r: login.refreshToken });
    for (const [name, url, authed] of PAGES) {
      await p.evaluate(({ s, authed }) => { if (authed) localStorage.setItem('worldr-auth', s); else localStorage.removeItem('worldr-auth'); }, { s: session, authed });
      const key = name + (mobile ? ' (phone)' : '');
      try {
        await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await p.waitForTimeout(authed ? 5000 : 3500);
        // Close a first-run dialog if one is showing, as a player would.
        for (const n of [/Got it/i, /Later/i, /Skip/i]) { const d = p.getByRole('button', { name: n }).first(); if (await d.isVisible().catch(() => false)) await d.click(); }
        await p.addScriptTag({ content: AXE });
        results[key] = await p.evaluate(async () => {
          const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
          return res.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ')) }));
        });
      } catch (e) { results[key] = [{ id: 'page-failed-to-load', impact: 'critical', help: e.message.slice(0, 100), nodes: [] }]; }
    }
    await ctx.close();
  }
  await b.close();
  let total = 0;
  for (const [pg, vs] of Object.entries(results)) for (const v of vs) { total++; console.log(`${pg.padEnd(28)} ${v.impact.padEnd(9)} ${v.id} — ${v.help}\n    ${v.nodes.join('\n    ')}`); }
  const clean = Object.values(results).filter(v => v.length === 0).length;
  console.log(`\n${clean}/${Object.keys(results).length} screen views clean · ${total} violation types`);
  process.exit(total ? 1 : 0);
})();
