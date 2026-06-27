const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  const html = await page.content();
  if (html.includes('Username')) {
    await page.type('input[placeholder="Username"]', 'infoforbiddengaming@gmail.com');
    await page.type('input[placeholder="Password"]', 'test1234');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }

  await page.goto('http://localhost:3000/drennia/business', { waitUntil: 'networkidle2' });
  
  // Wait a moment for dynamic data to load
  await new Promise(r => setTimeout(r, 2000));
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log(pageText);
  await browser.close();
})();
