const fs = require('fs');

const file = 'd:/WorldR/frontend/src/app/drennia/chronicle/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/kicker="Forbes Global List"/g, 'kicker="Magnate Global List"');
content = content.replace(/>Forbes<\/div>/g, '>MAGNATE</div>');

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced Forbes with MAGNATE');
