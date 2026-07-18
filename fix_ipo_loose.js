const fs = require('fs');
const file = 'd:/WorldR/frontend/src/app/drennia/business/IpoDeskPanel.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/Initial Public Offering.*?DRX Bourse/g, 'Initial Public Offering — DRX Bourse');
c = c.replace(/Public Company/g, '— Public Company').replace(/— — Public Company/g, '— Public Company');
c = c.replace(/max.*?min\.\)/g, 'max >= min.)');
c = c.replace(/ipo_price_min\), 2\)\} \S+ \$\$\{fmt\(Number\(active\.ipo_price_max/g, 'ipo_price_min), 2)} — $${fmt(Number(active.ipo_price_max');
c = c.replace(/float_percent\) \* 100, 0\)\}%\s+\S+\s+\$\{fmt\(Number\(active\.float_shares/g, 'float_percent) * 100, 0)}% — ${fmt(Number(active.float_shares');
c = c.replace(/\{\/\* .*? ACTIVE PROCESS .*? \*\/\}/g, '{/* — ACTIVE PROCESS — */}');

fs.writeFileSync(file, c);
console.log('Done');
