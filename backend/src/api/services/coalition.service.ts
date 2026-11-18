// Coalitions: talks, deals, promises, unity and walkouts (docs/COALITIONS.md).
// Database layer over the pure rules in coalition.rules.ts.
// It must NOT import politics.service.ts or floor.service.ts (both import this file).
// politics.service owns the moment a government takes office (processGovernmentFormation).
import { AppError } from '../../utils/errors';
import { safeParseJSON } from '../../utils/json';
import { POLICY_CATALOG } from '../constants/macroEconomy';
import { CABINET_POSTS, DEFAULT_LAWS, headOfGovernmentTitle, localisePlaces, nationRules } from '../constants/nations';
import { getMajorityForState } from '../constants/politics';
import {
  COALITION_MAX_PROMISES, COALITION_POST_VALUE, COALITION_PROMISE_MAX_MONTHS, COALITION_PROMISE_MIN_MONTHS,
  COALITION_BROKEN_PROMISE_MEMORY_MONTHS, COALITION_RIVAL_MIN_UNITY, UNITY_AFTER_WALKOUT_BOUNCE, UNITY_WALKOUT_AT,
} from '../constants/coalition';
import * as R from './coalition.rules';
import { billTitle, changeDesirability, getGovernment, getLawsInForce, parsePlatform, uniqueNpcName } from './statecraft.service';
import type { GovernmentInfo } from './statecraft.service';
import { notify, notifyMany } from './notices.service';

const json = (v: any, fallback: any) => (typeof v === 'string' ? safeParseJSON(v) ?? fallback : v ?? fallback);
const num = (v: any) => Number(v) || 0;
const LIVE = ['pending', 'accepted'];

export interface PromiseRow { category: string; option: string; to_party_id: string; by_arc: number; status: 'pending' | 'kept' | 'broken' | 'void'; tried?: boolean }
interface Ctx {
  stateRow: any;
  majority: number;
  maxDistance: number;
  gov: GovernmentInfo;
  laws: Record<string, string>;
  parties: any[]; // all parties of the state, with .seats and .plat
}

async function loadCtx(trx: any, stateId: string): Promise<Ctx> {
  const stateRow = await trx('pol_states').where({ id: stateId }).first();
  const gov = await getGovernment(trx, stateId);
  const laws = await getLawsInForce(trx, stateId);
  const parties = (await trx('pol_parties').where({ state_id: stateId }))
    .map((p: any) => ({ ...p, seats: gov.seatsByParty[p.id] || 0, plat: parsePlatform(p.platform) }));
  return { stateRow, majority: getMajorityForState(stateRow?.code), maxDistance: nationRules(stateRow?.code).coalitionMaxDistance, gov, laws, parties };
}

const isHuman = (p: any) => !!p?.leader_character_id;
const lawNow = (laws: Record<string, string>, category: string) => laws[category] ?? DEFAULT_LAWS[category];

/** Can `option` be promised: a real law, different from the one in force. */
function isValidChange(laws: Record<string, string>, category: string, option: string): boolean {
  const cat = POLICY_CATALOG.find(c => c.id === category);
  return !!cat && cat.options.some(o => o.id === option) && lawNow(laws, category) !== option;
}

/** The laws a party most wants changed, with how the would-be leader feels about each. */
function wishesFor(ctx: Ctx, partner: any, lead: any): R.Wish[] {
  const out: R.Wish[] = [];
  for (const cat of POLICY_CATALOG) {
    const current = lawNow(ctx.laws, cat.id);
    for (const opt of cat.options) {
      if (opt.id === current) continue;
      const partnerLiking = changeDesirability(partner.plat, cat.id, current, opt.id);
      if (partnerLiking <= 0) continue;
      out.push({ category: cat.id, option: opt.id, partnerLiking, leadLiking: changeDesirability(lead.plat, cat.id, current, opt.id) });
    }
  }
  return out.sort((a, b) => b.partnerLiking - a.partnerLiking).slice(0, 6);
}

