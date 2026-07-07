const fs = require('fs');
const calFile = 'frontend/src/lib/calendar.ts';
let cal = fs.readFileSync(calFile, 'utf8');

// Change labelFromAbsolute to just output Tick
cal = cal.replace(/function labelFromAbsolute\([\s\S]*?\}\s*function/g, 
`function labelFromAbsolute(absMonth: number | undefined, short: boolean): string {
  if (absMonth === undefined || absMonth === null || Number.isNaN(absMonth)) {
    return short ? 'Unk' : 'Unknown Date';
  }
  return short ? \`Tick \${absMonth}\` : \`Tick \${absMonth}\`;
}

function`);

// Fix absoluteMonth to assume year 1 is start (since startingYear is 842 which breaks things)
cal = cal.replace(/return \(year - startingYear\) \* monthsPerYear \+ month;/, 
`return (year - 1) * monthsPerYear + month;`);

fs.writeFileSync(calFile, cal);

const confFile = 'frontend/src/config/worldTimeConfig.ts';
let conf = fs.readFileSync(confFile, 'utf8');
conf = conf.replace(/startingYear: 842,/, 'startingYear: 1,');
fs.writeFileSync(confFile, conf);

console.log("Calendar patched for ticks!");
