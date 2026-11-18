// Coalitions: pure rules (docs/COALITIONS.md). No database here; numbers in constants/coalition.ts.
import { AXES, Platform } from '../constants/politics';
import {
  COALITION_ACCEPT_AT, COALITION_CROWDING_PENALTY, COALITION_GOVERNMENT_APPETITE, COALITION_HOG_VALUE,
  COALITION_IDEOLOGY_WEIGHT, COALITION_MAX_PROMISES, COALITION_NPC_PROMISE_MONTHS, COALITION_NPC_PROMISE_TOLERANCE,
  COALITION_POST_VALUE, COALITION_PROMISE_CAP, COALITION_PROMISE_MAX_MONTHS, COALITION_PROMISE_MIN_MONTHS,
  COALITION_PROMISE_WEIGHT, COALITION_WORD_BROKEN_PENALTY, COALITION_OUTBID_MARGIN,
  UNITY_BANDS, UNITY_BASE, UNITY_GOV_BILL_DEFEATED, UNITY_MARGIN_CAP, UNITY_MINORITY_PENALTY, UNITY_PARTNER_OUTVOTED,
  UNITY_PER_EXTRA_PARTY, UNITY_PROMISE_BROKEN, UNITY_PROMISE_KEPT, UNITY_PROMISE_TRIED, UNITY_QUIET_RECOVERY,
  UNITY_SCANDAL, UNITY_SPREAD_WEIGHT, UNITY_WHIP_MAX, UNITY_WHIP_MIN, UNITY_WHIP_REF,
} from '../constants/coalition';
import { allocateSeatsDHondt } from './electionEngine';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The posts in the order a partner is handed them: least valuable first (ties keep cabinet order reversed). */
export const POSTS_CHEAPEST_FIRST: string[] = Object.keys(COALITION_POST_VALUE)
  .map((k, i) => ({ k, i }))
  .sort((a, b) => COALITION_POST_VALUE[a.k] - COALITION_POST_VALUE[b.k] || b.i - a.i)
  .map(x => x.k);
export const AVERAGE_POST_VALUE = Object.values(COALITION_POST_VALUE).reduce((s, v) => s + v, 0) / Object.keys(COALITION_POST_VALUE).length;
export const POST_COUNT = Object.keys(COALITION_POST_VALUE).length;

/** Distance between two platforms (0 = identical). Same measure the old coalition code used. */
export function platformDistance(a: Platform, b: Platform): number {
  let sq = 0;
  for (const axis of AXES) sq += Math.pow(((a[axis] || 0) - (b[axis] || 0)) / 100, 2);
  return Math.sqrt(sq);
}

/** Each party's fair number of ministries in a bloc: D'Hondt over seats. */
export function fairPosts(seatsByParty: Record<string, number>, posts = POST_COUNT): Record<string, number> {
  return allocateSeatsDHondt(seatsByParty, posts);
}

// ═══════════════════════════════ UNITY ═══════════════════════════════

export interface UnityStartInput { platforms: Platform[]; seats: number; majority: number }

/** How united a coalition is the day it forms (0..100). */
export function startingUnity(input: UnityStartInput): number {
  const n = input.platforms.length;
  let spread = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) spread = Math.max(spread, platformDistance(input.platforms[i], input.platforms[j]));
  const margin = input.seats - input.majority;
  const marginPart = margin >= 0 ? Math.min(UNITY_MARGIN_CAP, margin) : -UNITY_MINORITY_PENALTY;
  return Math.round(clamp(UNITY_BASE - UNITY_PER_EXTRA_PARTY * Math.max(0, n - 2) - UNITY_SPREAD_WEIGHT * spread + marginPart, 0, 100));
}

export interface UnityEvents { kept: number; broken: number; tried: number; outvoted: number; defeated: number; scandals: number }
export const NO_UNITY_EVENTS: UnityEvents = { kept: 0, broken: 0, tried: 0, outvoted: 0, defeated: 0, scandals: 0 };

