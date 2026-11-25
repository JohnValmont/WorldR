// One game month of activity for the whole cast, then turn the month (LOCAL ONLY).
import { call, sql, PASS, login } from './lib.mjs';
import fs from 'fs';
const cast = JSON.parse(fs.readFileSync('cast.json'));
const T = {};
for (const p of cast) { const l = await call('POST', '/auth/login', { email: p.email, password: PASS }); T[p.name] = l.data.accessToken; }
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json')) : { month: 0, chat: 0 };
const LINES = {
  drennia: [
    ['Victor Hale', 'nation', 'Drennian Renewal is standing in every Ironvale seat. Factories first.'],
    ['Mara Quill', 'nation', 'Labour will not back a wage freeze. Not this term, not ever.'],
    ['Elena Marsh', 'nation', 'CSU is open to talks with anyone who can count to 76.'],
    ['Tomas Reyes', 'party', 'Polls have us up two points in Westport. Keep rallying.'],
    ['Iris Fenn', 'party', 'Elena, Greenmere families want the school bill. Can we table it?'],
    ['Victor Hale', 'nation', 'Elena, your tariff plan will gut my car plant. Let us talk.'],
    ['Mara Quill', 'nation', 'NLF votes nay on the budget unless welfare stays funded.'],
    ['Elena Marsh', 'nation', 'Deal offered to Drennian Renewal. Check your Corridors.'],
  ],
  westmark: [
    ['Oscar Brannow', 'nation', 'Free trade or nothing. The ports built this country.'],
    ['Nadia Voss', 'nation', 'Dockers deserve a raise. HWL will fight for it.'],
    ['Felix Ward', 'nation', 'Guildhall will join whoever keeps the budget balanced.'],
  ],
  eryndor: [
    ['Rowan Black', 'nation', 'Highmoor needs investment, not more decrees.'],
    ['Hugo Crane', 'nation', 'Homestead Union stands for order. Coalition talks start tonight.'],
    ['Isla Moor', 'nation', 'The pits voted Front. Remember that, Hugo.'],
  ],
};
const WORLD = [
  ['Oscar Brannow', 'Westmark will out-trade the lot of you.'],
  ['Elena Marsh', 'Drennia is open for a trade treaty. Who is in?'],
  ['Hugo Crane', 'Eryndor does not bend to merchants.'],
];
// Decisions and campaigning
for (const p of cast) {
  const d = await call('GET', '/politics/desk', null, T[p.name]);
  const desk = d.data?.desk; if (!desk) { console.log('no desk', p.name, d.status); continue; }
  for (const card of (desk.hand || []).filter(c => c.status !== 'resolved')) {
    const opt = Math.floor(Math.random() * Math.max(1, card.options?.length || 1));
    for (const o of [opt, 0, 1, 2]) { const r = await call('POST', `/politics/desk/situations/${card.id}/choose`, { option: o }, T[p.name]); if (r.status < 300) break; }
  }
  const segs = desk.segments.map(s => s.key);
  for (let i = 0; i < 2; i++) await call('POST', '/politics/desk/rally', { segment: segs[(st.month + i + p.name.length) % segs.length] }, T[p.name]);
  if (st.month % 3 === 0) await call('POST', '/politics/desk/ad', {}, T[p.name]);
}
// Chat (two nation lines + one world line per month, rotating)
for (const nation of Object.keys(LINES)) {
  const lines = LINES[nation];
  for (let k = 0; k < (nation === 'drennia' ? 2 : 1); k++) {
    const [who, ch, body] = lines[(st.chat + k) % lines.length];
    await call('POST', '/chat/messages', { body, channel: ch }, T[who]);
    await new Promise(r => setTimeout(r, 200));
  }
}
const [ww, wb] = WORLD[st.month % WORLD.length];
await call('POST', '/chat/messages', { body: wb, channel: 'world' }, T[ww]);
st.chat += 2;
// Turn the month (both clocks)
const b = await call('POST', '/world/tick', { force: true }, T['Elena Marsh']);
const p = await call('POST', '/world/politics-tick', { force: true }, T['Elena Marsh']);
st.month++;
fs.writeFileSync('state.json', JSON.stringify(st));
console.log(`month ${st.month}: biz ${b.status} ${b.data?.data?.status ?? ''} Y${b.data?.data?.newYear}M${b.data?.data?.newMonth} | pol ${p.status} ${JSON.stringify(p.data).slice(0, 140)}`);
