// Shared helpers for filming (LOCAL ONLY).
const { chromium } = require(require.resolve('playwright', { paths: [require('path').resolve(__dirname, '../ui-audit'), __dirname] }));
const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:3000', API = process.env.TRAILER_API || 'http://localhost:4000';
if (![BASE, API].every(u => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u))) { console.error('Refusing: filming is local only.'); process.exit(2); }
const PASS = process.env.TRAILER_PASSWORD || 'Trailer-password-2026';
async function session(email) {
  const r = await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASS }) })).json();
  return r;
}
async function open(email, { width = 1920, height = 1080, dsf = 1, keepOverlays = false } = {}) {
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (email) {
    const s = await session(email);
    await page.goto(BASE + '/landing/index.html');
    await page.evaluate(({ d, keepOverlays }) => {
      localStorage.setItem('worldr_access_token', d.accessToken); localStorage.setItem('worldr_refresh_token', d.refreshToken);
      localStorage.setItem('worldr-auth', JSON.stringify({ state: { user: d.user, accessToken: d.accessToken, refreshToken: d.refreshToken, isAuthenticated: true }, version: 0 }));
      if (!keepOverlays) {
        for (const k of Object.keys(localStorage)) if (/whats|seen|briefing|tour|guide/i.test(k)) localStorage.removeItem(k);
      }
    }, { d: s, keepOverlays });
  }
  return { browser, ctx, page, errors };
}
async function dismiss(page) {
  for (let round = 0; round < 3; round++) {
    let clicked = false;
    for (const n of [/^Skip/i, /Got it/i, /^Later/i, /^Close/i, /^Continue/i, /Dismiss/i, /See the result/i]) {
      const d = page.getByRole('button', { name: n }).first();
      if (await d.isVisible().catch(() => false)) { await d.click().catch(() => {}); clicked = true; await page.waitForTimeout(500); }
    }
    if (!clicked) break;
  }
}
// High-quality motion capture through the DevTools screencast: frames + timestamps.
async function startCapture(page, { maxWidth = 1920, maxHeight = 1080, quality = 92 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth, maxHeight, everyNthFrame: 1 });
  return {
    async stop(outDir, fps = 30) {
      await cdp.send('Page.stopScreencast');
      const fs = require('fs'), path = require('path');
      fs.mkdirSync(outDir, { recursive: true });
      // Resample to constant fps: for each output tick take the latest frame.
      if (!frames.length) return 0;
      const t0 = frames[0].t, t1 = Math.max(frames[frames.length - 1].t + 0.05, Date.now() / 1000);
      let n = 0, j = 0;
      for (let t = t0; t <= t1; t += 1 / fps) {
        while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
        fs.writeFileSync(path.join(outDir, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(frames[j].data, 'base64'));
      }
      return n;
    },
  };
}
// Smooth scroll by `dy` pixels over `ms` with ease-in-out (the page keeps repainting for the screencast).
async function smoothScroll(page, dy, ms = 2000, selector = null) {
  await page.evaluate(async ({ dy, ms, selector }) => {
    const el = selector ? document.querySelector(selector) : null;
    const start = el ? el.scrollTop : window.scrollY;
    const t0 = performance.now();
    await new Promise(res => {
      const step = now => {
        const p = Math.min(1, (now - t0) / ms), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        if (el) el.scrollTop = start + dy * e; else window.scrollTo(0, start + dy * e);
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }, { dy, ms, selector });
}
// Glide the mouse to an element (visible pointer drawn by a small overlay).
async function cursor(page) {
  await page.addStyleTag({ content: `#trailer-cursor{position:fixed;z-index:2147483647;width:22px;height:22px;pointer-events:none;left:0;top:0;transform:translate(-3px,-2px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}` });
  await page.evaluate(() => {
    if (document.getElementById('trailer-cursor')) return;
    const c = document.createElement('div'); c.id = 'trailer-cursor';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#fff" stroke="#111" stroke-width="1.2"/></svg>';
    document.body.appendChild(c);
    window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  });
}
async function glideTo(page, locator, steps = 40) {
  const box = await locator.boundingBox(); if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}
module.exports = { open, dismiss, startCapture, smoothScroll, cursor, glideTo, BASE, API, PASS };
