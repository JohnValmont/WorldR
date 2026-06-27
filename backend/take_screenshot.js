const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Logging in...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Assuming login is on homepage for local testing, or we navigate to /start/character
  // Wait, let's try setting a cookie or just logging in.
  // Actually, I can just use the credentials if there's a login form.
  const html = await page.content();
  if (html.includes('Username')) {
    await page.type('input[placeholder="Username"]', 'infoforbiddengaming@gmail.com');
    await page.type('input[placeholder="Password"]', 'test1234');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  await page.goto('http://localhost:3000/drennia/business', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'C:/Users/veere/.gemini/antigravity-ide/brain/7447f000-b52f-40ca-8dc4-5a2096816532/screenshot.png', fullPage: true });
  console.log('Screenshot saved to artifacts.');
  await browser.close();
})();
