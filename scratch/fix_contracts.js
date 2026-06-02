const fs = require('fs');

let core = fs.readFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', 'utf8');

// The missing fields on STARTER_LOGISTICS_CONTRACTS
core = core.replace(
  /cargo: 'Office supplies',/g,
  "cargo: 'Office supplies', contractType: 'Local Delivery', bidType: 'bid',"
);

core = core.replace(
  /cargo: 'Produce',/g,
  "cargo: 'Produce', contractType: 'Produce Delivery', bidType: 'bid',"
);

core = core.replace(
  /cargo: 'Machine parts',/g,
  "cargo: 'Machine parts', contractType: 'Industrial Freight', bidType: 'bid',"
);

core = core.replace(
  /cargo: 'Import crates',/g,
  "cargo: 'Import crates', contractType: 'Port Transfer', bidType: 'bid',"
);

core = core.replace(
  /cargo: 'Retail goods',/g,
  "cargo: 'Retail goods', contractType: 'Interstate Freight', bidType: 'bid',"
);

fs.writeFileSync('d:\\WorldR\\frontend\\src\\lib\\businessCore.ts', core);
