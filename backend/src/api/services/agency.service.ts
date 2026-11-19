/**
 * The Meridian Wire — a neutral international news agency (docs/WORLD_STAGE.md).
 *
 * Every game month it publishes an EDITION: the World Influence Index (the most
 * influential politicians in all three nations, each with their share of the
 * world's influence in %), the month's top stories from every capital, and the
 * most endorsed reader dispatches. Players write dispatches (news, opinion,
 * propaganda) like the newspaper in Supremacy 1914.
 *
 * It also keeps each politician's career record (the ladder they have climbed).
 * The Index is read-only: nothing in elections, votes or deals reads it.
 * The world is not one nation, so nothing here uses withPlayerNation.
 */
import { db } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { safeParseJSON } from '../../utils/json';
import {
  CABINET_POSTS, headOfGovernmentTitle, NATION_ACTIVE_DAYS, NATIONS_BY_COUNTRY, STARTER_NATIONS,
} from '../constants/nations';
import {
  CareerRung, DISPATCH_AP, DISPATCH_FEED_SIZE, DISPATCH_HIDE_AT_REPORTS, DISPATCH_MIN_SECONDS_BETWEEN,
  DISPATCH_PER_MONTH, DISPATCH_BODY_MAX, DISPATCH_HEADLINE_MAX, INDEX_LIVE_CACHE_MS, INDEX_NPC_CLOUT, INDEX_NPC_TRUST,
  INDEX_PUBLISH_SIZE, INDEX_RECORD_MONTHS, LADDER, RUNG_ORDER, STATESMAN_RANK, WIRE_EDITION_DISPATCHES, WIRE_NAME,
  WIRE_STORIES_PER_NATION, WIRE_STORY_KINDS, WIRE_TAGLINE, DISPATCH_ENDORSEMENTS_PER_CLOUT, DISPATCH_MAX_CLOUT_PER_MONTH,
} from '../constants/worldStage';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { nationPower } from './nations.service';
import { getGovernment, getLawsInForce } from './statecraft.service';
import { getEnergy, spendEnergy } from './floor.service';
import { notify } from './notices.service';
import {
  careerRung, editionHeadline, IndexOffice, influenceScore, pressClout, RankedEntry, rankInfluence, RungInput, validateDispatch,
} from './worldStage.rules';

/** users.password_hash of system accounts that cannot log in (npcBrain.service.ts). */
const SYSTEM_NO_LOGIN = 'no_login_allowed';
const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const parseJ = (v: any, d: any) => (typeof v === 'string' ? (safeParseJSON(v) ?? d) : (v ?? d));

async function currentArc(conn: any): Promise<number> {
  const clock = await conn('world_clock').first();
  return num(clock?.pol_current_year, 1) * 12 + (num(clock?.pol_current_month, 1) - 1);
}

// ═══════════════════════════════ WHO IS ON THE WORLD STAGE ═══════════════════════════════

export interface WorldPolitician {
  key: string;
  characterId: string | null;
  isPlayer: boolean;
  name: string;
  nationCode: string;
  nationName: string;
  partyId: string | null;
  partyName: string | null;
  partyColor: string | null;
  office: IndexOffice;
  officeLabel: string;
  rungInput: RungInput | null;
  score: number;
}

/**
 * Every politician who counts in the world: all human players in the starter
 * nations (citizens only if seen recently) and the computer-run leaders of
 * parties with seats. Scored with influenceScore.
 */