/** The open election cycle whose talks are running (a 'forming' coalition), or null. */
export async function talksCycle(conn: any, stateId: string): Promise<any | null> {
  const cycle = await conn('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
  if (!cycle) return null;
  const forming = await conn('pol_coalitions').where({ cycle_id: cycle.id, status: 'forming' }).first();
  return forming ? cycle : null;
}

// ═══════════════════════════════ SCORING AN OFFER ═══════════════════════════════

/** The would-be government an offer belongs to: its leader plus every party it has a live offer to (or that is already in it). */
async function plannedBloc(trx: any, ctx: Ctx, cycleId: string, fromPartyId: string, toPartyId: string, kind: 'form' | 'join'): Promise<any[]> {
  const ids = new Set<string>([fromPartyId, toPartyId]);
  if (kind === 'join') for (const id of ctx.gov.memberPartyIds) ids.add(id);
  const live = await trx('pol_coalition_offers').where({ cycle_id: cycleId, from_party_id: fromPartyId, kind }).whereIn('status', LIVE).select('to_party_id');
  for (const o of live) ids.add(o.to_party_id);
  return ctx.parties.filter(p => ids.has(p.id) && p.seats > 0);
}

/** A computer-run party's view of an offer (the same score a human sees before sending it). */
async function scoreOffer(trx: any, ctx: Ctx, cycleId: string, o: { from_party_id: string; to_party_id: string; posts: string[]; promises: R.PromiseInput[]; hog: boolean; kind: 'form' | 'join' }, arc: number): Promise<R.OfferScore> {
  const from = ctx.parties.find(p => p.id === o.from_party_id);
  const to = ctx.parties.find(p => p.id === o.to_party_id);
  if (!from || !to) return { score: -9, accept: false, parts: {} as any, reason: 'That party is not in Parliament.' };
  const bloc = await plannedBloc(trx, ctx, cycleId, from.id, to.id, o.kind);
  const fair = R.fairPosts(Object.fromEntries(bloc.map(p => [p.id, p.seats])));
  // Parties remember coalition promises broken to them.
  const pastDeals = await trx('pol_coalition_agreements as a')
    .join('pol_coalitions as co', 'co.id', 'a.coalition_id').join('pol_cycles as c', 'c.id', 'co.cycle_id')
    .where('c.state_id', ctx.stateRow.id).where('a.formed_arc', '>=', arc - COALITION_BROKEN_PROMISE_MEMORY_MONTHS)
    .where(function (this: any) { this.where('a.formateur_party_id', from.id).orWhere('a.lead_party_id', from.id); })
    .select('a.mandatory_legislation');
  const brokeToThem = pastDeals.some((d: any) => (json(d.mandatory_legislation, []) as PromiseRow[]).some(p => p.to_party_id === to.id && p.status === 'broken'));
  return R.offerScore({
    distance: R.platformDistance(from.plat, to.plat),
    maxDistance: ctx.maxDistance,
    posts: o.posts,
    fairPostCount: fair[to.id] ?? 0,
    promiseLikings: o.promises.map(p => changeDesirability(to.plat, p.category, lawNow(ctx.laws, p.category), p.option)),
    hog: o.hog,
    blocSize: bloc.length,
    wordBroken: num(from.word_broken_until_arc) > arc || brokeToThem,
  });
}

const offerRow = (o: any) => ({ ...o, posts: json(o.posts, []), promises: json(o.promises, []) });

// ═══════════════════════════════ TALKS (after an election) ═══════════════════════════════

/** Round start: computer-run parties make their offers. The largest always tries; rivals only if they would hold together. */
export async function npcMakeOffers(trx: any, stateId: string, cycle: any, arc: number): Promise<number> {
  const ctx = await loadCtx(trx, stateId);
  const seated = ctx.parties.filter(p => p.seats > 0).sort((a, b) => b.seats - a.seats || String(a.id).localeCompare(String(b.id)));
  if (!seated.length) return 0;
  const computerLeads = new Set(seated.filter(p => !isHuman(p)).map(p => p.id));

  // Fresh round: computer leaders withdraw what was not taken (a human's acceptance stands).
  const stale = await trx('pol_coalition_offers').where({ cycle_id: cycle.id, kind: 'form' }).whereIn('status', LIVE);
  for (const o of stale) {
    if (!computerLeads.has(o.from_party_id)) continue;
    const target = ctx.parties.find(p => p.id === o.to_party_id);
    if (o.status === 'accepted' && isHuman(target)) continue;
    await trx('pol_coalition_offers').where({ id: o.id }).update({ status: 'void', resolved_arc: arc });
  }
  const declined = await trx('pol_coalition_offers').where({ cycle_id: cycle.id, kind: 'form', status: 'declined' }).select('from_party_id', 'to_party_id');
  const refusedBy = (leadId: string) => new Set<string>(declined.filter((d: any) => d.from_party_id === leadId).map((d: any) => d.to_party_id));
  const blocParties: R.BlocParty[] = seated.map(p => ({ id: p.id, seats: p.seats, platform: p.plat }));

  const largest = seated[0];
  const wishesOf = (lead: any) => {
    const w: Record<string, R.Wish[]> = {};
    for (const p of seated) if (p.id !== lead.id) w[p.id] = wishesFor(ctx, p, lead);
    return w;
  };
  const plan = (lead: any, excluded: Set<string>, mustBeat?: Record<string, number>) => R.buildNpcBloc({
    leadId: lead.id, parties: blocParties, majority: ctx.majority, maxDistance: ctx.maxDistance, wishes: wishesOf(lead), excluded,
    leadWordBroken: num(lead.word_broken_until_arc) > arc, mustBeat,
  });

  // 1. The largest party's opening plan. 2. Rival blocs without it (only if they would hold together).
  // 3. If a rival courts the same partner, the largest party raises its offer to beat it.
  const plans: { lead: any; plan: R.BlocPlan; rival: boolean }[] = [];
  const largestPlan0 = computerLeads.has(largest.id) ? plan(largest, refusedBy(largest.id)) : null;
  const partnersOfLargest = new Set<string>((largestPlan0?.packages ?? []).map(pk => pk.partyId));
  const rivalBest: Record<string, number> = {};
  for (const lead of seated) {
    if (lead.id === largest.id || !computerLeads.has(lead.id) || partnersOfLargest.has(lead.id)) continue;
    const excluded = refusedBy(lead.id); excluded.add(largest.id);
    const p = plan(lead, excluded);
    if (!p || p.unity < COALITION_RIVAL_MIN_UNITY) continue;
    plans.push({ lead, plan: p, rival: true });
    for (const pk of p.packages) rivalBest[pk.partyId] = Math.max(rivalBest[pk.partyId] ?? -Infinity, pk.score);
  }
  if (largestPlan0) {
    const contested = largestPlan0.packages.some(pk => rivalBest[pk.partyId] != null);
    const raised = contested ? plan(largest, refusedBy(largest.id), rivalBest) : null;
    plans.unshift({ lead: largest, plan: raised ?? largestPlan0, rival: false });
  }

  let made = 0;
  for (const { lead, plan: pl, rival } of plans) {
    for (const pk of pl.packages) {
      const exists = await trx('pol_coalition_offers').where({ cycle_id: cycle.id, from_party_id: lead.id, to_party_id: pk.partyId }).whereIn('status', LIVE).first();
      if (exists) continue;
      await trx('pol_coalition_offers').insert({
        state_id: stateId, cycle_id: cycle.id, kind: 'form', from_party_id: lead.id, to_party_id: pk.partyId,
        posts: JSON.stringify(pk.posts), promises: JSON.stringify(pk.promises), hog: pk.hog, status: 'pending', offered_arc: arc,
      });
      made++;
      const target = ctx.parties.find(p => p.id === pk.partyId);
      if (isHuman(target)) {
        await notify(trx, target.leader_character_id, arc, 'coalition_offer', `${lead.name} invites your party into government. See the terms under Nation, Coalition.`, 'nation');
      }
    }
    const names = pl.packages.map(pk => ctx.parties.find(p => p.id === pk.partyId)?.name).filter(Boolean).join(' and ');
    await trx('pol_ledger_events').insert({
      state_id: stateId, arc, kind: 'coalition_talks',
      headline: rival ? `Rival bloc: ${lead.name} courts ${names}` : `${lead.name} opens coalition talks with ${names}`,
      body: rival ? `${lead.name} is trying to build a government without ${largest.name}.` : `The largest party is trying to build a majority of ${ctx.majority}.`,
    });
  }
  return made;
}

/** Month end: each computer-run party takes its best offer, if any is good enough. */
export async function npcDecide(trx: any, stateId: string, cycleId: string, arc: number, kind: 'form' | 'join'): Promise<{ accepted: any[] }> {
  const ctx = await loadCtx(trx, stateId);
  const pending = (await trx('pol_coalition_offers').where({ cycle_id: cycleId, kind, status: 'pending' })).map(offerRow);
  const leadingNow = new Set<string>(pending.map((o: any) => o.from_party_id));
  const byTarget = new Map<string, any[]>();
  for (const o of pending) {
    const t = ctx.parties.find(p => p.id === o.to_party_id);
    if (!t || isHuman(t)) continue; // a human answers for their own party
    if (!byTarget.has(t.id)) byTarget.set(t.id, []);
    byTarget.get(t.id)!.push(o);
  }
  const accepted: any[] = [];
  for (const [targetId, offers] of byTarget) {
    const target = ctx.parties.find(p => p.id === targetId);
    const alreadyIn = kind === 'form'
      ? await trx('pol_coalition_offers').where({ cycle_id: cycleId, kind, to_party_id: targetId, status: 'accepted' }).first()
      : null;
    const scored = [];
    for (const o of offers) {
      const s = await scoreOffer(trx, ctx, cycleId, o, arc);
      const lead = ctx.parties.find(p => p.id === o.from_party_id);
      scored.push({ ...o, score: s.score, reason: s.reason, leadSeats: lead?.seats ?? 0 });
    }
    // A party building its own government, or already promised to one, does not switch this round.
    const best = leadingNow.has(targetId) || alreadyIn ? null : R.pickBestOffer(scored);
    for (const o of scored) {
      const take = best && o.id === best.id;
      await trx('pol_coalition_offers').where({ id: o.id }).update({
        status: take ? 'accepted' : 'declined', score: o.score, resolved_arc: arc,
        reason: take ? 'Accepted.' : leadingNow.has(targetId) ? 'They are building a government of their own.' : alreadyIn ? 'They have already agreed to join another government.' : o.reason,
      });
      const from = ctx.parties.find(p => p.id === o.from_party_id);
      if (isHuman(from)) {
        await notify(trx, from.leader_character_id, arc, take ? 'coalition_accepted' : 'coalition_declined',
          take ? `${target.name} accepts your coalition offer.` : `${target.name} turns down your coalition offer: ${o.reason}`, 'nation');
      }
      if (take) accepted.push(o);
    }
  }
  return { accepted };
}

export interface Bloc { leadId: string; partnerIds: string[]; seats: number; offers: any[]; hogPartyId: string | null }

/** Every would-be government in these talks, biggest first: its leader plus the parties that accepted. */
export async function talkBlocs(trx: any, stateId: string, cycleId: string): Promise<Bloc[]> {
  const gov = await getGovernment(trx, stateId);
  const accepted = (await trx('pol_coalition_offers').where({ cycle_id: cycleId, kind: 'form', status: 'accepted' })).map(offerRow);
  const leads = new Set<string>([...accepted.map((o: any) => o.from_party_id), ...Object.keys(gov.seatsByParty)]);
  const blocs: Bloc[] = [];
  for (const leadId of leads) {
    const mine = accepted.filter((o: any) => o.from_party_id === leadId);
    if (accepted.some((o: any) => o.to_party_id === leadId) && !mine.length) continue; // it joined someone else
    const seats = (gov.seatsByParty[leadId] || 0) + mine.reduce((t: number, o: any) => t + (gov.seatsByParty[o.to_party_id] || 0), 0);
    blocs.push({ leadId, partnerIds: mine.map((o: any) => o.to_party_id), seats, offers: mine, hogPartyId: mine.find((o: any) => o.hog)?.to_party_id ?? null });
  }
  return blocs.sort((a, b) => b.seats - a.seats || a.leadId.localeCompare(b.leadId));
}

/** Write the deal of a new government (two or more parties). Returns the head of government's party. */
export async function recordDeal(trx: any, stateId: string, coalitionId: string, bloc: Bloc, arc: number): Promise<void> {
  if (!bloc.partnerIds.length) return;
  const ctx = await loadCtx(trx, stateId);
  const members = [bloc.leadId, ...bloc.partnerIds].map(id => ctx.parties.find(p => p.id === id)).filter(Boolean);
  const base = R.startingUnity({ platforms: members.map(m => m.plat), seats: bloc.seats, majority: ctx.majority });
  const hogParty = bloc.hogPartyId ?? bloc.leadId;
  const portfolio = bloc.offers.flatMap(o => o.posts.map((post: string) => ({ post, party_id: o.to_party_id })));
  const promises: PromiseRow[] = bloc.offers.flatMap(o => o.promises.map((p: R.PromiseInput) => ({
    category: p.category, option: p.option, to_party_id: o.to_party_id, by_arc: arc + p.months, status: 'pending' as const, tried: false,
  })));
  const partnerTerms = [bloc.leadId, ...bloc.partnerIds].filter(id => id !== hogParty).map(id => {
    const p = ctx.parties.find(x => x.id === id);
    const o = bloc.offers.find(x => x.to_party_id === id);
    return { party_id: id, name: p?.name ?? 'Unknown', seats: p?.seats ?? 0, posts: o?.posts ?? [], promises: o?.promises?.length ?? 0, hog: !!o?.hog, agreed_axes: [] };
  });
  await trx('pol_coalition_agreements').insert({
    coalition_id: coalitionId, lead_party_id: hogParty, formateur_party_id: bloc.leadId,
    partner_terms: JSON.stringify(partnerTerms), mandatory_legislation: JSON.stringify(promises), portfolio_allocation: JSON.stringify(portfolio),
    review_interval_arcs: 12, next_review_arc: arc + 12, status: 'active', health: base, base_unity: base, formed_arc: arc,
  });
  await trx('pol_coalition_agreements').where('coalition_id', '!=', coalitionId).whereIn('status', ['active', 'under_review'])
    .whereIn('coalition_id', trx('pol_coalitions').join('pol_cycles', 'pol_cycles.id', 'pol_coalitions.cycle_id').where('pol_cycles.state_id', stateId).select('pol_coalitions.id'))
    .update({ status: 'dissolved', dissolved_arc: arc });
}

/** After a government takes office, every other offer of these talks lapses. */
export async function closeTalks(trx: any, cycleId: string, bloc: Bloc | null, arc: number): Promise<void> {
  const keep = new Set((bloc?.offers ?? []).map(o => o.id));
  const live = await trx('pol_coalition_offers').where({ cycle_id: cycleId, kind: 'form' }).whereIn('status', LIVE);
  for (const o of live) {
    if (keep.has(o.id)) continue;
    await trx('pol_coalition_offers').where({ id: o.id }).update({ status: 'void', resolved_arc: arc, reason: 'Talks are over.' });
  }
}

// ═══════════════════════════════ PLAYERS ═══════════════════════════════

export interface OfferInput { toPartyId: string; posts: string[]; promises: R.PromiseInput[]; hog: boolean }

function cleanInput(raw: any): OfferInput {
  const posts = Array.isArray(raw?.posts) ? raw.posts.map(String) : [];
  const promises = Array.isArray(raw?.promises) ? raw.promises.slice(0, COALITION_MAX_PROMISES + 1).map((p: any) => ({
    category: String(p?.category ?? ''), option: String(p?.option ?? ''), months: Math.round(Number(p?.months)),
  })) : [];
  return { toPartyId: String(raw?.toPartyId ?? ''), posts, promises, hog: !!raw?.hog };
}

interface Me { character: any; party: any | null; isLeader: boolean }

/** Where a player's party stands: may it offer, and what kind of offer. */
async function offerStanding(conn: any, ctx: Ctx, stateId: string, me: Me): Promise<{ kind: 'form' | 'join' | null; cycleId: string | null; why: string }> {
  if (!me.party) return { kind: null, cycleId: null, why: 'Join a party first.' };
  if (!me.isLeader) return { kind: null, cycleId: null, why: 'Only a party leader can negotiate for the party.' };
  if (!ctx.gov.seatsByParty[me.party.id]) return { kind: null, cycleId: null, why: 'Your party needs seats in Parliament.' };
  const talks = await talksCycle(conn, stateId);
  if (talks) return { kind: 'form', cycleId: talks.id, why: '' };
  if (ctx.gov.leadPartyId === me.party.id && ctx.gov.sittingCycleId) return { kind: 'join', cycleId: ctx.gov.sittingCycleId, why: '' };
  return { kind: null, cycleId: null, why: `Between elections only the ${headOfGovernmentTitle(ctx.stateRow?.code)}'s party can bring parties into government.` };
}

async function checkOffer(trx: any, ctx: Ctx, cycleId: string, kind: 'form' | 'join', me: Me, input: OfferInput) {
  const to = ctx.parties.find(p => p.id === input.toPartyId);
  if (!to || to.id === me.party.id) throw new AppError('Choose another party.', 400, 'BAD_REQUEST');
  if (!to.seats) throw new AppError('That party has no seats.', 400, 'BAD_REQUEST');
  if (kind === 'join' && ctx.gov.memberPartyIds.includes(to.id)) throw new AppError('That party is already in the government.', 409, 'CONFLICT');
  if (kind === 'join' && input.hog) throw new AppError('The top job cannot change hands between elections this way.', 400, 'BAD_REQUEST');
  const mine = (await trx('pol_coalition_offers').where({ cycle_id: cycleId, from_party_id: me.party.id, kind }).whereIn('status', LIVE)).map(offerRow)
    .filter((o: any) => o.to_party_id !== to.id);
  let validPosts = CABINET_POSTS.map(p => p.key);
  if (kind === 'join') {
    const held = await trx('pol_cabinet_posts').where({ state_id: ctx.stateRow.id, party_id: me.party.id }).select('post_key');
    validPosts = held.map((h: any) => h.post_key);
  }
  const problem = R.offerProblem({
    posts: input.posts, promises: input.promises, hog: input.hog, validPosts,
    postsPromisedElsewhere: mine.flatMap((o: any) => o.posts), hogPromisedElsewhere: mine.some((o: any) => o.hog),
    isValidChange: (c, o) => isValidChange(ctx.laws, c, o),
  });
  if (problem) throw new AppError(problem, 400, 'BAD_REQUEST');
  return to;
}

/** What a computer-run party would say, before the offer is sent. Humans decide for themselves. */
export async function forecastOffer(trx: any, stateId: string, me: Me, raw: any, arc: number) {
  const ctx = await loadCtx(trx, stateId);
  const st = await offerStanding(trx, ctx, stateId, me);
  if (!st.kind || !st.cycleId) throw new AppError(st.why, 403, 'FORBIDDEN');
  const input = cleanInput(raw);
  const to = await checkOffer(trx, ctx, st.cycleId, st.kind, me, input);
  if (isHuman(to)) return { human: true, reason: 'A player leads that party. They decide.' };
  const s = await scoreOffer(trx, ctx, st.cycleId, { from_party_id: me.party.id, to_party_id: to.id, ...input, kind: st.kind }, arc);
  // npcDecide: a party courting partners of its own, or already promised elsewhere, says no this round.
  const busy = st.kind === 'form' && await trx('pol_coalition_offers').where({ cycle_id: st.cycleId, kind: 'form' })
    .where(function (this: any) { this.where({ from_party_id: to.id, status: 'pending' }).orWhere({ to_party_id: to.id, status: 'accepted' }); }).first();
  if (busy) {
    const reason = busy.from_party_id === to.id
      ? `${s.accept ? 'The terms would do, but they' : 'They'} are trying to build a government of their own. They will not answer this round.`
      : 'They have already agreed to join another government.';
    return { human: false, accept: false, score: s.score, reason, parts: s.parts };
  }
  return { human: false, accept: s.accept, score: s.score, reason: s.reason, parts: s.parts };
}

export async function makeOffer(trx: any, stateId: string, me: Me, raw: any, arc: number) {
  const ctx = await loadCtx(trx, stateId);
  const st = await offerStanding(trx, ctx, stateId, me);
  if (!st.kind || !st.cycleId) throw new AppError(st.why, 403, 'FORBIDDEN');
  const input = cleanInput(raw);
  const to = await checkOffer(trx, ctx, st.cycleId, st.kind, me, input);
  const old = await trx('pol_coalition_offers').where({ cycle_id: st.cycleId, from_party_id: me.party.id, to_party_id: to.id }).whereIn('status', LIVE).first();
  if (old?.status === 'accepted') throw new AppError('They have already accepted your offer. Withdraw it first to change the terms.', 409, 'CONFLICT');
  if (old) await trx('pol_coalition_offers').where({ id: old.id }).update({ status: 'withdrawn', resolved_arc: arc, reason: 'Replaced by new terms.' });
  const [row] = await trx('pol_coalition_offers').insert({
    state_id: stateId, cycle_id: st.cycleId, kind: st.kind, from_party_id: me.party.id, to_party_id: to.id,
    posts: JSON.stringify(input.posts), promises: JSON.stringify(input.promises), hog: input.hog,
    status: 'pending', offered_arc: arc, offered_by_character_id: me.character.id,
  }).returning('*');
  if (isHuman(to)) {
    await notify(trx, to.leader_character_id, arc, 'coalition_offer', `${me.party.name} offers your party a place in government. See the terms under Nation, Coalition.`, 'nation');
  }
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'coalition_talks',
    headline: `${me.party.name} makes an offer to ${to.name}`,
    body: st.kind === 'form' ? 'Coalition talks continue.' : `${me.party.name} wants ${to.name} in the government.`,
  });
  return {
    offer: offerRow(row),
    message: isHuman(to) ? `Your offer is with ${to.name}.` : `${to.name} will answer when the month ends.`,
  };
}