/** Unity after one month. A quiet month recovers a little, never above the starting level. */
export function unityAfterMonth(unity: number, base: number, e: UnityEvents): number {
  const delta = e.kept * UNITY_PROMISE_KEPT + e.broken * UNITY_PROMISE_BROKEN + e.tried * UNITY_PROMISE_TRIED
    + e.outvoted * UNITY_PARTNER_OUTVOTED + e.defeated * UNITY_GOV_BILL_DEFEATED + e.scandals * UNITY_SCANDAL;
  const quiet = e.kept + e.broken + e.tried + e.outvoted + e.defeated + e.scandals === 0;
  let next = unity + delta;
  if (quiet && unity < base) next = Math.min(base, unity + UNITY_QUIET_RECOVERY);
  return Math.round(clamp(next, 0, 100));
}

/** How hard the government whip pulls, relative to normal (1 = unchanged). null = one-party government. */
export function whipScale(unity: number | null | undefined): number {
  if (unity == null) return 1;
  return clamp(unity / UNITY_WHIP_REF, UNITY_WHIP_MIN, UNITY_WHIP_MAX);
}

export function unityLabel(unity: number): string {
  return (UNITY_BANDS.find(b => unity >= b.min) ?? UNITY_BANDS[UNITY_BANDS.length - 1]).label;
}

/** Which computer-run partner walks out: most promises broken to it, then furthest in ideology. */
export function walkoutChoice(partners: { id: string; brokenToThem: number; distance: number }[]): string | null {
  if (!partners.length) return null;
  return [...partners].sort((a, b) => b.brokenToThem - a.brokenToThem || b.distance - a.distance || a.id.localeCompare(b.id))[0].id;
}

// ═══════════════════════════════ OFFERS ═══════════════════════════════

export interface OfferScoreInput {
  distance: number;
  /** The nation's coalitionMaxDistance. */
  maxDistance: number;
  posts: string[];
  /** The partner's fair number of posts in the planned bloc. */
  fairPostCount: number;
  /** How much the partner likes each promised change (changeDesirability). */
  promiseLikings: number[];
  hog: boolean;
  /** Parties in the planned government, the offering party included. */
  blocSize: number;
  wordBroken: boolean;
}
export interface OfferScore {
  score: number;
  accept: boolean;
  parts: { ideology: number; posts: number; promises: number; hog: number; appetite: number; crowding: number; word: number };
  reason: string;
}

/** Would a computer-run party join this government? */
export function offerScore(i: OfferScoreInput): OfferScore {
  const parts = {
    ideology: COALITION_IDEOLOGY_WEIGHT * (1 - i.distance / Math.max(0.01, i.maxDistance)),
    posts: i.posts.reduce((s, p) => s + (COALITION_POST_VALUE[p] ?? 0), 0) - i.fairPostCount * AVERAGE_POST_VALUE,
    promises: clamp(COALITION_PROMISE_WEIGHT * i.promiseLikings.reduce((s, v) => s + v, 0), -COALITION_PROMISE_CAP, COALITION_PROMISE_CAP),
    hog: i.hog ? COALITION_HOG_VALUE : 0,
    appetite: COALITION_GOVERNMENT_APPETITE,
    crowding: -COALITION_CROWDING_PENALTY * Math.max(0, i.blocSize - 2),
    word: i.wordBroken ? -COALITION_WORD_BROKEN_PENALTY : 0,
  };
  const score = Object.values(parts).reduce((s, v) => s + v, 0);
  const accept = score >= COALITION_ACCEPT_AT;
  let reason: string;
  if (accept) reason = 'They would accept.';
  else if (i.wordBroken) reason = 'Your party broke its word to them, or recently to others. They do not trust your promises.';
  else if (score > -0.15) reason = 'Close: a more important ministry, or a law they want, would do it.';
  else if (score > -0.4) reason = 'They want much more: another ministry and a law they care about.';
  else reason = 'Too far apart in their views. Only the top job and big promises could bring them in.';
  return { score: Math.round(score * 1000) / 1000, accept, parts, reason };
}

/** A computer-run party's pick among offers: the best score at or above the bar; ties go to the bigger party. */
export function pickBestOffer<T extends { score: number; leadSeats: number; id: string }>(offers: T[]): T | null {
  const ok = offers.filter(o => o.score >= COALITION_ACCEPT_AT);
  if (!ok.length) return null;
  return [...ok].sort((a, b) => b.score - a.score || b.leadSeats - a.leadSeats || a.id.localeCompare(b.id))[0];
}

export interface PromiseInput { category: string; option: string; months: number }

