import { call, sql, PASS, login } from './lib.mjs';
const elena = await login('elena.marsh@example.com'), mara = await login('mara.quill@example.com'), victor = await login('victor.hale@example.com');
// Open bills in Drennia
const bills = (await call('GET', '/politics/bills', null, elena)).data;
const list = (Array.isArray(bills) ? bills : bills.bills).filter(b => ['proposed','voting','open'].includes(b.status));
console.log('open bills', list.map(b => `${b.id.slice(0,8)} ${b.status} ${b.title ?? b.params?.category}`));
const victorId = sql(`select id from characters where name='Victor Hale'`), elenaId = sql(`select id from characters where name='Elena Marsh'`), maraId = sql(`select id from characters where name='Mara Quill'`);
if (list[0]) {
  // Mara offers Elena: my vote yea on bill 0 for $40,000 from Elena... must include a vote promise
  const h = await call('POST', '/politics/handshakes', { toCharacterId: elenaId, give: { billId: list[0].id, vote: 'yea' }, ask: { cash: 40000 }, note: 'My vote for your budget. Labour needs the funds.' }, mara);
  console.log('Mara -> Elena handshake', h.status, h.data?.error ?? '');
  const h2 = await call('POST', '/politics/handshakes', { toCharacterId: victorId, give: { cash: 25000 }, ask: { billId: list[0].id, vote: 'yea' }, note: 'Back the bill and Renewal gets the Ironvale plant contract.' }, elena);
  console.log('Elena -> Victor handshake', h2.status, h2.data?.error ?? '');
}
const t = await call('POST', '/politics/treaties', { kind: 'trade_pact', partner: 'westmark' }, elena);
console.log('treaty', t.status, t.data?.error ?? '');
const bud = await call('POST', '/politics/budget', { split: { industry: 0.35, welfare: 0.25, interior: 0.2, defence: 0.2 } }, elena);
console.log('budget', bud.status, bud.data?.error ?? JSON.stringify(bud.data).slice(0,100));
