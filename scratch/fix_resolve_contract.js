const fs = require('fs');

let core = fs.readFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', 'utf8');

core = core.replace(
  /increaseRouteFamiliarity\(company\.id,/g,
  "increaseRouteFamiliarity(companies[compIdx].id,"
);

core = core.replace(
  /companyId: company\.id,/g,
  "companyId: companies[compIdx].id,"
);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', core);
