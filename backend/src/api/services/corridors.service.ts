/**
 * Corridors: the multiplayer side of politics (docs/POLITICS_FLOOR.md).
 * Who's who in your nation, each politician's public record, and your
 * personal deals (handshakes). Messages use the chat API's 'nation' and
 * 'party' rooms. Read-only; actions live in floor.service.ts.
 */
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { safeParseJSON } from '../../utils/json';
import { BACKGROUNDS_BY_KEY } from '../constants/characterCreation';
import { HANDSHAKE_AP, HANDSHAKE_MAX_CASH, PROFILE_RECENT_VOTES } from '../constants/floor';
import { CABINET_POSTS, headOfGovernmentTitle } from '../constants/nations';
import { currentPolStateCode } from './playerNation';
import { billTitle, getGovernment } from './statecraft.service';

/** users.password_hash of system accounts that cannot log in (npcBrain.service.ts). */
const SYSTEM_NO_LOGIN = 'no_login_allowed';
const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function titleOf(bill: any): string {
  const p = typeof bill.params === 'string' ? safeParseJSON(bill.params) : bill.params;
  return p?.category ? billTitle(p.category, p.option) : String(bill.type ?? 'Bill').replace(/_/g, ' ');
}

async function loadState() {
  const state = await db('pol_states').where({ code: currentPolStateCode() }).first();
  if (!state) throw new AppError('No active nation', 404, 'NOT_FOUND');
  return state;
}

/** Kept / broken promise counts per politician (handshakes + party pacts they made as leader). */
async function records(stateId: string): Promise<Map<string, { kept: number; broken: number }>> {
  const out = new Map<string, { kept: number; broken: number }>();
  const add = (id: string, r: string | null) => {
    if (!id || (r !== 'kept' && r !== 'broken')) return;
    const row = out.get(id) ?? { kept: 0, broken: 0 };
    row[r]++; out.set(id, row);
  };
  const hs = await db('pol_handshakes').where({ state_id: stateId }).whereNotNull('resolved_arc')
    .select('from_character_id', 'to_character_id', 'from_result', 'to_result');
  for (const h of hs) { add(h.from_character_id, h.from_result); add(h.to_character_id, h.to_result); }
  const pacts = await db('pol_pacts as x').join('pol_parties as p', 'p.id', 'x.to_party_id')
    .where('x.state_id', stateId).whereIn('x.status', ['kept', 'broken']).whereNotNull('p.leader_character_id')
    .select('p.leader_character_id', 'x.status');
  for (const p of pacts) add(p.leader_character_id, p.status);
  return out;
}

