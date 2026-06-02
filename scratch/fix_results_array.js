const fs = require('fs');

let core = fs.readFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', 'utf8');

core = core.replace(
  /const results = \[\];/g,
  "const results: any[] = [];"
);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', core);
