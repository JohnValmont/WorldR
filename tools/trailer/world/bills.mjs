// Table bills and vote (LOCAL ONLY). Usage: node bills.mjs <round>
import { call, sql, PASS, login } from './lib.mjs';
import fs from 'fs';
const cast = JSON.parse(fs.readFileSync('cast.json'));
const T = {};
for (const p of cast) T[p.name] = (await call('POST', '/auth/login', { email: p.email, password: PASS })).data.accessToken;
const round = Number(process.argv[2] || 0);
const PLAN = [
  [['Elena Marsh', 'corp_tax', 'low'], ['Mara Quill', 'min_wage', 'high']],
  [['Elena Marsh', 'tariffs', 'targeted'], ['Hugo Crane', 'corp_tax', 'med'], ['Oscar Brannow', 'income_tax', 'flat_low']],
  [['Victor Hale', 'income_tax', 'flat_med'], ['Nadia Voss', 'min_wage', 'med']],
  [['Elena Marsh', 'min_wage', 'low'], ['Rowan Black', 'tariffs', 'moderate']],
];
for (const [who, category, option] of PLAN[round % PLAN.length]) {
  const r = await call('POST', '/politics/bills', { type: 'policy', params: { category, option } }, T[who]);
  console.log('table', who, category, option, r.status, r.data?.error ?? '');
}
for (const p of cast) {
  const b = await call('GET', '/politics/bills', null, T[p.name]);
  const list = Array.isArray(b.data) ? b.data : (b.data?.bills ?? []);
  for (const bill of list.filter(x => ['proposed', 'voting', 'open'].includes(x.status))) {
    const vote = (p.name.length + round + String(bill.id).charCodeAt(0)) % 3 === 0 ? 'nay' : 'yea';
    await call('POST', `/politics/bills/${bill.id}/vote`, { vote }, T[p.name]);
  }
}
console.log('votes cast');
