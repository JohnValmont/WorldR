const fs = require('fs');
const dir = 'frontend/src/app/drennia/business';

fs.readdirSync(dir).forEach(f => {
  if (f.endsWith('.tsx') && f !== 'ManufacturingDeskTab.tsx' && f !== 'page.tsx') {
    let p = dir + '/' + f;
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/\\n/g, '\n');
    fs.writeFileSync(p, c);
  }
});
console.log('Fixed newlines');