/** A party leader answers an offer. Returns the cycle to check for a new majority (politics.service decides). */
export async function respondOffer(trx: any, stateId: string, me: Me, offerId: string, accept: boolean, arc: number) {
  if (!me.party || !me.isLeader) throw new AppError('Only a party leader can answer for the party.', 403, 'FORBIDDEN');
  const offer = await trx('pol_coalition_offers').where({ id: offerId, state_id: stateId }).forUpdate().first();
  if (!offer || offer.to_party_id !== me.party.id) throw new AppError('That offer is not addressed to your party.', 404, 'NOT_FOUND');
  if (offer.status !== 'pending') throw new AppError('That offer is no longer open.', 409, 'CONFLICT');
  const from = await trx('pol_parties').where({ id: offer.from_party_id }).first();
  if (!accept) {
    await trx('pol_coalition_offers').where({ id: offer.id }).update({ status: 'declined', resolved_arc: arc, reason: 'Declined by the party leader.' });
    await notify(trx, from?.leader_character_id, arc, 'coalition_declined', `${me.party.name} turns down your coalition offer.`, 'nation');
    return { status: 'declined', kind: offer.kind, cycleId: offer.cycle_id, message: 'You turned the offer down.' };
  }
  if (offer.kind === 'form') {
    // Joining one would-be government ends your own bid and any earlier yes.
    await trx('pol_coalition_offers').where({ cycle_id: offer.cycle_id, kind: 'form' }).whereIn('status', LIVE)
      .where(function (this: any) { this.where({ from_party_id: me.party.id }).orWhere({ to_party_id: me.party.id }); })
      .whereNot({ id: offer.id }).update({ status: 'void', resolved_arc: arc, reason: `${me.party.name} agreed to join ${from?.name ?? 'another government'}.` });
  }
  await trx('pol_coalition_offers').where({ id: offer.id }).update({ status: 'accepted', resolved_arc: arc, reason: 'Accepted by the party leader.' });
  await notify(trx, from?.leader_character_id, arc, 'coalition_accepted', `${me.party.name} accepts your coalition offer.`, 'nation');
  if (offer.kind === 'join') await joinGovernment(trx, stateId, offerRow({ ...offer, status: 'accepted' }), arc);
  return { status: 'accepted', kind: offer.kind, cycleId: offer.cycle_id, message: offer.kind === 'join' ? 'Your party joins the government.' : 'Your party is in. The government takes office as soon as it has a majority.' };
}