export async function getCorridors(userId: string) {
  const state = await loadState();
  const me = await db('characters').where({ user_id: userId, status: 'active' }).first();
  if (!me) throw new AppError('Create a character first.', 404, 'NOT_FOUND');
  const gov = await getGovernment(db, state.id);
  const parties = await db('pol_parties as p').leftJoin('pol_party_identities as i', 'i.party_id', 'p.id')
    .where('p.state_id', state.id).select('p.id', 'p.name', 'p.abbreviation', 'p.leader_character_id', 'p.is_npc', 'i.color', 'i.leader as npc_leader');
  const partyById = new Map<string, any>(parties.map((p: any) => [p.id, p]));
  // Real players only: the business system account (npcBrain) cannot log in and is not a politician.
  const players = await db('characters as c').join('users as u', 'u.id', 'c.user_id')
    .where({ 'c.motherland_country_id': state.country_id, 'c.status': 'active' })
    .whereNot('u.password_hash', SYSTEM_NO_LOGIN)
    .select('c.id', 'c.name', 'c.credibility', 'c.influence', 'c.charisma', 'c.background', 'u.last_seen_at');
  const ids = players.map((p: any) => p.id);
  const members = ids.length ? await db('pol_party_members').whereIn('character_id', ids).select('character_id', 'party_id', 'role') : [];
  const memberOf = new Map<string, any>(members.filter((m: any) => partyById.has(m.party_id)).map((m: any) => [m.character_id, m]));
  const seats = gov.sittingCycleId && ids.length
    ? await db('pol_council_seats as s').leftJoin('pol_constituencies as c', 'c.id', 's.constituency_id')
      .where('s.cycle_id', gov.sittingCycleId).whereIn('s.character_id', ids).select('s.character_id', 'c.name as district')
    : [];
  const seatOf = new Map<string, string | null>(seats.map((s: any) => [s.character_id, s.district ?? null]));
  const posts = await db('pol_cabinet_posts').where({ state_id: state.id }).whereNotNull('holder_character_id').select('holder_character_id', 'post_key');
  const postOf = new Map<string, string>(posts.map((p: any) => [p.holder_character_id, CABINET_POSTS.find(x => x.key === p.post_key)?.title ?? 'Minister']));
  const premier = await db('pol_offices').where({ state_id: state.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
  const rec = await records(state.id);
  const leaderTitle = headOfGovernmentTitle(state.code);

  const people: any[] = players.map((c: any) => {
    const m = memberOf.get(c.id);
    const party = m ? partyById.get(m.party_id) : null;
    const isLeader = !!party && party.leader_character_id === c.id;
    const role = premier?.holder_character_id === c.id ? leaderTitle
      : postOf.get(c.id) ?? (isLeader ? 'Party leader' : seatOf.has(c.id) ? 'Member of Parliament' : party ? 'Party member' : 'Citizen');
    return {
      id: c.id, name: c.name, isPlayer: true, isMe: c.id === me.id, role,
      party: party ? { id: party.id, name: party.name, color: party.color ?? '#7A8594' } : null,
      isLeader, district: seatOf.get(c.id) ?? null, canVote: seatOf.has(c.id) || (isLeader && (gov.seatsByParty[party.id] || 0) > 0),
      trust: num(c.credibility), clout: num(c.influence),
      background: BACKGROUNDS_BY_KEY[c.background]?.label ?? null,
      record: rec.get(c.id) ?? { kept: 0, broken: 0 },
      lastSeen: c.last_seen_at ?? null,
    };
  });
  // Computer-run party leaders, so the chamber feels populated and players know who they face.
  for (const p of parties) {
    // Independents are a list of loners with no leader (their identity says "Various").
    if (p.leader_character_id || !p.npc_leader || p.npc_leader === 'Various') continue;
    people.push({
      id: `npc:${p.id}`, name: p.npc_leader, isPlayer: false, isMe: false, role: 'Party leader',
      party: { id: p.id, name: p.name, color: p.color ?? '#7A8594' }, isLeader: true, district: null,
      canVote: (gov.seatsByParty[p.id] || 0) > 0, trust: 50, clout: 50, background: null,
      record: { kept: 0, broken: 0 }, lastSeen: null,
    });
  }
  const roleRank = (r: string) => r === leaderTitle ? 0 : r === 'Party leader' ? 2 : r === 'Member of Parliament' ? 3 : r === 'Party member' ? 4 : r === 'Citizen' ? 5 : 1;
  people.sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer) || roleRank(a.role) - roleRank(b.role) || b.clout - a.clout);

  // ── Deals ──
  const bills = await db('pol_bills').where({ state_id: state.id, status: 'proposed' }).orderBy('proposed_arc', 'desc');
  const billName = new Map<string, string>(bills.map((b: any) => [b.id, titleOf(b)]));
  const hsRows = await db('pol_handshakes').where({ state_id: state.id })
    .andWhere(q => q.where({ from_character_id: me.id }).orWhere({ to_character_id: me.id }))
    .orderBy('created_at', 'desc').limit(40);
  const extraBillIds = [...new Set(hsRows.flatMap((h: any) => [h.from_bill_id, h.to_bill_id]).filter((id: any) => id && !billName.has(id)))];
  if (extraBillIds.length) for (const b of await db('pol_bills').whereIn('id', extraBillIds)) billName.set(b.id, titleOf(b));
  const nameOf = new Map<string, string>(people.filter(p => p.isPlayer).map(p => [p.id, p.name]));
  const deals = hsRows.map((h: any) => {
    const mine = h.from_character_id === me.id;
    const side = (bill: string | null, vote: string | null, cash: any, result: string | null) => ({
      billId: bill, billTitle: bill ? billName.get(bill) ?? 'A bill' : null, vote, cash: num(cash), result,
    });
    const fromSide = side(h.from_bill_id, h.from_vote, h.from_cash, h.from_result);
    const toSide = side(h.to_bill_id, h.to_vote, h.to_cash, h.to_result);
    return {
      id: h.id, status: h.status, mine, note: h.note, createdArc: h.created_arc,
      otherId: mine ? h.to_character_id : h.from_character_id,
      otherName: nameOf.get(mine ? h.to_character_id : h.from_character_id) ?? 'A politician',
      // Always from MY point of view.
      iGive: mine ? fromSide : toSide,
      iGet: mine ? toSide : fromSide,
    };
  });

  const myMember = memberOf.get(me.id);
  return {
    me: { id: me.id, partyId: myMember?.party_id ?? null },
    nation: { code: state.code, name: state.name },
    people,
    bills: bills.map((b: any) => ({ id: b.id, title: titleOf(b), partyName: partyById.get(b.proposed_by_party_id)?.name ?? null })),
    deals,
    rules: { handshakeAp: HANDSHAKE_AP, maxCash: HANDSHAKE_MAX_CASH },
  };
}

/** One politician's public record: recent votes and promises. */
export async function getProfile(characterId: string) {
  const state = await loadState();
  const c = await db('characters').where({ id: characterId, status: 'active' }).first();
  if (!c || c.motherland_country_id !== state.country_id) throw new AppError('Not found', 404, 'NOT_FOUND');
  const votes = await db('pol_bill_votes as v').join('pol_bills as b', 'b.id', 'v.bill_id')
    .where('v.character_id', c.id).andWhere('b.state_id', state.id)
    .orderBy('b.proposed_arc', 'desc').limit(PROFILE_RECENT_VOTES)
    .select('b.id', 'b.type', 'b.params', 'b.status', 'v.vote');
  const rec = (await records(state.id)).get(c.id) ?? { kept: 0, broken: 0 };
  const broken = await db('pol_ledger_events').where({ state_id: state.id, kind: 'word_broken' })
    .andWhere('headline', 'like', `${c.name} breaks%`).orderBy('arc', 'desc').limit(3).select('headline', 'body', 'arc');
  return {
    id: c.id, name: c.name,
    background: BACKGROUNDS_BY_KEY[c.background] ? { label: BACKGROUNDS_BY_KEY[c.background].label, blurb: BACKGROUNDS_BY_KEY[c.background].blurb } : null,
    record: rec,
    votes: votes.map((v: any) => ({ billId: v.id, title: titleOf(v), vote: v.vote, status: v.status })),
    brokenWord: broken,
  };
}
