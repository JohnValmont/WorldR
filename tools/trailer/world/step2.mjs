import { call, sql, PASS, login } from './lib.mjs';
import fs from 'fs';
const cast = JSON.parse(fs.readFileSync('cast.json'));
export async function tokens() {
  const out = {};
  for (const p of cast) { const l = await call('POST', '/auth/login', { email: p.email, password: PASS }); out[p.name] = l.data.accessToken; }
  return out;
}
const T = await tokens();
// Run after: node stage.mjs backdate (leadership challenges need 6 months of membership)
for (const n of ['Elena Marsh', 'Hugo Crane']) {
  const r = await call('POST', '/politics/party/challenge', {}, T[n]);
  console.log(n, 'challenge', r.status, JSON.stringify(r.data).slice(0, 200));
}
