const fs = require('fs');
const path = require('path');
const dir = 'd:/WorldR/frontend/src/app/drennia';

function walk(d) {
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      
      let nc = c
        .replace(/A\uFFFD/g, '—')
        .replace(/\uFFFD\?\"/g, '—"')
        .replace(/\?\uFFFD\"/g, '—"')
        .replace(/ \uFFFD /g, ' — ')
        .replace(/\uFFFD/g, '—');
      
      if (nc !== c) {
        fs.writeFileSync(p, nc);
        console.log('Fixed', p);
      }
    }
  });
}
walk(dir);