export async function withdrawOffer(trx: any, me: Me, offerId: string, arc: number) {
  if (!me.party || !me.isLeader) throw new AppError('Only a party leader can do that.', 403, 'FORBIDDEN');
  const offer = await trx('pol_coalition_offers').where({ id: offerId }).first();
  if (!offer || offer.from_party_id !== me.party.id) throw new AppError('That is not your offer.', 404, 'NOT_FOUND');
  if (!LIVE.includes(offer.status)) throw new AppError('That offer is already settled.', 409, 'CONFLICT');
  if (offer.status === 'accepted' && offer.kind === 'join') throw new AppError('They are already in the government.', 409, 'CONFLICT');
  await trx('pol_coalition_offers').where({ id: offer.id }).update({ status: 'withdrawn', resolved_arc: arc, reason: 'Withdrawn.' });
  const to = await trx('pol_parties').where({ id: offer.to_party_id }).first();
  await notify(trx, to?.leader_character_id, arc, 'coalition_withdrawn', `${me.party.name} withdraws its coalition offer.`, 'nation');
  return { message: 'Offer withdrawn.' };
}

/** A partner's leader takes the party out of government. */
export async function leaveGovernmentByChoice(trx: any, stateId: string, me: Me, arc: number) {
  if (!me.party || !me.isLeader) throw new AppError('Only the party leader can take the party out of government.', 403, 'FORBIDDEN');
  const gov = await getGovernment(trx, stateId);
  if (!gov.memberPartyIds.includes(me.party.id)) throw new AppError('Your party is not in the government.', 409, 'CONFLICT');
  if (gov.leadPartyId === me.party.id) throw new AppError(`The ${headOfGovernmentTitle((await trx('pol_states').where({ id: stateId }).first())?.code)}'s party cannot walk out of its own government.`, 409, 'CONFLICT');
  await leaveGovernment(trx, stateId, me.party.id, arc, 'choice');
  return { message: 'Your party has left the government.' };
}

