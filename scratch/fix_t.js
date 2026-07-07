const fs = require('fs');

const path = 'd:/WorldR/frontend/src/app/drennia/business';

// 1. Add T to ManufacturingContext.tsx
let ctx = fs.readFileSync(path + '/ManufacturingContext.tsx', 'utf8');
if (!ctx.includes('export const T = {')) {
  ctx = ctx + `\n\nexport const T = {
  gold: '#d4af37',
  muted: '#888888',
  faint: '#444444',
  ivory: '#fffff0',
  paper: '#0a0a0a',
  border: '#2a2a2a',
  mint: '#36d399',
  red: '#b85555',
  blue: '#6ea8fe',
  bg: '#090A0F',
};\n`;
  fs.writeFileSync(path + '/ManufacturingContext.tsx', ctx);
}

// 2. Add import { T } from './ManufacturingContext' to all files that use T
const files = fs.readdirSync(path).filter(f => f.endsWith('.tsx') && f !== 'ManufacturingContext.tsx');
for (const f of files) {
  let p = path + '/' + f;
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes(' T.') || c.includes(' T[')) {
    if (!c.includes('import { T }') && !c.includes('import {T}')) {
      c = c.replace(/import \{ useManufacturing \} from '.\/ManufacturingContext';/, "import { useManufacturing, T } from './ManufacturingContext';");
      fs.writeFileSync(p, c);
    }
  }
}
