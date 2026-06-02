const fs = require('fs');

function merge() {
  let code = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');
  let desk = fs.readFileSync('scratch/extract.js', 'utf8');
  let fin = fs.readFileSync('scratch/extract_finance.js', 'utf8');
  let ast = fs.readFileSync('scratch/extract_assets.js', 'utf8');

  // Replace CompanyDeskTab
  let start = code.indexOf('function CompanyDeskTab');
  let end = code.indexOf('function EquityTab');
  code = code.substring(0, start) + desk + code.substring(end);

  // Replace FinanceTab
  let start1 = code.indexOf('function FinanceTab');
  let end1 = code.indexOf('function AssetsTab');
  code = code.substring(0, start1) + fin + code.substring(end1);

  // Replace AssetsTab
  let start2 = code.indexOf('function AssetsTab');
  let end2 = code.indexOf('function MyCompaniesTab');
  code = code.substring(0, start2) + ast + code.substring(end2);

  fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', code);
  console.log("Merged all successfully!");
}

merge();
