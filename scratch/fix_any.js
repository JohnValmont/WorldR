const fs = require('fs');
const path = 'd:/WorldR/frontend/src/app/drennia/business';

let ds = fs.readFileSync(path + '/DesignStudio.tsx', 'utf8');
ds = ds.replace(/\bprev\s*=>/g, '(prev: any) =>');
ds = ds.replace(/\(prev\)\s*=>/g, '(prev: any) =>');
fs.writeFileSync(path + '/DesignStudio.tsx', ds);

let mst = fs.readFileSync(path + '/MarketSalesTab.tsx', 'utf8');
mst = mst.replace(/\bprev\s*=>/g, '(prev: any) =>');
mst = mst.replace(/\(prev\)\s*=>/g, '(prev: any) =>');
fs.writeFileSync(path + '/MarketSalesTab.tsx', mst);