export async function loadWorldPoliticians(conn: any, arc: number): Promise<WorldPolitician[]> {
  const since = arc - INDEX_RECORD_MONTHS;
  // The nations are independent: score them side by side, then list them in STARTER_NATIONS order.
  const perNation = await Promise.all(STARTER_NATIONS.map(async spec => {
    const out: WorldPolitician[] = [];
    const state = await conn('pol_states').where({ code: spec.polStateCode }).first();
    if (!state) return out;
    const [gov, laws, parties, premier, posts, openCycle, players] = await Promise.all([
      getGovernment(conn, state.id),
      getLawsInForce(conn, state.id),
      conn('pol_parties as p').leftJoin('pol_party_identities as i', 'i.party_id', 'p.id')
        .where('p.state_id', state.id).select('p.id', 'p.name', 'p.leader_character_id', 'i.color', 'i.leader as npc_leader'),
      conn('pol_offices').where({ state_id: state.id, office: 'premier' }).orderBy('since_arc', 'desc').first(),
      conn('pol_cabinet_posts').where({ state_id: state.id }).whereNotNull('holder_character_id').select('holder_character_id', 'post_key'),
      conn('pol_cycles').where({ state_id: state.id, status: 'open' }).first(),
      conn('characters as c').join('users as u', 'u.id', 'c.user_id')
        .where({ 'c.motherland_country_id': spec.countryId, 'c.status': 'active' })
        .whereNot('u.password_hash', SYSTEM_NO_LOGIN)
        .select('c.id', 'c.name', 'c.credibility', 'c.influence', 'u.last_seen_at'),
    ]);
    const power = nationPower(readNationalStatsFromRow(state) as any, laws.defense).overall;
    const totalSeats = Object.values(gov.seatsByParty).reduce((a, b) => a + num(b), 0);
    const share = (pid: string | null | undefined) => (pid && totalSeats > 0 ? num(gov.seatsByParty[pid]) / totalSeats : 0);
    const govShare = totalSeats > 0 ? gov.memberPartyIds.reduce((a, id) => a + num(gov.seatsByParty[id]), 0) / totalSeats : 0;
    const headTitle = headOfGovernmentTitle(state.code);

    const partyById = new Map<string, any>(parties.map((p: any) => [p.id, p]));
    const postOf = new Map<string, string>(posts.map((p: any) => [p.holder_character_id, CABINET_POSTS.find(x => x.key === p.post_key)?.title ?? 'Minister']));
    const ids = players.map((p: any) => p.id);
    const [seatedIds, candidateIds, members, lawRows, hs, pacts, endorseRows] = await Promise.all([
      gov.sittingCycleId ? conn('pol_council_seats').where({ cycle_id: gov.sittingCycleId }).whereNotNull('character_id').pluck('character_id') : Promise.resolve([]),
      openCycle ? conn('pol_candidates').where({ cycle_id: openCycle.id }).whereNotNull('character_id').pluck('character_id') : Promise.resolve([]),
      ids.length ? conn('pol_party_members').whereIn('character_id', ids).select('character_id', 'party_id') : Promise.resolve([]),
      // Record over the last year: laws tabled that passed; promises kept and broken.
      ids.length ? conn('pol_bills').where({ state_id: state.id, status: 'passed' }).whereIn('tabled_by_character_id', ids)
        .where('resolved_arc', '>=', since).select('tabled_by_character_id').count('* as n').groupBy('tabled_by_character_id') : Promise.resolve([]),
      conn('pol_handshakes').where({ state_id: state.id }).where('resolved_arc', '>=', since)
        .select('from_character_id', 'to_character_id', 'from_result', 'to_result'),
      conn('pol_pacts').where({ state_id: state.id }).whereIn('status', ['kept', 'broken']).where('resolved_arc', '>=', since).select('to_party_id', 'status'),
      ids.length ? conn('agency_dispatches').where({ arc, status: 'published' }).whereIn('author_character_id', ids)
        .select('author_character_id').sum({ n: 'endorse_count' }).groupBy('author_character_id') : Promise.resolve([]),
    ]);
    const seated = new Set<string>(seatedIds);
    const candidates = new Set<string>(candidateIds);
    const partyOf = new Map<string, string>((members as any[]).filter((m: any) => partyById.has(m.party_id)).map((m: any) => [m.character_id, m.party_id]));

    const lawsOf = new Map<string, number>((lawRows as any[]).map((r: any) => [r.tabled_by_character_id, num(r.n)]));
    const word = new Map<string, { kept: number; broken: number }>();
    const addWord = (id: string | null, r: string | null) => {
      if (!id || (r !== 'kept' && r !== 'broken')) return;
      const w = word.get(id) ?? { kept: 0, broken: 0 }; w[r]++; word.set(id, w);
    };
    for (const h of hs) { addWord(h.from_character_id, h.from_result); addWord(h.to_character_id, h.to_result); }
    for (const p of pacts) addWord(partyById.get(p.to_party_id)?.leader_character_id ?? `npc:${p.to_party_id}`, p.status);
    const endorseOf = new Map<string, number>((endorseRows as any[]).map((r: any) => [r.author_character_id, num(r.n)]));
    const activeSince = Date.now() - NATION_ACTIVE_DAYS * 86_400_000;

    for (const c of players) {
      const partyId = partyOf.get(c.id) ?? null;
      const party = partyId ? partyById.get(partyId) : null;
      const leadsSeated = !!party && party.leader_character_id === c.id && num(gov.seatsByParty[party.id]) > 0;
      const isHead = premier?.holder_character_id === c.id;
      const rungInput: RungInput = {
        hasParty: !!party, isCandidate: candidates.has(c.id), hasSeat: seated.has(c.id), leadsSeatedParty: leadsSeated,
        isMinister: postOf.has(c.id), isHead, worldRank: null,
      };
      const office: IndexOffice = isHead ? 'premier' : postOf.has(c.id) ? 'minister' : leadsSeated ? 'leader' : seated.has(c.id) ? 'mp' : party ? 'member' : 'citizen';
      if (office === 'citizen' && !(c.last_seen_at && new Date(c.last_seen_at).getTime() > activeSince)) continue;
      const w = word.get(c.id) ?? { kept: 0, broken: 0 };
      out.push({
        key: `c:${c.id}`, characterId: c.id, isPlayer: true, name: c.name, nationCode: state.code, nationName: spec.shortName,
        partyId, partyName: party?.name ?? null, partyColor: party?.color ?? null, office,
        officeLabel: office === 'premier' ? headTitle : office === 'minister' ? postOf.get(c.id)! : office === 'leader' ? `Leader, ${party!.name}`
          : office === 'mp' ? 'Member of Parliament' : office === 'member' ? 'Party member' : 'Citizen',
        rungInput,
        score: influenceScore({
          office, ledPartySeatShare: party && party.leader_character_id === c.id ? share(party.id) : 0, governmentSeatShare: govShare,
          clout: num(c.influence), trust: num(c.credibility), lawsPassed: lawsOf.get(c.id) ?? 0,
          wordKept: w.kept, wordBroken: w.broken, endorsements: endorseOf.get(c.id) ?? 0, nationPower: power,
        }),
      });
    }

    // Computer-run leaders of parties that hold seats.
    for (const p of parties) {
      if (p.leader_character_id || !num(gov.seatsByParty[p.id]) || !p.npc_leader || p.npc_leader === 'Various') continue;
      const isHead = !!premier && !premier.holder_character_id && premier.party_id === p.id;
      const office: IndexOffice = isHead ? 'premier' : 'leader';
      const w = word.get(`npc:${p.id}`) ?? { kept: 0, broken: 0 };
      out.push({
        key: `npc:${p.id}`, characterId: null, isPlayer: false, name: p.npc_leader, nationCode: state.code, nationName: spec.shortName,
        partyId: p.id, partyName: p.name, partyColor: p.color ?? null, office,
        officeLabel: isHead ? headTitle : `Leader, ${p.name}`, rungInput: null,
        score: influenceScore({
          office, ledPartySeatShare: share(p.id), governmentSeatShare: govShare, clout: INDEX_NPC_CLOUT, trust: INDEX_NPC_TRUST,
          lawsPassed: 0, wordKept: w.kept, wordBroken: w.broken, endorsements: 0, nationPower: power,
        }),
      });
    }
    return out;
  }));
  return perNation.flat();
}

