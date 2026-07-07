const fs = require('fs');
let c = fs.readFileSync('frontend/src/lib/calendar.ts', 'utf8');
let s = c.indexOf('function labelFromAbsolute');
let e = c.indexOf('/** Format an ABSOLUTE');

let rep = `function labelFromAbsolute(absMonth: number | undefined, short: boolean): string {
  if (absMonth === undefined || absMonth === null || Number.isNaN(absMonth)) {
    return short ? 'Unk' : 'Unknown Date';
  }
  return short ? \`Tick \${absMonth}\` : \`Tick \${absMonth}\`;
}

`;
c = c.substring(0, s) + rep + c.substring(e);
fs.writeFileSync('frontend/src/lib/calendar.ts', c);
console.log('Fixed');
