const fs = require('fs');
const file = 'd:/WorldR/frontend/src/app/drennia/business/IpoDeskPanel.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/Initial Public Offering [^\x00-\x7F]+\?\" DRX Bourse/, 'Initial Public Offering — DRX Bourse');
c = c.replace(/[^\x00-\x7F]+-\? Public Company/, '— Public Company');
c = c.replace(/max [^\x00-\x7F]+%[^\x00-\x7F]+ min/, 'max >= min');
c = c.replace(/\{`\$\$\{fmt\(Number\(active\.ipo_price_min\), 2\)\} [^\x00-\x7F]+\?\" \$\$\{fmt\(Number\(active\.ipo_price_max\), 2\)\}`\}/, '{`$${fmt(Number(active.ipo_price_min), 2)} — $${fmt(Number(active.ipo_price_max), 2)}`}');
c = c.replace(/% A[^\x00-\x7F]+ \$\{fmt\(Number\(active\.float_shares\)\)\} sh/, '% — ${fmt(Number(active.float_shares))} sh');
c = c.replace(/\{\/\* [^\x00-\x7F]+\?\"[^\x00-\x7F]+\?\" ACTIVE PROCESS [^\x00-\x7F]+\?\"[^\x00-\x7F]+\?\" \*\/\}/g, '{/* — ACTIVE PROCESS — */}');

fs.writeFileSync(file, c);
console.log('Fixed IpoDeskPanel.tsx');