/**
 * Is an offer well-formed? Returns a plain-English problem, or null.
 * `postsPromisedElsewhere`: posts this leader already promised in other live offers.
 */
export function offerProblem(o: {
  posts: string[]; promises: PromiseInput[]; hog: boolean;
  validPosts: string[]; postsPromisedElsewhere: string[]; hogPromisedElsewhere: boolean;
  isValidChange: (category: string, option: string) => boolean;
}): string | null {
  if (new Set(o.posts).size !== o.posts.length) return 'Each ministry can only be offered once.';
  for (const p of o.posts) {
    if (!o.validPosts.includes(p)) return `Unknown ministry: ${p}.`;
    if (o.postsPromisedElsewhere.includes(p)) return 'You have already offered that ministry to another party.';
  }
  if (o.posts.length + o.postsPromisedElsewhere.length > o.validPosts.length - 1) return 'Your own party must keep at least one ministry.';
  if (o.promises.length > COALITION_MAX_PROMISES) return `At most ${COALITION_MAX_PROMISES} law promises per offer.`;
  if (new Set(o.promises.map(p => p.category)).size !== o.promises.length) return 'Promise each law only once.';
  for (const p of o.promises) {
    if (!Number.isInteger(p.months) || p.months < COALITION_PROMISE_MIN_MONTHS || p.months > COALITION_PROMISE_MAX_MONTHS) {
      return `A promise needs a deadline of ${COALITION_PROMISE_MIN_MONTHS} to ${COALITION_PROMISE_MAX_MONTHS} months.`;
    }
    if (!o.isValidChange(p.category, p.option)) return 'One of the promised laws is not a real change to the law in force.';
  }
  if (o.hog && o.hogPromisedElsewhere) return 'You have already offered the top job to another party.';
  if (!o.posts.length && !o.promises.length && !o.hog) return 'Offer something: a ministry, a law promise or the top job.';
  return null;
}

// ═══════════════════════════════ COMPUTER-RUN LEADERS ═══════════════════════════════

export interface BlocParty { id: string; seats: number; platform: Platform; wordBroken?: boolean }
/** Changes a partner wants, best first, with how much the would-be leader likes each. */
export interface Wish { category: string; option: string; partnerLiking: number; leadLiking: number }
export interface Package { partyId: string; posts: string[]; promises: PromiseInput[]; hog: boolean; score: number; promiseLikings: number[] }
export interface BlocPlan { leadId: string; packages: Package[]; seats: number; unity: number }

/**
 * How a computer-run party builds a government: partners closest first until a
 * majority, unneeded partners dropped (furthest first), then each partner's
 * price. A partner that cannot be satisfied is skipped for the next closest.
 * Returns null when no majority can be bought.
 */
export function buildNpcBloc(input: {
  leadId: string;
  parties: BlocParty[];
  majority: number;
  maxDistance: number;
  wishes: Record<string, Wish[]>;
  excluded?: Set<string>;
  /** The leader's own broken word (pol_parties.word_broken_until_arc in the future). */
  leadWordBroken?: boolean;
  /** Mid-term: parties already in the government (not priced again). */
  fixedIds?: string[];
  /** Mid-term: the posts the leader's party holds and can give away. Default: all five. */
  freePosts?: string[];
  /** Rival offers to beat: partner id -> the best score a rival bloc offers it. */
  mustBeat?: Record<string, number>;
}): BlocPlan | null {
  const lead = input.parties.find(p => p.id === input.leadId);
  if (!lead || lead.seats <= 0) return null;
  const excluded = new Set(input.excluded ?? []);
  const fixed = input.parties.filter(p => (input.fixedIds ?? []).includes(p.id) && p.id !== lead.id);
  for (const f of fixed) excluded.add(f.id);
  const dist = (p: BlocParty) => platformDistance(lead.platform, p.platform);

  for (let attempt = 0; attempt <= input.parties.length; attempt++) {
    const pool = input.parties
      .filter(p => p.id !== lead.id && p.seats > 0 && !excluded.has(p.id))
      .sort((a, b) => dist(a) - dist(b) || b.seats - a.seats || a.id.localeCompare(b.id));
    const members: BlocParty[] = [];
    let seats = lead.seats + fixed.reduce((t, f) => t + f.seats, 0);
    for (const p of pool) {
      if (seats >= input.majority) break;
      members.push(p); seats += p.seats;
    }
    if (seats < input.majority || !members.length) return null;
    for (const m of [...members].reverse()) {
      if (seats - m.seats >= input.majority) { members.splice(members.indexOf(m), 1); seats -= m.seats; }
    }
    const mustBeat = input.mustBeat ?? {};
    const bar = (id: string) => Math.max(COALITION_ACCEPT_AT, (mustBeat[id] ?? -Infinity) + COALITION_OUTBID_MARGIN);
    const packages = pricePartners(lead, fixed, members, input.maxDistance, input.wishes, !!input.leadWordBroken, input.freePosts, bar);
    const refuser = packages.find(p => p.score < bar(p.partyId));
    if (refuser) { excluded.add(refuser.partyId); continue; }
    const unity = startingUnity({ platforms: [lead.platform, ...fixed.map(f => f.platform), ...members.map(m => m.platform)], seats, majority: input.majority });
    return { leadId: lead.id, packages, seats, unity };
  }
  return null;
}

