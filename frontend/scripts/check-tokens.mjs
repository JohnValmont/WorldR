// Fails if src/lib/design/tokens.ts drifts from public/design/tokens.css (the source of truth).
// Run: npm run check:tokens   (CI runs it in the frontend job)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'public/design/tokens.css'), 'utf8');
const ts = readFileSync(join(root, 'src/lib/design/tokens.ts'), 'utf8');

const hex = (r, g, b) => '#' + [r, g, b].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
const cssVar = name => {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`tokens.css has no --${name}`);
  return m[1].replace(/\/\*.*$/, '').trim();
};
const fromRgb = name => hex(...cssVar(`${name}-rgb`).split(/\s+/));
const tsVal = key => {
  const m = ts.match(new RegExp(`\\b${key}:\\s*'([^']+)'`));
  if (!m) throw new Error(`tokens.ts has no ${key}`);
  return m[1].toUpperCase().replace(/\s/g, '');
};
const norm = v => v.toUpperCase().replace(/\s/g, '');

const pairs = [
  ['bg', fromRgb('bg')], ['surface', fromRgb('surface')], ['raised', fromRgb('raised')], ['overlay', fromRgb('overlay')],
  ['text', fromRgb('text')], ['textDim', fromRgb('text-dim')], ['textFaint', fromRgb('text-faint')],
  ['accent', fromRgb('accent')], ['good', fromRgb('good')], ['bad', fromRgb('bad')], ['warn', fromRgb('warn')], ['info', fromRgb('info')],
  ['accentHi', norm(cssVar('accent-hi'))], ['accentLo', norm(cssVar('accent-lo'))], ['onAccent', norm(cssVar('on-accent'))],
  ['lineSolid', norm(cssVar('line-solid'))], ['line', norm(cssVar('line'))], ['lineStrong', norm(cssVar('line-strong'))],
  ['accentSoft', norm(cssVar('accent-soft'))], ['accentLine', norm(cssVar('accent-line'))],
];

const bad = pairs.filter(([k, v]) => tsVal(k) !== v).map(([k, v]) => `  ${k}: tokens.ts ${tsVal(k)} ≠ tokens.css ${v}`);
if (bad.length) {
  console.error('Design tokens out of sync:\n' + bad.join('\n'));
  process.exit(1);
}
console.log(`Design tokens in sync (${pairs.length} checked).`);
