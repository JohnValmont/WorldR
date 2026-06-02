const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/drennia/business/page.tsx', 'utf8');
c = c.replace(/<SectionHeader title="([^"]+)" icon="([^"]+)" \/>/g, '<SectionHeader>$2 $1</SectionHeader>');
fs.writeFileSync('frontend/src/app/drennia/business/page.tsx', c);
console.log('Fixed SectionHeaders');