function pricePartners(
  lead: BlocParty, fixed: BlocParty[], members: BlocParty[], maxDistance: number,
  wishes: Record<string, Wish[]>, leadWordBroken: boolean, freePosts?: string[],
  bar: (partyId: string) => number = () => COALITION_ACCEPT_AT,
): Package[] {
  const bloc = [lead, ...fixed, ...members];
  const fair = fairPosts(Object.fromEntries(bloc.map(p => [p.id, p.seats])));
  // Posts the leader still holds, cheapest first.
  const free = POSTS_CHEAPEST_FIRST.filter(p => !freePosts || freePosts.includes(p));
  const usedCategories = new Set<string>();
  let hogGiven = false;
  const ordered = [...members].sort((a, b) => b.seats - a.seats || a.id.localeCompare(b.id));
  const out: Package[] = [];
  for (const m of ordered) {
    const pkg: Package = { partyId: m.id, posts: [], promises: [], hog: false, score: 0, promiseLikings: [] };
    for (let k = 0; k < (fair[m.id] ?? 0) && free.length > 1; k++) pkg.posts.push(free.shift()!);
    const rescore = () => {
      pkg.score = offerScore({
        distance: platformDistance(lead.platform, m.platform), maxDistance,
        posts: pkg.posts, fairPostCount: fair[m.id] ?? 0, promiseLikings: pkg.promiseLikings,
        hog: pkg.hog, blocSize: bloc.length, wordBroken: leadWordBroken,
      }).score;
    };
    rescore();
    const need = bar(m.id);
    // 1. Upgrade the cheapest post for the best one the leader still holds.
    if (pkg.score < need && pkg.posts.length && free.length > 1) {
      const best = free[free.length - 1];
      const cheapest = pkg.posts[0];
      if ((COALITION_POST_VALUE[best] ?? 0) > (COALITION_POST_VALUE[cheapest] ?? 0)) {
        free.splice(free.length - 1, 1, cheapest);
        free.sort((a, b) => POSTS_CHEAPEST_FIRST.indexOf(a) - POSTS_CHEAPEST_FIRST.indexOf(b));
        pkg.posts[0] = best;
        rescore();
      }
    }
    // 2. Promise the law they most want that the leader can live with.
    if (pkg.score < need) {
      const wish = (wishes[m.id] ?? []).find(w => w.partnerLiking > 0 && w.leadLiking >= COALITION_NPC_PROMISE_TOLERANCE && !usedCategories.has(w.category));
      if (wish) {
        usedCategories.add(wish.category);
        pkg.promises.push({ category: wish.category, option: wish.option, months: COALITION_NPC_PROMISE_MONTHS });
        pkg.promiseLikings.push(wish.partnerLiking);
        rescore();
      }
    }
    // 3. One more post, as long as the leader keeps one.
    if (pkg.score < need && free.length > 1) {
      pkg.posts.push(free.pop()!);
      rescore();
    }
    // 4. The top job, only to a partner bigger than the leader.
    if (pkg.score < need && !hogGiven && m.seats > lead.seats) {
      pkg.hog = true; hogGiven = true;
      rescore();
    }
    out.push(pkg);
  }
  return out;
}
