// node render.cjs <cut> stills t1,t2,...   |   node render.cjs <cut> full
const { chromium } = require(require.resolve('playwright', { paths: [require('path').resolve(__dirname, '../ui-audit'), __dirname] }));
const fs = require('fs');
(async () => {
  const [cut, mode, list] = process.argv.slice(2);
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`http://localhost:8099/index.html?cut=${cut}`); await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DURATION);
  const out = `${__dirname}/render/${cut}${mode === 'stills' ? '-stills' : ''}`; fs.mkdirSync(out, { recursive: true });
  const times = mode === 'stills' ? list.split(',').map(Number) : Array.from({ length: Math.round(dur * 30) }, (_, i) => i / 30);
  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.renderAt(t), times[i]);
    const name = mode === 'stills' ? `t${times[i].toFixed(2)}.jpg` : `f${String(i).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 94 });
    if (mode !== 'stills' && i % 300 === 0) console.log(cut, i, '/', times.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await browser.close(); console.log('done', times.length, 'frames');
})();
