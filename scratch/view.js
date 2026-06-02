const fs = require('fs');
const code = fs.readFileSync('scratch/CompanyDeskTab.tsx', 'utf8');
const assetsIndex = code.indexOf("{deskTab === 'assets'");
const recordsIndex = code.indexOf("{deskTab === 'records'");
console.log(code.substring(assetsIndex, recordsIndex));
