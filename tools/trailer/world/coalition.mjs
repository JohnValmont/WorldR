import { call, sql, PASS, login } from './lib.mjs';
const elena = await login('elena.marsh@example.com'), victor = await login('victor.hale@example.com');
const ind = sql(`select p.id from pol_parties p join pol_states s on s.id=p.state_id where s.code='national' and p.abbreviation='IND'`);
const drn = sql(`select id from pol_parties where abbreviation='DRN'`);
const posts = sql(`select string_agg(post_key, ',') from pol_cabinet_posts cp join pol_states s on s.id=cp.state_id where s.code='national'`);
console.log('posts', posts);
const keys = ['finance','industry','interior','industry'];
for (const [to, post] of [[ind, 'interior'], [drn, 'industry']]) {
  const fc = await call('POST', '/politics/coalition/forecast', { toPartyId: to, posts: [post], promises: [] }, elena);
  console.log('forecast', fc.status, JSON.stringify(fc.data).slice(0, 220));
  const o = await call('POST', '/politics/coalition/offers', { toPartyId: to, posts: [post], promises: [] }, elena);
  console.log('offer', o.status, JSON.stringify(o.data).slice(0, 220));
}
const offer = sql(`select id from pol_coalition_offers where to_party_id='${drn}' order by created_at desc limit 1`);
const r = await call('POST', `/politics/coalition/offers/${offer}/respond`, { accept: true }, victor);
console.log('Victor accepts', r.status, JSON.stringify(r.data).slice(0, 200));