// ═══════════════════════════════ GOVERNING ═══════════════════════════════

async function currentCoalition(trx: any, gov: GovernmentInfo): Promise<any | null> {
  if (!gov.sittingCycleId) return null;
  return trx('pol_coalitions').where({ cycle_id: gov.sittingCycleId }).whereIn('status', ['formed', 'minority']).first();
}

/** Give a cabinet post to a party: its best seated member if it has one, else a named civil servant. */
async function assignPost(trx: any, stateId: string, postKey: string, partyId: string, arc: number, gov: GovernmentInfo): Promise<void> {
  const taken = new Set((await trx('pol_cabinet_posts').where({ state_id: stateId }).whereNotNull('holder_character_id').select('holder_character_id')).map((r: any) => r.holder_character_id));
  const premier = await trx('pol_offices').where({ state_id: stateId, office: 'premier' }).orderBy('since_arc', 'desc').first();
  if (premier?.holder_character_id) taken.add(premier.holder_character_id);
  const seated = gov.sittingCycleId
    ? new Set((await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId }).whereNotNull('character_id').select('character_id')).map((r: any) => r.character_id))
    : new Set();
  const members = await trx('pol_party_members').join('characters', 'characters.id', 'pol_party_members.character_id')
    .where('pol_party_members.party_id', partyId).select('characters.id', 'characters.credibility');
  const pick = members.filter((m: any) => !taken.has(m.id))
    .sort((a: any, b: any) => (Number(seated.has(b.id)) - Number(seated.has(a.id))) || (num(b.credibility) - num(a.credibility)))[0];
  const names = new Set<string>((await trx('pol_cabinet_posts').where({ state_id: stateId }).whereNotNull('npc_name').select('npc_name')).map((r: any) => r.npc_name));
  await trx('pol_cabinet_posts').insert({
    state_id: stateId, post_key: postKey, party_id: partyId, holder_character_id: pick?.id ?? null,
    npc_name: pick ? null : uniqueNpcName(`${stateId}|${postKey}|${partyId}|${arc}`, names), appointed_arc: arc,
  }).onConflict(['state_id', 'post_key']).merge();
}