/** What an edition stores for one ranked politician. */
function publicRow(r: RankedEntry & WorldPolitician) {
  return {
    key: r.key, rank: r.rank, prevRank: r.prevRank, move: r.move, share: r.share, score: r.score,
    name: r.name, isPlayer: r.isPlayer, characterId: r.characterId, nationCode: r.nationCode, nationName: r.nationName,
    partyName: r.partyName, partyColor: r.partyColor, officeLabel: r.officeLabel,
  };
}

async function previousEdition(conn: any, beforeArc: number) {
  return conn('agency_editions').where('arc', '<', beforeArc).orderBy('arc', 'desc').first();
}
function rankMap(edition: any): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of parseJ(edition?.rankings, [])) out[r.key] = r.rank;
  return out;
}

// ═══════════════════════════════ LIVE INDEX ═══════════════════════════════

let liveCache: { at: number; arc: number; rows: ReturnType<typeof publicRow>[] } | null = null;

/** The Index as it would be printed right now (cached for a minute). Movement is against the last edition. */
export async function liveIndex() {
  const arc = await currentArc(db);
  if (liveCache && liveCache.arc === arc && Date.now() - liveCache.at < INDEX_LIVE_CACHE_MS) return liveCache.rows;
  const pols = await loadWorldPoliticians(db, arc);
  const prev = await previousEdition(db, arc + 1);
  const rows = rankInfluence(pols, rankMap(prev)).map(r => publicRow(r as any));
  liveCache = { at: Date.now(), arc, rows };
  return rows;
}

