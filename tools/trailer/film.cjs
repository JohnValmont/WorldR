// Films the motion clips (LOCAL ONLY). Usage: node film.cjs [shotName ...]
const { open, dismiss, startCapture, smoothScroll, cursor, glideTo, BASE, API, PASS } = require('./film-lib.cjs');
const { execSync } = require('child_process');
const ELENA = 'elena.marsh@example.com';
async function prep(page, { zoom = 1.35, hideChat = true, hideBanner = true } = {}) {
  if (hideBanner) {
    const s = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ELENA, password: PASS }) })).json();
    const d = await (await fetch(API + '/politics/desk', { headers: { Authorization: 'Bearer ' + s.accessToken } })).json();
    const id = d?.desk?.election?.cycleId; if (id) await page.evaluate(id => localStorage.setItem('worldr_pol_election_seen', id), id);
  }
  await page.addInitScript(({ zoom, hideChat }) => {
    const apply = () => {
      document.documentElement.style.zoom = String(zoom);
      if (hideChat && !document.getElementById('trailer-hide')) {
        const s = document.createElement('style'); s.id = 'trailer-hide';
        s.textContent = 'button[aria-label^="Open chat"],button[aria-label^="Close chat"]{visibility:hidden!important} ::-webkit-scrollbar{display:none} html{scrollbar-width:none}';
        document.head.appendChild(s);
      }
    };
    document.addEventListener('DOMContentLoaded', apply); window.addEventListener('load', apply);
  }, { zoom, hideChat });
}
async function go(page, path) { await page.goto(BASE + path); await page.waitForTimeout(4500); await dismiss(page); await page.waitForTimeout(600); await cursor(page); await page.mouse.move(1500, 900); }
const SHOTS = {
  async election(page) {
    await prep(page, { zoom: 1.55, hideBanner: false }); await go(page, '/drennia/politics?tab=desk');
    const w = page.getByRole('button', { name: /Watch election night|Watch/i }).first();
    console.log('watch visible', await w.isVisible().catch(() => false));
    const cap = await startCapture(page); await glideTo(page, w, 25); await w.click(); await page.mouse.move(1880, 1060, { steps: 20 });
    await page.waitForTimeout(15000); return cap;
  },
  async vote(page) {
    await prep(page, { zoom: 1.5 }); await go(page, '/drennia/politics?tab=chamber');
    const bill = page.getByText(/Tariffs/i).first(); await bill.scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -120)); await page.waitForTimeout(500);
    const cap = await startCapture(page);
    const against = page.getByRole('button', { name: /Vote against/ }).first(), forB = page.getByRole('button', { name: /Vote for/ }).first();
    await page.waitForTimeout(600); await glideTo(page, against, 35); await page.waitForTimeout(300); await against.click().catch(() => {});
    await page.waitForTimeout(1600); await glideTo(page, forB, 25); await page.waitForTimeout(300); await forB.click().catch(() => {});
    await page.waitForTimeout(2500); return cap;
  },
  async chamber(page) {
    await prep(page, { zoom: 1.5 }); await go(page, '/drennia/politics?tab=chamber');
    const cap = await startCapture(page); await page.mouse.move(1500, 650, { steps: 60 }); await smoothScroll(page, 160, 5000); return cap;
  },
  async map(page) {
    await prep(page, { zoom: 1.3 }); await go(page, '/drennia/politics?tab=map');
    const cap = await startCapture(page);
    for (const [x, y] of [[700, 600], [820, 520], [960, 640], [880, 760], [1100, 560]]) { await page.mouse.move(x, y, { steps: 30 }); await page.waitForTimeout(700); }
    return cap;
  },
  async coalition(page) {
    await prep(page, { zoom: 1.4 }); await go(page, '/drennia/politics?tab=nation&section=coalition');
    await page.evaluate(() => window.scrollTo(0, 380)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await smoothScroll(page, 420, 6000); return cap;
  },
  async cabinet(page) {
    await prep(page, { zoom: 1.4 }); await go(page, '/drennia/politics?tab=cabinet');
    await page.evaluate(() => window.scrollTo(0, 330)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await smoothScroll(page, 480, 6000); return cap;
  },
  async economy(page) {
    await prep(page, { zoom: 1.35 }); await go(page, '/drennia/politics?tab=nation&section=economy');
    await page.evaluate(() => window.scrollTo(0, 330)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await page.mouse.move(1200, 700, { steps: 40 }); await smoothScroll(page, 450, 5500); return cap;
  },
  async budget(page) {
    await prep(page, { zoom: 1.35 }); await go(page, '/drennia/politics?tab=nation&section=budget');
    await page.evaluate(() => window.scrollTo(0, 330)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await smoothScroll(page, 420, 5500); return cap;
  },
  async desk(page) {
    await prep(page, { zoom: 1.35 }); await go(page, '/drennia/politics?tab=desk');
    const card = page.locator('button[id^="sit-"]:not([disabled])').first();
    await card.scrollIntoViewIfNeeded().catch(() => {}); await page.evaluate(() => window.scrollBy(0, 160)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await page.waitForTimeout(500); await glideTo(page, card, 40); await page.waitForTimeout(400); await card.click().catch(() => {});
    await page.waitForTimeout(3000); return cap;
  },
  async wire(page) {
    await prep(page, { zoom: 1.4 }); await go(page, '/drennia/politics?tab=wire');
    await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await smoothScroll(page, 420, 6000); return cap;
  },
  async world(page) {
    await prep(page, { zoom: 1.35 }); await go(page, '/drennia/politics?tab=world');
    await page.evaluate(() => window.scrollTo(0, 280)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await page.mouse.move(1000, 700, { steps: 50 }); await smoothScroll(page, 300, 5500); return cap;
  },
  async voters(page) {
    await prep(page, { zoom: 1.35 }); await go(page, '/drennia/politics?tab=voters');
    await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await smoothScroll(page, 420, 5500); return cap;
  },
  async laws(page) {
    await page.addInitScript(() => localStorage.setItem('worldr_chamber_last_section', 'laws'));
    await prep(page, { zoom: 1.4 }); await go(page, '/drennia/politics?tab=chamber');
    await page.evaluate(() => window.scrollTo(0, 330)); await page.waitForTimeout(400);
    const cap = await startCapture(page); await smoothScroll(page, 600, 6000); return cap;
  },
  async corridors(page) {
    await prep(page, { zoom: 1.35, hideChat: true }); await go(page, '/drennia/politics?tab=corridors');
    await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(400);
    const input = page.locator('#room-input');
    const cap = await startCapture(page); await glideTo(page, input, 35); await input.click();
    await input.pressSequentially('Victor, your six seats decide this vote. Name your price.', { delay: 38 });
    await page.waitForTimeout(400); await page.locator('#room-send').click(); await page.waitForTimeout(2500); return cap;
  },
  async sales(page) {
    await prep(page, { zoom: 1.3 }); await go(page, '/drennia/business');
    await page.getByRole('button', { name: /^Open/ }).first().click().catch(() => {}); await page.waitForTimeout(4500);
    await page.evaluate(() => window.scrollTo(0, 150)); await page.waitForTimeout(300);
    const cap = await startCapture(page); await page.mouse.move(800, 600, { steps: 40 }); await smoothScroll(page, 260, 5000); return cap;
  },
  async intel(page) {
    await prep(page, { zoom: 1.3 }); await go(page, '/drennia/business');
    await page.getByRole('button', { name: /^Open/ }).first().click().catch(() => {}); await page.waitForTimeout(4500);
    await page.getByRole('button', { name: /Market Intelligence/ }).first().click().catch(() => {}); await page.waitForTimeout(3500);
    const cap = await startCapture(page); await smoothScroll(page, 500, 6000); return cap;
  },
  async designer(page) {
    await prep(page, { zoom: 1.2 }); await go(page, '/drennia/business');
    await page.getByRole('button', { name: /^Open/ }).first().click().catch(() => {}); await page.waitForTimeout(4500);
    await page.getByRole('button', { name: /R&D \/ Design/ }).first().click().catch(() => {}); await page.waitForTimeout(2000);
    const cap = await startCapture(page);
    const d = page.getByRole('button', { name: /Design a Car/ }).first(); await glideTo(page, d, 30); await d.click().catch(() => {});
    await page.waitForTimeout(2500);
    // Walk the designer: click visible choice buttons one by one so the live car and scores change.
    const choices = page.locator('[role="dialog"] button:not([disabled])');
    const n = await choices.count();
    let clicks = 0;
    for (let i = 0; i < n && clicks < 7; i++) {
      const b = choices.nth(i); const t = (await b.innerText().catch(() => '')).trim();
      if (!t || /close|cancel|back|×|launch|create|start development|confirm/i.test(t)) continue;
      if (!(await b.isVisible().catch(() => false))) continue;
      await glideTo(page, b, 18); await b.click().catch(() => {}); clicks++; await page.waitForTimeout(900);
    }
    await page.waitForTimeout(1500); return cap;
  },
  async nations(page) {
    // A newcomer at the nation step of sign-up.
    const email = `newcomer+${Date.now()}@example.com`, password = PASS;
    const j = (u, b, t) => fetch(API + u, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(b) }).then(r => r.json());
    await j('/auth/register', { email, password }); await j('/auth/verify-email', { email, otp: '000000' });
    const d = await j('/auth/login', { email, password });
    await page.evaluate(d => { localStorage.setItem('worldr_access_token', d.accessToken); localStorage.setItem('worldr_refresh_token', d.refreshToken);
      localStorage.setItem('worldr-auth', JSON.stringify({ state: { user: d.user, accessToken: d.accessToken, refreshToken: d.refreshToken, isAuthenticated: true }, version: 0 })); }, d);
    await page.addInitScript(() => { const a = () => { document.documentElement.style.zoom = '1.15'; }; document.addEventListener('DOMContentLoaded', a); });
    await page.goto(BASE + '/landing/onboarding.html?action=character'); await page.waitForTimeout(3000);
    await page.locator('#ch_first').fill('Elena'); await page.locator('#ch_last').fill('Marsh');
    await page.locator('#bgGrid button').last().click();
    await page.getByRole('button', { name: /what you believe/i }).click(); await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /choose a nation/i }).click(); await page.waitForTimeout(2500);
    await cursor(page); await page.mouse.move(960, 900);
    const cap = await startCapture(page);
    const cards = page.locator('#nationCards button.ncard:not([disabled])');
    const n = await cards.count();
    for (let i = 0; i < n; i++) { await glideTo(page, cards.nth(i), 28); await page.waitForTimeout(700); }
    await cards.nth(0).click(); await page.waitForTimeout(1800); return cap;
  },
  async exchange(page) {
    await prep(page, { zoom: 1.3 }); await go(page, '/drennia/exchange');
    const cap = await startCapture(page); await smoothScroll(page, 400, 5500); return cap;
  },
};
(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
  for (const name of names) {
    const { browser, page, errors } = await open(ELENA);
    try {
      const cap = await SHOTS[name](page);
      const dir = `${__dirname}/clips/${name}`; execSync(`rm -rf ${dir}`);
      const n = await cap.stop(dir);
      execSync(`${__dirname}/encode.sh ${dir} ${__dirname}/clips/${name}.mp4`);
      console.log(name, 'frames', n, errors.length ? 'errors: ' + errors.slice(0, 2).join(' / ') : '');
    } catch (e) { console.log(name, 'FAILED', e.message.split('\n')[0]); }
    await browser.close();
  }
})();