/** A party joins the sitting government mid-term on the terms of an accepted 'join' offer. */
export async function joinGovernment(trx: any, stateId: string, offer: any, arc: number): Promise<void> {
  const ctx = await loadCtx(trx, stateId);
  const co = await currentCoalition(trx, ctx.gov);
  if (!co) return;
  const members = [...new Set([...ctx.gov.memberPartyIds, offer.to_party_id])];
  const seats = members.reduce((t, id) => t + (ctx.gov.seatsByParty[id] || 0), 0);
  await trx('pol_coalitions').where({ id: co.id }).update({
    member_party_ids: JSON.stringify({ accepted: members, invited: [] }), total_seats: seats,
    status: seats >= ctx.majority ? 'formed' : 'minority',
  });
  const plats = members.map(id => ctx.parties.find(p => p.id === id)?.plat).filter(Boolean);
  const base = R.startingUnity({ platforms: plats, seats, majority: ctx.majority });
  const joiner = ctx.parties.find(p => p.id === offer.to_party_id);
  const promises: PromiseRow[] = offer.promises.map((p: R.PromiseInput) => ({ category: p.category, option: p.option, to_party_id: offer.to_party_id, by_arc: arc + p.months, status: 'pending', tried: false }));
  const terms = { party_id: offer.to_party_id, name: joiner?.name ?? 'Unknown', seats: joiner?.seats ?? 0, posts: offer.posts, promises: promises.length, hog: false, agreed_axes: [] };
  if (ctx.gov.agreementId) {
    const ag = await trx('pol_coalition_agreements').where({ id: ctx.gov.agreementId }).first();
    await trx('pol_coalition_agreements').where({ id: ag.id }).update({
      partner_terms: JSON.stringify([...json(ag.partner_terms, []), terms]),
      portfolio_allocation: JSON.stringify([...json(ag.portfolio_allocation, []).filter((x: any) => !offer.posts.includes(x.post)), ...offer.posts.map((post: string) => ({ post, party_id: offer.to_party_id }))]),
      mandatory_legislation: JSON.stringify([...json(ag.mandatory_legislation, []), ...promises]),
      base_unity: base, health: Math.round((num(ag.health) + base) / 2), last_unity_arc: arc,
    });
  } else {
    await trx('pol_coalition_agreements').insert({
      coalition_id: co.id, lead_party_id: co.lead_party_id, formateur_party_id: co.lead_party_id,
      partner_terms: JSON.stringify([terms]), mandatory_legislation: JSON.stringify(promises),
      portfolio_allocation: JSON.stringify(offer.posts.map((post: string) => ({ post, party_id: offer.to_party_id }))),
      review_interval_arcs: 12, next_review_arc: arc + 12, status: 'active', health: base, base_unity: base, formed_arc: arc, last_unity_arc: arc,
    });
  }
  const gov2 = await getGovernment(trx, stateId);
  for (const post of offer.posts) await assignPost(trx, stateId, post, offer.to_party_id, arc, gov2);
  const lead = ctx.parties.find(p => p.id === co.lead_party_id);
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'coalition_joined',
    headline: `${joiner?.name} joins the government`,
    body: `${lead?.name}'s government now holds ${seats} seats${seats >= ctx.majority ? ', a majority' : ''}.`,
  });
}

/** A partner leaves the government (walkout or the leader's choice). Its ministries go back to the leading party. */
export async function leaveGovernment(trx: any, stateId: string, partyId: string, arc: number, why: 'choice' | 'walkout'): Promise<void> {
  const ctx = await loadCtx(trx, stateId);
  const co = await currentCoalition(trx, ctx.gov);
  if (!co || co.lead_party_id === partyId) return;
  const members = ctx.gov.memberPartyIds.filter(id => id !== partyId);
  const seats = members.reduce((t, id) => t + (ctx.gov.seatsByParty[id] || 0), 0);
  await trx('pol_coalitions').where({ id: co.id }).update({
    member_party_ids: JSON.stringify({ accepted: members, invited: [] }), total_seats: seats,
    status: seats >= ctx.majority ? 'formed' : 'minority',
  });
  const ag = ctx.gov.agreementId ? await trx('pol_coalition_agreements').where({ id: ctx.gov.agreementId }).first() : null;
  const backTo = ag?.formateur_party_id && members.includes(ag.formateur_party_id) ? ag.formateur_party_id : co.lead_party_id;
  if (ag) {
    const promises = (json(ag.mandatory_legislation, []) as PromiseRow[]).map(p => (p.to_party_id === partyId && p.status === 'pending' ? { ...p, status: 'void' as const } : p));
    if (members.length < 2) {
      await trx('pol_coalition_agreements').where({ id: ag.id }).update({ status: 'dissolved', dissolved_arc: arc, mandatory_legislation: JSON.stringify(promises) });
    } else {
      const plats = members.map(id => ctx.parties.find(p => p.id === id)?.plat).filter(Boolean);
      const base = R.startingUnity({ platforms: plats, seats, majority: ctx.majority });
      await trx('pol_coalition_agreements').where({ id: ag.id }).update({
        partner_terms: JSON.stringify(json(ag.partner_terms, []).filter((t: any) => t.party_id !== partyId)),
        portfolio_allocation: JSON.stringify(json(ag.portfolio_allocation, []).filter((x: any) => x.party_id !== partyId)),
        mandatory_legislation: JSON.stringify(promises),
        base_unity: base, health: Math.min(base, num(ag.health) + UNITY_AFTER_WALKOUT_BOUNCE), last_unity_arc: arc,
      });
    }
  }
  const gov2 = await getGovernment(trx, stateId);
  const posts = await trx('pol_cabinet_posts').where({ state_id: stateId, party_id: partyId }).select('post_key');
  for (const p of posts) await assignPost(trx, stateId, p.post_key, backTo, arc, gov2);
  const leaver = ctx.parties.find(p => p.id === partyId);
  const lead = ctx.parties.find(p => p.id === co.lead_party_id);
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'coalition_walkout',
    headline: why === 'walkout' ? `${leaver?.name} walks out of the government` : `${leaver?.name} leaves the government`,
    body: `${lead?.name} now governs with ${seats} seats${seats < ctx.majority ? ', short of a majority' : ''}.`,
  });
  const leaders = members.map(id => ctx.parties.find(p => p.id === id)?.leader_character_id);
  await notifyMany(trx, [...leaders, leaver?.leader_character_id], arc, 'coalition_walkout',
    `${leaver?.name} has left the government. It holds ${seats} of the ${ctx.majority} seats it needs.`, 'nation');
}

/** Votes on a government bill move unity (called from settleBillPolitics with the counted plan). */
export async function coalitionAfterVote(trx: any, stateId: string, bill: any, partyLine: Record<string, 'yea' | 'nay' | undefined>, passed: boolean, arc: number): Promise<void> {
  const gov = await getGovernment(trx, stateId);
  if (!gov.agreementId || !gov.memberPartyIds.includes(bill.proposed_by_party_id)) return;
  const ag = await trx('pol_coalition_agreements').where({ id: gov.agreementId }).first();
  const e = { ...R.NO_UNITY_EVENTS };
  if (passed) e.outvoted = gov.memberPartyIds.filter(id => id !== bill.proposed_by_party_id && partyLine[id] === 'nay').length;
  else e.defeated = 1;
  let promises = json(ag.mandatory_legislation, []) as PromiseRow[];
  if (!passed) {
    const params = json(bill.params, {});
    promises = promises.map(p => (p.status === 'pending' && p.category === params?.category && p.option === params?.option ? { ...p, tried: true } : p));
  }
  if (e.outvoted + e.defeated === 0) {
    await trx('pol_coalition_agreements').where({ id: ag.id }).update({ mandatory_legislation: JSON.stringify(promises) });
    return;
  }
  await trx('pol_coalition_agreements').where({ id: ag.id }).update({
    health: R.unityAfterMonth(num(ag.health), num(ag.base_unity ?? ag.health), e), last_unity_arc: arc,
    mandatory_legislation: JSON.stringify(promises),
  });
}