// ═══════════════════════════════ THE MONTHLY EDITION ═══════════════════════════════

export interface PublishedEdition { arc: number; headline: string; top: { name: string; nationName: string; share: number; move: number | null }[] }

/**
 * Publish the edition for the month that just closed. Runs once per game month
 * at the end of the politics tick, in its own savepoint. Idempotent per arc.
 * Also updates every player's career record, pays press clout for endorsed
 * dispatches, and tells each player their world rank.
 */
export async function publishEdition(trx: any, arc: number): Promise<PublishedEdition | null> {
  if (await trx('agency_editions').where({ arc }).first()) return null;
  const prev = await previousEdition(trx, arc);
  const pols = await loadWorldPoliticians(trx, arc);
  const ranked = rankInfluence(pols, rankMap(prev)) as (RankedEntry & WorldPolitician)[];
  const prevRows = parseJ(prev?.rankings, []);
  const prevTop = prevRows[0];
  const topStreak = ranked[0] && prevTop?.key === ranked[0].key ? num(prevTop.topStreak, 1) + 1 : 1;
  const headline = editionHeadline(ranked, topStreak);
  const rows = ranked.map(r => publicRow(r)) as any[];
  if (rows[0]) rows[0].topStreak = topStreak;

  // Stories from every capital: the month's most newsworthy ledger events.
  const stories: any[] = [];
  const priority = (k: string) => { const i = (WIRE_STORY_KINDS as readonly string[]).indexOf(k); return i < 0 ? 99 : i; };
  for (const spec of STARTER_NATIONS) {
    const state = await trx('pol_states').where({ code: spec.polStateCode }).first();
    if (!state) continue;
    const evs = await trx('pol_ledger_events').where({ state_id: state.id, arc }).whereIn('kind', WIRE_STORY_KINDS as unknown as string[])
      .select('kind', 'headline', 'body');
    evs.sort((a: any, b: any) => priority(a.kind) - priority(b.kind));
    for (const e of evs.slice(0, WIRE_STORIES_PER_NATION)) stories.push({ nationCode: state.code, nationName: spec.shortName, kind: e.kind, headline: e.headline, body: e.body });
  }

  // The month's most endorsed reader dispatches, frozen into the edition.
  const top = await dispatchQuery(trx).where('d.arc', arc).where('d.status', 'published')
    .orderBy('d.endorse_count', 'desc').orderBy('d.created_at', 'asc').limit(WIRE_EDITION_DISPATCHES);
  const dispatches = top.map(dispatchRow);

  await trx('agency_editions').insert({
    arc, headline, rankings: JSON.stringify(rows), stories: JSON.stringify(stories), dispatches: JSON.stringify(dispatches),
  });

  // Careers, rank notices.
  const totalRanked = ranked.length;
  for (const r of ranked) {
    if (!r.isPlayer || !r.characterId || !r.rungInput) continue;
    const rung = careerRung({ ...r.rungInput, worldRank: r.rank });
    const c = await trx('pol_careers').where({ character_id: r.characterId }).first();
    const peakBefore: CareerRung = (c?.peak_rung as CareerRung) ?? 'citizen';
    const newPeak = RUNG_ORDER[rung] > RUNG_ORDER[peakBefore];
    const first = !c;
    const counted = !c || num(c.updated_arc) < arc;
    const row = {
      character_id: r.characterId,
      peak_rung: newPeak ? rung : peakBefore,
      peak_rung_arc: newPeak ? arc : (c?.peak_rung_arc ?? arc),
      months_mp: num(c?.months_mp) + (counted && r.rungInput.hasSeat ? 1 : 0),
      months_leader: num(c?.months_leader) + (counted && r.rungInput.leadsSeatedParty ? 1 : 0),
      months_minister: num(c?.months_minister) + (counted && r.rungInput.isMinister ? 1 : 0),
      months_head: num(c?.months_head) + (counted && r.rungInput.isHead ? 1 : 0),
      best_world_rank: c?.best_world_rank ? Math.min(num(c.best_world_rank), r.rank) : r.rank,
      best_world_rank_arc: !c?.best_world_rank || r.rank < num(c.best_world_rank) ? arc : c.best_world_rank_arc,
      months_world_top: num(c?.months_world_top) + (counted && r.rank === 1 ? 1 : 0),
      updated_arc: arc,
    };
    await trx('pol_careers').insert(row).onConflict('character_id').merge();
    if (newPeak && !first) {
      const title = rung === 'premier' ? headOfGovernmentTitle(r.nationCode) : LADDER.find(x => x.key === rung)?.title ?? rung;
      await notify(trx, r.characterId, arc, 'new_rung', `You have climbed to a new rung of your career: ${title}.`, 'desk');
    }
    if (first || r.move !== 0) {
      const moved = r.move == null ? 'a new entry' : r.move > 0 ? `up ${r.move}` : `down ${-r.move}`;
      await notify(trx, r.characterId, arc, 'world_rank',
        `${WIRE_NAME}: you are #${r.rank} of ${totalRanked} in the World Influence Index (${r.share}% of world influence), ${moved}.`, 'wire');
    }
  }

  // Press clout: endorsements this month's dispatches drew.
  const authors = await trx('agency_dispatches').where({ arc, status: 'published' })
    .select('author_character_id').sum({ n: 'endorse_count' }).groupBy('author_character_id');
  for (const a of authors) {
    const gain = pressClout(num(a.n));
    if (gain <= 0) continue;
    await trx('characters').where({ id: a.author_character_id })
      .update({ influence: trx.raw('LEAST(100, influence + ?)', [gain]) });
    await notify(trx, a.author_character_id, arc, 'press_clout', `Readers endorsed your dispatches ${num(a.n)} times this month: +${gain} clout.`, 'wire');
  }

  return { arc, headline, top: rows.slice(0, 5).map(r => ({ name: r.name, nationName: r.nationName, share: r.share, move: r.move })) };
}

