const fs = require('fs');

function fixFile(path) {
  let p = fs.readFileSync(path, 'utf8');
  p = p.split('\\\\n').join('\\n');
  fs.writeFileSync(path, p);
}

fixFile('frontend/src/app/drennia/business/page.tsx');
fixFile('frontend/src/lib/businessCore.ts');
console.log('Fixed');
