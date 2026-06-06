const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log('Navigating to Vercel live site...');
  await page.goto('https://world-r-frontend.vercel.app', { waitUntil: 'networkidle2' });
  
  // Login
  console.log('Logging in...');
  await page.type('input[placeholder="Username"]', 'infoforbiddengaming@gmail.com');
  await page.type('input[placeholder="Password"]', 'test1234');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log('Logged in successfully!');

  // Navigate to business desk
  await page.goto('https://world-r-frontend.vercel.app/drennia/business', { waitUntil: 'networkidle2' });
  console.log('On Business Desk.');

  // Find a Logistics company and open it
  const companies = await page.$$('.bg-slate-900.border'); // The company cards
  let foundLogistics = false;
  
  for (const comp of companies) {
    const text = await page.evaluate(el => el.textContent, comp);
    if (text.includes('Logistics')) {
      foundLogistics = true;
      console.log('Found Logistics Company. Clicking to open...');
      // Click the 'Open Company' button inside this card
      const btn = await comp.$('button');
      if (btn) await btn.click();
      await new Promise(r => setTimeout(r, 2000));
      break;
    }
  }

  if (foundLogistics) {
    console.log('Checking Logistics Tabs...');
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasStaff = pageText.includes('Staff');
    const hasFleet = pageText.includes('Fleet');
    const hasFinance = pageText.includes('Finance');
    console.log(`Tabs found -> Staff: ${hasStaff}, Fleet: ${hasFleet}, Finance: ${hasFinance}`);
    
    // Check Fleet tab for maintenance cost not being 0 and no UUIDs
    const fleetTabBtn = await page.$x("//button[contains(., 'Fleet')]");
    if (fleetTabBtn.length > 0) {
      await fleetTabBtn[0].click();
      await new Promise(r => setTimeout(r, 1000));
      const fleetHtml = await page.evaluate(() => document.body.innerHTML);
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const showsRawUuid = uuidRegex.test(fleetHtml);
      console.log('No raw UUIDs shown in Fleet tab:', !showsRawUuid);
      
      const maintMatch = fleetHtml.match(/Maint:\s*.*?(\d+)\/mo/i);
      console.log('Maintenance Cost visible:', maintMatch ? maintMatch[0] : 'No');
      if (maintMatch && maintMatch[1] === '0') {
        console.log('WARNING: Maintenance is still 0!');
      } else {
        console.log('Maintenance is NOT 0. Fix confirmed.');
      }
    }
  } else {
    console.log('No existing Logistics company found to test regression.');
  }

  await browser.close();
})();