/** Post a published edition to Discord (optional). Public game news only. Never throws. */
export async function announceEdition(e: PublishedEdition): Promise<void> {
  const url = env.AGENCY_DISCORD_WEBHOOK_URL;
  if (!url) return;
  const lines = e.top.map((t, i) => `${i + 1}. ${t.name} (${t.nationName}) ${t.share}%${t.move ? (t.move > 0 ? ` ▲${t.move}` : ` ▼${-t.move}`) : ''}`);
  const content = `**${WIRE_NAME}** · ${e.headline}\nWorld Influence Index:\n${lines.join('\n')}`.slice(0, 1900);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }), signal: ctrl.signal });
    clearTimeout(t);
  } catch (err: any) {
    logger.warn(`[agency] Discord post skipped: ${err?.message ?? err}`);
  }
}

// ═══════════════════════════════ DISPATCHES ═══════════════════════════════

function dispatchQuery(conn: any) {
  return conn('agency_dispatches as d').join('characters as c', 'c.id', 'd.author_character_id')
    .select('d.id', 'd.arc', 'd.headline', 'd.body', 'd.status', 'd.endorse_count', 'd.report_count', 'd.created_at',
      'd.nation_code', 'd.author_character_id', 'c.name as author_name');
}
function dispatchRow(d: any) {
  const nation = STARTER_NATIONS.find(n => n.polStateCode === d.nation_code);
  return {
    id: d.id, arc: d.arc, headline: d.headline, body: d.body, status: d.status,
    endorsements: num(d.endorse_count), reports: num(d.report_count), at: d.created_at,
    author: { id: d.author_character_id, name: d.author_name, nationName: nation?.shortName ?? null },
  };
}

async function activeCharacter(conn: any, userId: string) {
  const c = await conn('characters').where({ user_id: userId, status: 'active' }).first();
  if (!c) throw new AppError('Create a character first.', 404, 'NOT_FOUND');
  return c;
}

