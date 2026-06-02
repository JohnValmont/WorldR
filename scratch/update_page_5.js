const fs = require('fs');

let page = fs.readFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', 'utf8');

// The lines rendering ContractsTab, FinanceTab, and EquityTab need to be removed.
page = page.replace(
  /\{activeTab === 'contracts' && company && <ContractsTab[\s\S]*?\/>\}/g,
  ""
);
page = page.replace(
  /\{activeTab === 'finance'[\s\S]*?\/>\}/g,
  ""
);
page = page.replace(
  /\{activeTab === 'equity'[\s\S]*?\/>\}/g,
  ""
);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\app\\drennia\\business\\page.tsx', page);
