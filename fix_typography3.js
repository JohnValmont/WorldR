const fs = require('fs');
const path = require('path');
const dir = 'd:/WorldR/frontend/src/app/drennia';

function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      
      let nc = c;
      
      // Target corrupt utf-8 sequences
      nc = nc.replace(/[^\x00-\x7F]+\?"/g, '—"');
      nc = nc.replace(/[^\x00-\x7F]+\?/g, '—');
      nc = nc.replace(/ [^\x00-\x7F]+ /g, ' — ');
      nc = nc.replace(/[^\x00-\x7F]+/g, '—');
      
      if (nc !== c) {
        fs.writeFileSync(p, nc);
        console.log('Fixed', p);
      }
    }
  });
}
walk(dir);
