/**
 * The world stage — PURE rules (docs/WORLD_STAGE.md): where a politician stands
 * on the career ladder, their World Influence Index score and rank, how a
 * leadership contest is decided, and what makes a valid reader dispatch.
 * No database access: unit-tested in tests/worldStage.test.ts.
 */
import {
  CareerRung, DISPATCH_BODY_MAX, DISPATCH_BODY_MIN, DISPATCH_ENDORSEMENTS_PER_CLOUT, DISPATCH_HEADLINE_MAX,
  DISPATCH_HEADLINE_MIN, DISPATCH_MAX_CLOUT_PER_MONTH, INDEX_CLOUT_WEIGHT, INDEX_GOVERNMENT_SEAT_WEIGHT,
  INDEX_LAW_CAP, INDEX_LAW_POINTS, INDEX_MIN_SCORE, INDEX_NATION_FACTOR_MIN, INDEX_NATION_FACTOR_RANGE,
  INDEX_OFFICE_BASE, INDEX_PARTY_SEAT_WEIGHT, INDEX_PRESS_CAP, INDEX_PRESS_POINTS, INDEX_TRUST_WEIGHT,
  INDEX_WORD_BROKEN_POINTS, INDEX_WORD_CAP, INDEX_WORD_KEPT_POINTS, LADDER, RUNG_ORDER, STATESMAN_RANK,
} from '../constants/worldStage';
import { CONTEST_BALLOT_WEIGHT, CONTEST_MP_BALLOT_MULT, LEADERSHIP_MARGIN } from '../constants/floor';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ═══════════════════════════════ LADDER ═══════════════════════════════

export interface RungInput {
  hasParty: boolean;
  isCandidate: boolean;
  hasSeat: boolean;
  /** Leads a party that holds seats. */
  leadsSeatedParty: boolean;
  isMinister: boolean;
  isHead: boolean;
  /** Rank in the latest Meridian edition, or null if unranked / no edition yet. */
  worldRank: number | null;
}

/** The highest rung a politician holds right now. */
export function careerRung(p: RungInput): CareerRung {
  if (p.worldRank != null && p.worldRank >= 1 && p.worldRank <= STATESMAN_RANK && (p.isHead || p.isMinister || p.leadsSeatedParty)) return 'statesman';
  if (p.isHead) return 'premier';
  if (p.isMinister) return 'minister';
  if (p.leadsSeatedParty) return 'leader';
  if (p.hasSeat) return 'mp';
  if (p.isCandidate && p.hasParty) return 'candidate';
  if (p.hasParty) return 'member';
  return 'citizen';
}

export const rungAbove = (a: CareerRung, b: CareerRung) => RUNG_ORDER[a] > RUNG_ORDER[b];

/** The ladder for one player's screen, with the head of government's local title. */
export function ladderFor(current: CareerRung, peak: CareerRung, headTitle: string) {
  return LADDER.map(r => ({
    key: r.key,
    title: r.key === 'premier' ? headTitle : r.title,
    unlocks: r.unlocks,
    next: r.next,
    reached: RUNG_ORDER[r.key] <= RUNG_ORDER[current],
    current: r.key === current,
    peak: r.key === peak,
  }));
}

// ═══════════════════════════════ INFLUENCE INDEX ═══════════════════════════════

export type IndexOffice = keyof typeof INDEX_OFFICE_BASE;
export interface InfluenceInput {
  office: IndexOffice;
  /** Share of all seats held by the party this politician LEADS (0 if they lead none). */
  ledPartySeatShare: number;
  /** For the head of government: share of all seats the government holds. */
  governmentSeatShare: number;
  clout: number;
  trust: number;
  lawsPassed: number;
  wordKept: number;
  wordBroken: number;
  endorsements: number;
  /** The nation's overall power, 0..100. */
  nationPower: number;
}

export function nationFactor(power: number): number {
  return INDEX_NATION_FACTOR_MIN + INDEX_NATION_FACTOR_RANGE * clamp(n(power), 0, 100) / 100;
}

export function influenceScore(p: InfluenceInput): number {
  const office = INDEX_OFFICE_BASE[p.office] ?? INDEX_OFFICE_BASE.citizen;
  const seats = INDEX_PARTY_SEAT_WEIGHT * clamp(n(p.ledPartySeatShare), 0, 1)
    + (p.office === 'premier' ? INDEX_GOVERNMENT_SEAT_WEIGHT * clamp(n(p.governmentSeatShare), 0, 1) : 0);
  const personal = INDEX_CLOUT_WEIGHT * clamp(n(p.clout), 0, 100) + INDEX_TRUST_WEIGHT * clamp(n(p.trust), 0, 100);
  const record = INDEX_LAW_POINTS * clamp(n(p.lawsPassed), 0, INDEX_LAW_CAP)
    + INDEX_WORD_KEPT_POINTS * clamp(n(p.wordKept), 0, INDEX_WORD_CAP)
    + INDEX_WORD_BROKEN_POINTS * clamp(n(p.wordBroken), 0, INDEX_WORD_CAP);
  const press = INDEX_PRESS_POINTS * clamp(n(p.endorsements), 0, INDEX_PRESS_CAP);
  const raw = Math.max(INDEX_MIN_SCORE, office + seats + personal + record + press);
  return raw * nationFactor(p.nationPower);
}

