const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

// The line is: onViewContracts={() => setActiveTab('contracts')}
page = page.replace(
  /onViewContracts=\{\(\) => setActiveTab\('contracts'\)\}/g,
  "onViewContracts={() => setActiveTab('companies')}"
);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', page);