export async function fileDispatch(userId: string, input: { headline: unknown; body: unknown }) {
  const v = validateDispatch(input.headline, input.body);
  if ('error' in v) throw new AppError(v.error, 400, 'BAD_REQUEST');
  return db.transaction(async trx => {
    const me = await activeCharacter(trx, userId);
    // One writer at a time per author, so the monthly limit cannot be raced.
    await trx('characters').where({ id: me.id }).forUpdate().first();
    const arc = await currentArc(trx);
    const filed = num((await trx('agency_dispatches').where({ author_character_id: me.id, arc }).count('* as n').first())?.n);
    if (filed >= DISPATCH_PER_MONTH) throw new AppError(`You have filed ${DISPATCH_PER_MONTH} dispatches this month. The Wire takes more when the month turns.`, 409, 'CONFLICT');
    const last = await trx('agency_dispatches').where({ author_character_id: me.id }).orderBy('created_at', 'desc').first();
    if (last && Date.now() - new Date(last.created_at).getTime() < DISPATCH_MIN_SECONDS_BETWEEN * 1000) {
      throw new AppError('Give it a minute before filing another dispatch.', 429, 'RATE_LIMITED');
    }
    await spendEnergy(trx, me.id, DISPATCH_AP, arc);
    const [row] = await trx('agency_dispatches').insert({
      arc, author_character_id: me.id, nation_code: NATIONS_BY_COUNTRY[me.motherland_country_id]?.polStateCode ?? null,
      headline: v.headline, body: v.body, status: 'published',
    }).returning('*');
    return { id: row.id, message: `Filed. Your dispatch is out on ${WIRE_NAME}.` };
  });
}

export async function reactToDispatch(userId: string, dispatchId: string, kind: 'endorse' | 'report') {
  return db.transaction(async trx => {
    const me = await activeCharacter(trx, userId);
    const d = await trx('agency_dispatches').where({ id: dispatchId }).forUpdate().first();
    if (!d || d.status === 'removed') throw new AppError('That dispatch is not on the wire.', 404, 'NOT_FOUND');
    if (d.author_character_id === me.id) throw new AppError('You cannot endorse or report your own dispatch.', 400, 'BAD_REQUEST');
    const arc = await currentArc(trx);
    if (kind === 'endorse' && (d.status !== 'published' || num(d.arc) !== arc)) throw new AppError('Only this month\'s dispatches can be endorsed.', 409, 'CONFLICT');
    const inserted = await trx('agency_dispatch_reactions').insert({ dispatch_id: d.id, character_id: me.id, kind })
      .onConflict(['dispatch_id', 'character_id']).ignore().returning('*');
    if (!inserted.length) throw new AppError('You have already reacted to this dispatch.', 409, 'CONFLICT');
    if (kind === 'endorse') {
      await trx('agency_dispatches').where({ id: d.id }).increment('endorse_count', 1);
      return { message: 'Endorsed.' };
    }
    const reports = num(d.report_count) + 1;
    await trx('agency_dispatches').where({ id: d.id }).update({
      report_count: reports, status: reports >= DISPATCH_HIDE_AT_REPORTS && d.status === 'published' ? 'hidden' : d.status,
    });
    return { message: 'Reported. Thank you: the Wire will look at it.' };
  });
}

/** An author takes back their own dispatch. */
export async function retractDispatch(userId: string, dispatchId: string) {
  const me = await activeCharacter(db, userId);
  const n = await db('agency_dispatches').where({ id: dispatchId, author_character_id: me.id }).whereNot('status', 'removed').update({ status: 'removed' });
  if (!n) throw new AppError('That dispatch is not yours or is already gone.', 404, 'NOT_FOUND');
  return { message: 'Dispatch withdrawn.' };
}

/** Admin: publish, hide or remove a dispatch. */
export async function moderateDispatch(dispatchId: string, status: string) {
  if (!['published', 'hidden', 'removed'].includes(status)) throw new AppError('status must be published, hidden or removed', 400, 'BAD_REQUEST');
  const n = await db('agency_dispatches').where({ id: dispatchId }).update({ status });
  if (!n) throw new AppError('Not found', 404, 'NOT_FOUND');
  return { message: `Dispatch ${status}.` };
}

// ═══════════════════════════════ CAREERS ═══════════════════════════════

export async function careerOf(conn: any, characterId: string) {
  const c = await conn('pol_careers').where({ character_id: characterId }).first();
  if (!c) return null;
  return {
    peakRung: c.peak_rung as CareerRung, peakRungArc: c.peak_rung_arc,
    monthsMp: num(c.months_mp), monthsLeader: num(c.months_leader), monthsMinister: num(c.months_minister), monthsHead: num(c.months_head),
    bestWorldRank: c.best_world_rank ?? null, bestWorldRankArc: c.best_world_rank_arc ?? null, monthsWorldTop: num(c.months_world_top),
  };
}

