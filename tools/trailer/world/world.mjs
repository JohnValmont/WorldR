// Builds a lively local world for trailer filming (LOCAL ONLY).
import { call, sql, PASS, login } from './lib.mjs';
import fs from 'fs';
const CAST = [
  ['Elena Marsh', 'drennia', 'party_fixer', 'CSU'],
  ['Victor Hale', 'drennia', 'factory_heir', 'FOUND'],
  ['Mara Quill', 'drennia', 'union_organiser', 'NLF'],
  ['Tomas Reyes', 'drennia', 'civil_servant', 'DRN'],
  ['Iris Fenn', 'drennia', 'community_leader', 'CSU'],
  ['Oscar Brannow', 'westmark', 'harbour_trader', 'FTA'],
  ['Nadia Voss', 'westmark', 'union_organiser', 'HWL'],
  ['Felix Ward', 'westmark', 'civil_servant', 'GHU'],
  ['Rowan Black', 'eryndor', 'factory_heir', 'EEP'],
  ['Isla Moor', 'eryndor', 'community_leader', 'MSF'],
  ['Hugo Crane', 'eryndor', 'party_fixer', 'HSU'],
];
const players = [];
for (const [name, nation, bg, party] of CAST) {
  const email = `${name.toLowerCase().replace(/ /g, '.')}@example.com`;
  await call('POST', '/auth/register', { email, password: PASS });
  await call('POST', '/auth/verify-email', { email, otp: '000000' });
  const login = await call('POST', '/auth/login', { email, password: PASS });
  const token = login.data.accessToken;
  let ch = await call('POST', '/characters', { name, motherland_country_id: nation, currency_id: 'dollar', background: bg, edge: {}, convictions: null }, token);
  players.push({ name, nation, bg, party, email, token, charId: ch.data?.id });
  console.log('player', name, ch.status, ch.data?.motherland_country_id ?? JSON.stringify(ch.data).slice(0, 120));
}
fs.writeFileSync('cast.json', JSON.stringify(players.map(({ token, ...p }) => p), null, 1));
// Elena is the admin who turns months (and the trailer's protagonist).
sql(`update users set role='admin' where email='elena.marsh@example.com'`);

const P = n => players.find(p => p.name === n);
// Victor founds a new party
const f = await call('POST', '/politics/parties', { name: 'Drennian Renewal', abbreviation: 'DRN', doctrine_id: 'the_ledger', slogan: 'Build it here.', colorHex: '#3FA7D6' }, P('Victor Hale').token);
console.log('found DRN', f.status, f.data?.error ?? '');
for (const p of players) {
  if (p.party === 'FOUND') continue;
  const id = sql(`select p.id from pol_parties p where p.abbreviation='${p.party}' limit 1`);
  const j = await call('POST', `/politics/parties/${id}/join`, {}, p.token);
  console.log('join', p.name, p.party, j.status, j.data?.error ?? '');
}
const ch = await call('POST', '/politics/party/challenge', {}, P('Elena Marsh').token);
console.log('Elena challenges CSU leadership', ch.status, JSON.stringify(ch.data).slice(0, 160));
const ch2 = await call('POST', '/politics/party/challenge', {}, P('Hugo Crane').token);
console.log('Hugo challenges HSU leadership', ch2.status, JSON.stringify(ch2.data).slice(0, 160));
