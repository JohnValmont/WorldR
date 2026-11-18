/**
 * The world stage — every tunable number for the career ladder, the World
 * Influence Index and the Meridian Wire (docs/WORLD_STAGE.md).
 *
 * AGENTS.md: all tunable numbers live in constants files. Change them here.
 *
 * The Influence Index is a READ-ONLY summary of numbers the game already has
 * (office, party seats, clout, trust, laws, promises kept). It is published,
 * not fed back: elections, votes and deals never read it. Support remains the
 * one number that moves voters.
 */

// ─── The career ladder ──────────────────────────────────────────────────────
export type CareerRung = 'citizen' | 'member' | 'candidate' | 'mp' | 'leader' | 'minister' | 'premier' | 'statesman';

export interface RungSpec {
  key: CareerRung;
  /** Shown to players. 'premier' is replaced by the nation's own title. */
  title: string;
  /** What this rung lets you do (one line). */
  unlocks: string;
  /** How to reach the NEXT rung from here (one line). */
  next: string | null;
}

export const LADDER: RungSpec[] = [
  { key: 'citizen', title: 'Citizen', unlocks: 'Chat, write for the Meridian Wire, take personal deals.',
    next: 'Join a party, or found your own, in the Party tab.' },
  { key: 'member', title: 'Party member', unlocks: 'Rallies, ads and fundraisers for your party; a vote in leadership contests.',
    next: 'Stand for a district when filing opens, or join a party with spare seats to be seated at once.' },
  { key: 'candidate', title: 'Candidate', unlocks: 'Your name on the ballot in a district.',
    next: 'Win your district on election day.' },
  { key: 'mp', title: 'Member of Parliament', unlocks: 'Your own vote on every bill, and a vote other politicians will pay for.',
    next: 'Build clout to 45 and spend six months in the party, then challenge for its leadership.' },
  { key: 'leader', title: 'Party leader', unlocks: 'Your vote sets the line for every seat your party holds; party deals and favours.',
    next: 'Bring your party into government, or be named a minister by the head of government.' },
  { key: 'minister', title: 'Minister', unlocks: 'Decrees in your portfolio, and cheaper bills on its laws.',
    next: 'Lead the largest party of the governing coalition.' },
  { key: 'premier', title: 'Head of government', unlocks: 'Appoint the cabinet, issue national decrees, steer the country.',
    next: 'Rank in the top 3 of the Meridian Wire\'s World Influence Index.' },
  { key: 'statesman', title: 'World statesman', unlocks: 'The top of the world: named among the three most influential politicians alive.',
    next: null },
];
export const RUNG_ORDER: Record<CareerRung, number> = Object.fromEntries(LADDER.map((r, i) => [r.key, i])) as Record<CareerRung, number>;
/** A politician ranked this high (or higher) in the latest edition is a World statesman. */
export const STATESMAN_RANK = 3;

// ─── The World Influence Index ──────────────────────────────────────────────
// score = (office base + seat weight + personal + record + press) x nation factor
// "%" = this politician's score as a share of every ranked politician's score.
//
// Modelled (nation power 50 -> factor 1.0):
//   head of government leading a 45% party, government 55%, clout 60, trust 60, 3 laws: 84.5
//   computer-run head of government (same seats, clout/trust 50):                       75.5
//   computer-run leader of a 30% opposition party:                                       32
//   player minister, clout 50 trust 50:                                                  29
//   player MP, clout 30 trust 50:                                                         16
//   player party member, clout 20 trust 50:                                               10.5
// With ~18 computer-run leaders and 24 players across three nations the total is
// about 950, so a head of government holds 7-9% and a new member about 1%.
export const INDEX_OFFICE_BASE = { premier: 36, minister: 14, leader: 8, mp: 5, member: 1.5, citizen: 0.5 } as const;
/** Head of government: x the government's share of all seats. */
export const INDEX_GOVERNMENT_SEAT_WEIGHT = 20;
/** Anyone leading a party with seats: x that party's share of all seats. */
export const INDEX_PARTY_SEAT_WEIGHT = 30;
export const INDEX_CLOUT_WEIGHT = 0.20;
export const INDEX_TRUST_WEIGHT = 0.10;
/** Laws you tabled that passed in the last INDEX_RECORD_MONTHS. */
export const INDEX_LAW_POINTS = 2;
export const INDEX_LAW_CAP = 5;
/** Promises kept / broken in the last INDEX_RECORD_MONTHS. Breaking costs three times what keeping earns. */
export const INDEX_WORD_KEPT_POINTS = 1;
export const INDEX_WORD_BROKEN_POINTS = -3;
export const INDEX_WORD_CAP = 5;
export const INDEX_RECORD_MONTHS = 12;
/** Endorsements your dispatches earned this month. */
export const INDEX_PRESS_POINTS = 0.25;
export const INDEX_PRESS_CAP = 20;
export const INDEX_MIN_SCORE = 0.5;
/** Nation power 0 -> x0.75, 100 -> x1.25: a stronger country lends weight, never more than a quarter. */
export const INDEX_NATION_FACTOR_MIN = 0.75;
export const INDEX_NATION_FACTOR_RANGE = 0.5;
/** Computer-run leaders have no clout or trust of their own; they are scored at this. */
export const INDEX_NPC_CLOUT = 50;
export const INDEX_NPC_TRUST = 50;
/** How many names each edition prints. */
export const INDEX_PUBLISH_SIZE = 25;
/** The live (between editions) index is cached this long. */
export const INDEX_LIVE_CACHE_MS = 60_000;

// ─── The Meridian Wire ──────────────────────────────────────────────────────
export const WIRE_NAME = 'The Meridian Wire';
export const WIRE_TAGLINE = 'Independent. International. Accountable to no government.';
/** Ledger kinds the Wire reports, most newsworthy first. */
export const WIRE_STORY_KINDS = [
  'election_results', 'government_formed', 'cabinet_formed', 'new_leader', 'leadership_contest', 'bill_passed',
  'bill_failed', 'word_broken', 'decree', 'rebel_vote', 'cabinet_reshuffle', 'pact_made', 'favour_called', 'new_mp',
] as const;
export const WIRE_STORIES_PER_NATION = 4;
/** The most endorsed reader dispatches of the month are printed in the edition. */
export const WIRE_EDITION_DISPATCHES = 5;

// ─── Reader dispatches (news written by players) ────────────────────────────
export const DISPATCH_HEADLINE_MIN = 8;
export const DISPATCH_HEADLINE_MAX = 120;
export const DISPATCH_BODY_MIN = 40;
export const DISPATCH_BODY_MAX = 1500;
/** Dispatches one politician may file per game month (8 real hours). */
export const DISPATCH_PER_MONTH = 2;
/** Energy to file one: a dispatch is a choice, not free spam. */
export const DISPATCH_AP = 1;
export const DISPATCH_MIN_SECONDS_BETWEEN = 60;
/** A dispatch this many readers report is hidden until an admin looks at it. */
export const DISPATCH_HIDE_AT_REPORTS = 3;
/** Every N endorsements a month's dispatches earn = +1 clout for the author, at the edition. */
export const DISPATCH_ENDORSEMENTS_PER_CLOUT = 3;
export const DISPATCH_MAX_CLOUT_PER_MONTH = 3;
/** How many of the month's dispatches the front page lists. */
export const DISPATCH_FEED_SIZE = 40;

// ─── Inbox ──────────────────────────────────────────────────────────────────
export const NOTICES_ON_DESK = 20;
