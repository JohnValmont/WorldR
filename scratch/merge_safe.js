const fs = require('fs');

function merge() {
  let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');
  let desk = fs.readFileSync('scratch/extract.js', 'utf8');

  // Replace CompanyDeskTab
  let start = code.indexOf('function CompanyDeskTab');
  let end = code.indexOf('function EquityTab'); // We know EquityTab exists
  // wait, earlier I checked and function EquityTab exists at the end of the file.
  // Actually, I can just replace from start to end with the rewritten CompanyDeskTab, but wait, `extract.js` has the *entire* block from CompanyDeskTab to EquityTab (which includes RegistryTab and FinanceTab since I extracted them together).
  code = code.substring(0, start) + desk + code.substring(end);

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
  console.log("Merged safely!");
}

merge();