/** This character's rank in the latest edition (null if unranked or no edition yet). */
export async function latestWorldRank(conn: any, characterId: string): Promise<{ rank: number; share: number; arc: number; of: number } | null> {
  const e = await conn('agency_editions').orderBy('arc', 'desc').first();
  if (!e) return null;
  const rows = parseJ(e.rankings, []);
  const r = rows.find((x: any) => x.characterId === characterId);
  return r ? { rank: r.rank, share: r.share, arc: e.arc, of: rows.length } : null;
}
export { STATESMAN_RANK };

// ═══════════════════════════════ FRONT PAGE ═══════════════════════════════

function editionView(e: any, myId: string | null) {
  if (!e) return null;
  const rankings = parseJ(e.rankings, []);
  return {
    arc: e.arc, headline: e.headline, publishedAt: e.published_at,
    rankings: rankings.slice(0, INDEX_PUBLISH_SIZE),
    total: rankings.length,
    mine: myId ? rankings.find((r: any) => r.characterId === myId) ?? null : null,
    stories: parseJ(e.stories, []),
    dispatches: parseJ(e.dispatches, []),
  };
}

/** GET /agency/front: the latest edition, this month's dispatches, the live Index and my standing. */
export async function getFront(userId: string | null) {
  // Independent lookups load side by side (each is a round trip to the database).
  const [me, arc, latest, archive, live] = await Promise.all([
    userId ? db('characters').where({ user_id: userId, status: 'active' }).first() : Promise.resolve(null),
    currentArc(db),
    db('agency_editions').orderBy('arc', 'desc').first(),
    db('agency_editions').orderBy('arc', 'desc').limit(24).select('arc', 'headline'),
    liveIndex(),
  ]);

  const feedRows = await dispatchQuery(db).where('d.arc', arc)
    .andWhere((q: any) => { q.where('d.status', 'published'); if (me) q.orWhere((qq: any) => qq.where('d.author_character_id', me.id).whereNot('d.status', 'removed')); })
    .orderBy('d.endorse_count', 'desc').orderBy('d.created_at', 'desc').limit(DISPATCH_FEED_SIZE);
  const reacted = me && feedRows.length
    ? await db('agency_dispatch_reactions').where({ character_id: me.id }).whereIn('dispatch_id', feedRows.map((d: any) => d.id)).select('dispatch_id', 'kind')
    : [];
  const myReaction = new Map<string, string>(reacted.map((r: any) => [r.dispatch_id, r.kind]));

  let allowance = null;
  let career = null;
  if (me) {
    const [filedRow, energy, myCareer] = await Promise.all([
      db('agency_dispatches').where({ author_character_id: me.id, arc }).count('* as n').first(),
      getEnergy(db, me.id, arc),
      careerOf(db, me.id),
    ]);
    allowance = { filed: num((filedRow as any)?.n), perMonth: DISPATCH_PER_MONTH, ap: DISPATCH_AP, energy: energy.current };
    career = myCareer;
  }

  return {
    agency: { name: WIRE_NAME, tagline: WIRE_TAGLINE },
    arc,
    edition: editionView(latest, me?.id ?? null),
    archive,
    live: {
      top: live.slice(0, 10),
      mine: me ? live.find(r => r.characterId === me.id) ?? null : null,
      total: live.length,
    },
    dispatches: feedRows.map((d: any) => ({ ...dispatchRow(d), mine: !!me && d.author_character_id === me.id, myReaction: myReaction.get(d.id) ?? null })),
    allowance,
    career,
    rules: {
      perMonth: DISPATCH_PER_MONTH, ap: DISPATCH_AP, headlineMax: DISPATCH_HEADLINE_MAX, bodyMax: DISPATCH_BODY_MAX,
      endorsementsPerClout: DISPATCH_ENDORSEMENTS_PER_CLOUT, maxCloutPerMonth: DISPATCH_MAX_CLOUT_PER_MONTH,
      hideAtReports: DISPATCH_HIDE_AT_REPORTS, publishSize: INDEX_PUBLISH_SIZE, statesmanRank: STATESMAN_RANK,
    },
  };
}

/** GET /agency/editions/:arc: an archived edition. */
export async function getEdition(arc: number, userId: string | null) {
  const me = userId ? await db('characters').where({ user_id: userId, status: 'active' }).first() : null;
  const e = await db('agency_editions').where({ arc }).first();
  if (!e) throw new AppError('No edition was published that month.', 404, 'NOT_FOUND');
  return editionView(e, me?.id ?? null);
}