/** Promises the government has not yet delivered (for the computer-run leader's bill choice and the Desk). */
export function pendingPromises(ag: any): PromiseRow[] {
  return (json(ag?.mandatory_legislation, []) as PromiseRow[]).filter(p => p.status === 'pending');
}

/**
 * Month end while governing: computer-run parties answer 'join' offers, promises
 * are judged, unity moves, a broken coalition loses a partner, and a computer-run
 * minority government tries to bring a party in.
 */
export async function stepCoalitionMonth(trx: any, stateId: string, arc: number): Promise<{ walkouts: { partyIds: string[] }[] }> {
  const walkouts: { partyIds: string[] }[] = [];
  let gov = await getGovernment(trx, stateId);
  if (!gov.leadPartyId || !gov.sittingCycleId) return { walkouts };
  if (await talksCycle(trx, stateId)) return { walkouts };

  const { accepted } = await npcDecide(trx, stateId, gov.sittingCycleId, arc, 'join');
  for (const o of accepted) await joinGovernment(trx, stateId, o, arc);
  if (accepted.length) gov = await getGovernment(trx, stateId);

  const ctx = await loadCtx(trx, stateId);
  if (gov.agreementId) {
    const ag = await trx('pol_coalition_agreements').where({ id: gov.agreementId }).first();
    const e = { ...R.NO_UNITY_EVENTS };
    const brokenTo: Record<string, number> = {};
    const promises = (json(ag.mandatory_legislation, []) as PromiseRow[]).map(p => {
      if (p.status !== 'pending') return p;
      if (lawNow(ctx.laws, p.category) === p.option) { e.kept++; return { ...p, status: 'kept' as const }; }
      if (arc >= p.by_arc) {
        if (p.tried) e.tried++; else e.broken++;
        brokenTo[p.to_party_id] = (brokenTo[p.to_party_id] || 0) + 1;
        return { ...p, status: 'broken' as const };
      }
      return p;
    });
    const scandals = await trx('pol_scandals').whereIn('party_id', gov.memberPartyIds).where({ discovery_arc: arc }).count('* as n').first();
    e.scandals = num(scandals?.n);
    const events = e.kept + e.broken + e.tried + e.scandals;
    const health = events === 0 && num(ag.last_unity_arc) === arc
      ? num(ag.health) // bills already moved it this month
      : R.unityAfterMonth(num(ag.health), num(ag.base_unity ?? ag.health), e);
    await trx('pol_coalition_agreements').where({ id: ag.id }).update({
      health, mandatory_legislation: JSON.stringify(promises), ...(events ? { last_unity_arc: arc } : {}),
      status: health < UNITY_WALKOUT_AT ? 'under_review' : 'active',
    });
    for (const [toId, n] of Object.entries(brokenTo)) {
      const to = ctx.parties.find(p => p.id === toId);
      const lead = ctx.parties.find(p => p.id === gov.leadPartyId);
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc, kind: 'coalition_promise_broken',
        headline: `${lead?.name} fails to deliver ${n === 1 ? 'a promise' : `${n} promises`} to ${to?.name}`,
        body: 'A law promised in the coalition deal is not in force by its deadline. The coalition is under strain.',
      });
      await notify(trx, to?.leader_character_id, arc, 'coalition_promise_broken', `The government missed the deadline on a law it promised your party.`, 'nation');
    }
    if (health < UNITY_WALKOUT_AT) {
      const lead = ctx.parties.find(p => p.id === gov.leadPartyId);
      const broken = (json(ag.mandatory_legislation, []) as PromiseRow[]).filter(p => p.status === 'broken');
      const candidates = gov.memberPartyIds.filter(id => id !== gov.leadPartyId)
        .map(id => ctx.parties.find(p => p.id === id)).filter(p => p && !isHuman(p))
        .map(p => ({ id: p.id, brokenToThem: broken.filter(b => b.to_party_id === p.id).length + (brokenTo[p.id] || 0), distance: R.platformDistance(lead.plat, p.plat) }));
      const who = R.walkoutChoice(candidates);
      if (who) {
        walkouts.push({ partyIds: [...gov.memberPartyIds] });
        await leaveGovernment(trx, stateId, who, arc, 'walkout');
      }
    }
  }

  // A computer-run minority government tries to bring a party in.
  gov = await getGovernment(trx, stateId);
  const lead = ctx.parties.find(p => p.id === gov.leadPartyId);
  if (gov.coalitionStatus === 'minority' && lead && !isHuman(lead)) {
    const live = await trx('pol_coalition_offers').where({ cycle_id: gov.sittingCycleId, kind: 'join', from_party_id: lead.id, status: 'pending' }).first();
    if (live) return { walkouts };
    const held = (await trx('pol_cabinet_posts').where({ state_id: stateId, party_id: lead.id }).select('post_key')).map((r: any) => r.post_key);
    const seated = ctx.parties.filter(p => p.seats > 0);
    const wishes: Record<string, R.Wish[]> = {};
    for (const p of seated) if (!gov.memberPartyIds.includes(p.id)) wishes[p.id] = wishesFor(ctx, p, lead);
    const refused = await trx('pol_coalition_offers').where({ cycle_id: gov.sittingCycleId, kind: 'join', from_party_id: lead.id, status: 'declined' })
      .where('resolved_arc', '>', arc - 6).select('to_party_id');
    const plan = R.buildNpcBloc({
      leadId: lead.id, parties: seated.map(p => ({ id: p.id, seats: p.seats, platform: p.plat })), majority: ctx.majority,
      maxDistance: ctx.maxDistance, wishes, excluded: new Set(refused.map((r: any) => r.to_party_id)),
      fixedIds: gov.memberPartyIds.filter(id => id !== lead.id), freePosts: held, leadWordBroken: num(lead.word_broken_until_arc) > arc,
    });
    for (const pk of plan?.packages ?? []) {
      await trx('pol_coalition_offers').insert({
        state_id: stateId, cycle_id: gov.sittingCycleId, kind: 'join', from_party_id: lead.id, to_party_id: pk.partyId,
        posts: JSON.stringify(pk.posts), promises: JSON.stringify(pk.promises), hog: false, status: 'pending', offered_arc: arc,
      }).onConflict().ignore();
      const target = ctx.parties.find(p => p.id === pk.partyId);
      if (isHuman(target)) await notify(trx, target.leader_character_id, arc, 'coalition_offer', `${lead.name} invites your party into government. See the terms under Nation, Coalition.`, 'nation');
    }
  }
  return { walkouts };
}

