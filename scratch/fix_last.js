const fs = require('fs');

const path = 'd:/WorldR/frontend/src/app/drennia/business';
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx'));

for (const f of files) {
  let p = path + '/' + f;
  let c = fs.readFileSync(p, 'utf8');
  
  // Remove the fake import { T } from '../../../lib/theme' completely
  c = c.replace(/import\s*\{\s*T\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/lib\/theme['"];?\r?\n/g, '');
  
  fs.writeFileSync(p, c);
}

// Fix DesignStudio.tsx specifically
let ds = fs.readFileSync(path + '/DesignStudio.tsx', 'utf8');
// Fix manufacturingApi
if (!ds.includes("import { manufacturingApi }")) {
  ds = "import { manufacturingApi } from '@/lib/api';\n" + ds;
}
// Remove label="xxx"
ds = ds.replace(/<select className="([^"]*)" label="[^"]*"/g, '<select className="$1"');
// Fix missing prev: any
ds = ds.replace(/\(prev\)\s*=>/g, '(prev: any) =>');
fs.writeFileSync(path + '/DesignStudio.tsx', ds);

// Fix MarketSalesTab.tsx specifically
let mst = fs.readFileSync(path + '/MarketSalesTab.tsx', 'utf8');
mst = mst.replace(/\(prev\)\s*=>/g, '(prev: any) =>');
fs.writeFileSync(path + '/MarketSalesTab.tsx', mst);
