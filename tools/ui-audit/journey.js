// New-player journey: landing → sign-up (6 steps) → first game screen → first decision.
// Stand-in for a usability test: counts clicks, fields typed and time; exits 1 on a dead end.
// LOCAL ONLY (guard.js): uses the server's non-production verification bypass code.
// Usage: node journey.js [mobile]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { BASE } = require('./guard');

const email = `journey+${Date.now()}@example.com`;
const password = `Journey-${Math.random().toString(36).slice(2, 10)}`;
const mobile = process.argv[2] === 'mobile';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 140)));
  p.on('response', r => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`); });
  let clicks = 0, typed = 0; const t0 = Date.now(); const steps = [];
  const mark = (name) => steps.push({ step: name, seconds: +((Date.now() - t0) / 1000).toFixed(1), clicks, typed });
  const click = async (loc) => { await loc.waitFor({ state: 'visible', timeout: 15000 }); await loc.click(); clicks++; };
  const type = async (sel, v) => { await p.locator(sel).fill(v); typed++; };
  try {
    await p.goto(BASE + '/landing/index.html'); await p.waitForTimeout(1500);
    await click(p.getByRole('link', { name: 'Create your citizen' }).first()); mark('landing → sign-up');
    await p.waitForSelector('#acc_email', { state: 'visible' });
    await type('#acc_email', email); await type('#acc_pass', password); await type('#acc_pass2', password);
    await click(p.getByRole('button', { name: /Request Access Code/i })); mark('account created');
    await p.waitForSelector('#otp input', { state: 'visible', timeout: 15000 });
    const otp = p.locator('#otp input');
    for (let i = 0; i < 6; i++) await otp.nth(i).fill('0'); // non-production bypass code 000000
    typed++;
    await click(p.getByRole('button', { name: /Verify/i })); mark('email verified');
    await p.waitForSelector('#ch_first', { state: 'visible', timeout: 15000 });
    await type('#ch_first', 'Ada'); await type('#ch_last', 'Journey');
    await click(p.locator('#bgGrid button').first());
    await click(p.getByRole('button', { name: /what you believe/i })); mark('character made');
    await click(p.getByRole('button', { name: /choose a nation/i })); mark('beliefs (optional, skipped)');
    await click(p.locator('#nationCards button.ncard:not([disabled])').first());
    await click(p.getByRole('button', { name: /Pledge/i })); mark('nation chosen');
    await click(p.getByRole('button', { name: /Confirm citizenship/i }));
    await click(p.getByRole('button', { name: /Take your seat/i })); mark('citizenship confirmed');
    await p.waitForURL(/\/drennia\//, { timeout: 30000 }); await p.waitForTimeout(5000);
    mark('first game screen: ' + new URL(p.url()).pathname);
    for (const name of [/Skip/i, /Got it/i, /Later/i]) { const d = p.getByRole('button', { name }).first(); if (await d.isVisible().catch(() => false)) { await d.click(); clicks++; } }
    // First decision: the first option on a Desk situation card the player can afford.
    await click(p.locator('button[id^="sit-"]:not([disabled])').first()); await p.waitForTimeout(2500); mark('first decision taken');
    fs.writeFileSync(path.join(__dirname, '.last-account.json'), JSON.stringify({ email, password }));
  } catch (e) {
    errors.push('DEAD END: ' + e.message.split('\n')[0].slice(0, 160));
  }
  const result = { viewport: mobile ? 'phone' : 'desktop', totalSeconds: +((Date.now() - t0) / 1000).toFixed(1), clicks, fieldsTyped: typed, steps, errors };
  console.log(JSON.stringify(result, null, 1));
  await b.close();
  process.exit(errors.length ? 1 : 0);
})();