// ═══════════════════════════════ THE SCREEN ═══════════════════════════════

/** Everything the Coalition section shows (part of GET /politics/desk). */
export async function coalitionView(conn: any, stateId: string, me: Me | null, arc: number) {
  const ctx = await loadCtx(conn, stateId);
  const partyName = (id: string) => ctx.parties.find(p => p.id === id)?.name ?? 'Unknown';
  const talks = await talksCycle(conn, stateId);
  const standing = me ? await offerStanding(conn, ctx, stateId, me) : { kind: null, cycleId: null, why: 'Create a character first.' };
  const cycleId = talks?.id ?? ctx.gov.sittingCycleId;
  const offers = cycleId
    ? (await conn('pol_coalition_offers').where({ cycle_id: cycleId }).orderBy('created_at', 'desc').limit(60)).map(offerRow)
    : [];
  const shape = (o: any) => ({
    id: o.id, kind: o.kind, status: o.status, fromPartyId: o.from_party_id, toPartyId: o.to_party_id,
    fromName: partyName(o.from_party_id), toName: partyName(o.to_party_id), posts: o.posts,
    promises: o.promises.map((p: R.PromiseInput) => ({ ...p, title: billTitle(p.category, p.option) })),
    hog: o.hog, score: o.score == null ? null : Number(o.score), reason: o.reason, offeredArc: o.offered_arc, resolvedArc: o.resolved_arc,
  });
  const visible = talks ? offers : offers.filter((o: any) => o.kind === 'join' && (LIVE.includes(o.status) || num(o.resolved_arc) >= arc - 3));

  let government: any = null;
  if (!talks && ctx.gov.leadPartyId) {
    const ag = ctx.gov.agreementId ? await conn('pol_coalition_agreements').where({ id: ctx.gov.agreementId }).first() : null;
    const posts = await conn('pol_cabinet_posts').where({ state_id: stateId }).select('post_key', 'party_id');
    const members = ctx.gov.memberPartyIds.map(id => ({
      partyId: id, name: partyName(id), seats: ctx.gov.seatsByParty[id] || 0, color: ctx.parties.find(p => p.id === id)?.color ?? null,
      role: id === ctx.gov.leadPartyId ? 'lead' : 'partner',
      posts: posts.filter((p: any) => p.party_id === id).map((p: any) => p.post_key),
      human: isHuman(ctx.parties.find(p => p.id === id)),
    }));
    const seats = members.reduce((t, m) => t + m.seats, 0);
    const unity = ag ? num(ag.health) : null;
    government = {
      status: ctx.gov.coalitionStatus, seats, members, formateurPartyId: ag?.formateur_party_id ?? ctx.gov.leadPartyId,
      hogConceded: !!ag && ag.formateur_party_id && ag.formateur_party_id !== ctx.gov.leadPartyId,
      unity, baseUnity: ag ? num(ag.base_unity ?? ag.health) : null, unityLabel: unity == null ? null : R.unityLabel(unity),
      whipPercent: Math.round(R.whipScale(unity) * 100), walkoutAt: UNITY_WALKOUT_AT,
      promises: ag ? (json(ag.mandatory_legislation, []) as PromiseRow[]).map(p => ({
        ...p, title: billTitle(p.category, p.option), toName: partyName(p.to_party_id), monthsLeft: p.by_arc - arc,
      })) : [],
      formedArc: ag?.formed_arc ?? null,
    };
  }

  const myPartyId = me?.party?.id ?? null;
  const blocs = talks ? (await talkBlocs(conn, stateId, talks.id)).filter(b => b.partnerIds.length || offers.some((o: any) => o.from_party_id === b.leadId && LIVE.includes(o.status)))
    .map(b => ({
      leadPartyId: b.leadId, leadName: partyName(b.leadId), seats: b.seats, partners: b.partnerIds.map(id => ({ partyId: id, name: partyName(id) })),
      pending: offers.filter((o: any) => o.from_party_id === b.leadId && o.status === 'pending').map((o: any) => ({ partyId: o.to_party_id, name: partyName(o.to_party_id) })),
      hogPartyId: b.hogPartyId,
    })) : [];
  const myLive = myPartyId ? offers.filter((o: any) => o.from_party_id === myPartyId && LIVE.includes(o.status) && o.kind === standing.kind) : [];
  let offerablePosts = CABINET_POSTS.map(p => p.key);
  if (standing.kind === 'join' && myPartyId) {
    offerablePosts = (await conn('pol_cabinet_posts').where({ state_id: stateId, party_id: myPartyId }).select('post_key')).map((r: any) => r.post_key);
  }
  return {
    phase: talks ? 'talks' : ctx.gov.leadPartyId ? 'governing' : 'none',
    talksEndArc: talks?.formation_end_arc ?? null,
    majority: ctx.majority,
    headOfGovernmentTitle: headOfGovernmentTitle(ctx.stateRow?.code),
    parties: ctx.parties.filter(p => p.seats > 0).sort((a, b) => b.seats - a.seats).map(p => ({
      id: p.id, name: p.name, abbreviation: p.abbreviation, color: p.color ?? null, seats: p.seats, human: isHuman(p),
      inGovernment: ctx.gov.memberPartyIds.includes(p.id),
      distanceFromMe: myPartyId && p.id !== myPartyId ? Math.round(R.platformDistance(ctx.parties.find(x => x.id === myPartyId)?.plat ?? p.plat, p.plat) * 100) / 100 : null,
    })),
    blocs,
    government,
    offers: visible.map(shape),
    me: {
      partyId: myPartyId, canOffer: !!standing.kind, offerKind: standing.kind, whyNot: standing.why,
      canLeave: !!myPartyId && !!me?.isLeader && !talks && ctx.gov.memberPartyIds.includes(myPartyId) && ctx.gov.leadPartyId !== myPartyId,
      postsPromised: myLive.flatMap((o: any) => o.posts), hogPromised: myLive.some((o: any) => o.hog),
      offerablePosts,
    },
    posts: CABINET_POSTS.map(p => ({ key: p.key, title: p.title, short: p.short, blurb: localisePlaces(p.blurb, ctx.stateRow?.code), value: COALITION_POST_VALUE[p.key] ?? 0 })),
    laws: POLICY_CATALOG.map(c => ({ category: c.id, name: c.name, current: lawNow(ctx.laws, c.id), options: c.options.map(o => ({ id: o.id, name: o.name })) })),
    limits: { maxPromises: COALITION_MAX_PROMISES, minMonths: COALITION_PROMISE_MIN_MONTHS, maxMonths: COALITION_PROMISE_MAX_MONTHS, rivalMinUnity: COALITION_RIVAL_MIN_UNITY },
  };
}