export interface IndexEntry {
  key: string;
  score: number;
  [extra: string]: any;
}
export interface RankedEntry extends IndexEntry {
  rank: number;
  /** Share of the world's total influence, in percent (all ranked entries add to 100). */
  share: number;
  prevRank: number | null;
  /** Positive = climbed. null = new to the index. */
  move: number | null;
}

/**
 * Rank everyone by score and give each their share of the total, in percent.
 * Ties are broken by key so the order is stable. `prev` maps key -> last rank.
 */
export function rankInfluence(entries: IndexEntry[], prev: Record<string, number> = {}): RankedEntry[] {
  const total = entries.reduce((a, e) => a + Math.max(0, n(e.score)), 0);
  return [...entries]
    .sort((a, b) => n(b.score) - n(a.score) || String(a.key).localeCompare(String(b.key)))
    .map((e, i) => {
      const prevRank = prev[e.key] ?? null;
      return {
        ...e,
        score: Math.round(n(e.score) * 10) / 10,
        rank: i + 1,
        share: total > 0 ? Math.round(Math.max(0, n(e.score)) / total * 1000) / 10 : 0,
        prevRank,
        move: prevRank == null ? null : prevRank - (i + 1),
      };
    });
}

// ═══════════════════════════════ LEADERSHIP CONTEST ═══════════════════════════════

export interface ContestInput {
  challengerClout: number;
  leaderClout: number;
  ballots: { side: 'challenger' | 'leader'; hasSeat: boolean }[];
}
export interface ContestResult { challenger: number; leader: number; winner: 'challenger' | 'leader' }

/** Who wins a leadership contest. Ties go to the leader. */
export function contestResult(c: ContestInput): ContestResult {
  let challenger = clamp(n(c.challengerClout), 0, 100);
  let leader = clamp(n(c.leaderClout), 0, 100) + LEADERSHIP_MARGIN;
  for (const b of c.ballots) {
    const w = CONTEST_BALLOT_WEIGHT * (b.hasSeat ? CONTEST_MP_BALLOT_MULT : 1);
    if (b.side === 'challenger') challenger += w; else leader += w;
  }
  return { challenger, leader, winner: challenger > leader ? 'challenger' : 'leader' };
}

// ═══════════════════════════════ DISPATCHES ═══════════════════════════════

/** Plain text only: control characters removed, spaces tidied, at most one blank line in a row. */
export function cleanText(s: unknown, multiline: boolean): string {
  let t = String(s ?? '').replace(/\r\n?/g, '\n');
  // eslint-disable-next-line no-control-regex
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '');
  if (!multiline) return t.replace(/\s+/g, ' ').trim();
  return t.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function validateDispatch(headline: unknown, body: unknown): { headline: string; body: string } | { error: string } {
  const h = cleanText(headline, false);
  const b = cleanText(body, true);
  if (h.length < DISPATCH_HEADLINE_MIN) return { error: `The headline needs at least ${DISPATCH_HEADLINE_MIN} characters.` };
  if (h.length > DISPATCH_HEADLINE_MAX) return { error: `Keep the headline to ${DISPATCH_HEADLINE_MAX} characters.` };
  if (b.length < DISPATCH_BODY_MIN) return { error: `The story needs at least ${DISPATCH_BODY_MIN} characters.` };
  if (b.length > DISPATCH_BODY_MAX) return { error: `Keep the story to ${DISPATCH_BODY_MAX} characters.` };
  return { headline: h, body: b };
}

/** Clout an author earns at the edition for the endorsements their month's dispatches drew. */
export function pressClout(endorsements: number): number {
  return Math.min(DISPATCH_MAX_CLOUT_PER_MONTH, Math.floor(Math.max(0, n(endorsements)) / DISPATCH_ENDORSEMENTS_PER_CLOUT));
}

// ═══════════════════════════════ EDITION HEADLINE ═══════════════════════════════

/** The lead line of an edition, from who is on top and who moved most. */
export function editionHeadline(ranked: RankedEntry[], monthsAtTop: number): string {
  const top = ranked[0];
  if (!top) return 'A quiet month in the capitals';
  const where = top.nationName ? ` of ${top.nationName}` : '';
  if (top.prevRank == null || top.prevRank !== 1) {
    return top.prevRank == null
      ? `${top.name}${where} enters the Index at the top`
      : `${top.name}${where} takes the top of the World Influence Index`;
  }
  const climber = ranked.slice(0, 25).filter(r => (r.move ?? 0) >= 3).sort((a, b) => (b.move ?? 0) - (a.move ?? 0))[0];
  if (climber) return `${climber.name} climbs ${climber.move} places as ${top.name} holds the top`;
  return monthsAtTop > 1
    ? `${top.name}${where} leads the world for a ${ordinal(monthsAtTop)} month`
    : `${top.name}${where} holds the top of the World Influence Index`;
}

export function ordinal(k: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = k % 100;
  return `${k}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
