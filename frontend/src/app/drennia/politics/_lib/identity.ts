// ─────────────────────────────────────────────────────────
// Political Desk — Identity & Flavor layer
// ─────────────────────────────────────────────────────────
// Frontend-only flavor that makes Ironvale politics feel like a real, peopled
// institution: party crests/colors, named leaders, mottos, and voter-segment
// personas. Keyed off the STABLE party name (seeded NPC parties) with a
// deterministic fallback for player-founded / unknown parties so nothing ever
// renders blank. No backend dependency — safe to ship on its own.
//
// Party identities can later be promoted to backend data (pol_party_identity);
// consumers should treat this as the display source of truth for now.

import type { Axis } from '@/lib/politicsConstants';

export interface PartyIdentity {
  /** Institutional accent color (muted, Hansard-style). */
  color: string;
  /** 2-letter crest monogram. */
  monogram: string;
  /** Named leader (grounds the party in a person). */
  leader: string;
  /** One-line motto in the party's voice. */
  motto: string;
  /** Short institutional descriptor. */
  blurb: string;
}

// Canonical seeded NPC parties (see backend/database/seeds/002_politics_v0.sql).
const KNOWN_PARTIES: Record<string, PartyIdentity> = {
  'Ironvale Labour Front': {
    color: '#A33A3A',
    monogram: 'LF',
    leader: 'Councillor Sera Dunne',
    motto: 'The floor of the factory is the floor of the Council.',
    blurb: 'Worker bloc — labour protection, industrial investment, low tax.',
  },
  'Industrial Progress Party': {
    color: '#B0863E',
    monogram: 'IP',
    leader: 'Marcus Vell',
    motto: 'Let Ironvale build — and get out of its way.',
    blurb: 'Owners & exporters — pro-business, open trade, light regulation.',
  },
  'Civic Stability Union': {
    color: '#4A6178',
    monogram: 'CS',
    leader: 'Adele Renner',
    motto: 'Order first. Prosperity follows.',
    blurb: 'Professionals & families — institutional order and steady growth.',
  },
};

// Deterministic fallback palette for player / unseeded parties.
const FALLBACK_COLORS = [
  '#6C7A89', '#7A5C86', '#4F7A6A', '#8A6A4F', '#5A6E8C', '#856060',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Resolve a display identity for any party name (known or player-founded). */
export function partyIdentity(name: string | undefined | null): PartyIdentity {
  const key = (name || '').trim();
  if (key && KNOWN_PARTIES[key]) return KNOWN_PARTIES[key];
  const color = FALLBACK_COLORS[hashString(key) % FALLBACK_COLORS.length];
  return {
    color,
    monogram: initialsFrom(key || 'Independent'),
    leader: 'Party Leader',
    motto: 'A new voice in the Ironvale Council.',
    blurb: 'Player-founded party.',
  };
}

/** Stable seat-map / chart color for a party name. */
export function partyColor(name: string | undefined | null): string {
  return partyIdentity(name).color;
}

// ── Voter-segment personas ───────────────────────────────────────
// Turns the 5 engine segments into people, not table rows.

export interface SegmentPersona {
  /** Lucide icon name (resolved by the component). */
  icon: 'Factory' | 'Truck' | 'Building2' | 'Landmark' | 'Home';
  /** Human, place-grounded nickname for the bloc. */
  nickname: string;
  /** Which way they lean, in plain English. */
  lean: string;
  /** Accent color for the persona card. */
  color: string;
}

export const SEGMENT_PERSONAS: Record<string, SegmentPersona> = {
  industrial_workers: {
    icon: 'Factory',
    nickname: 'The Shop Floor',
    lean: 'Pro-labour · demands investment',
    color: '#A33A3A',
  },
  logistics_trade_workers: {
    icon: 'Truck',
    nickname: 'The Docks & Roads',
    lean: 'Trade-first · export-friendly',
    color: '#4F7A6A',
  },
  factory_business_owners: {
    icon: 'Building2',
    nickname: 'The Boardroom',
    lean: 'Low-tax · pro-business',
    color: '#B0863E',
  },
  civic_professionals: {
    icon: 'Landmark',
    nickname: 'The Civic Class',
    lean: 'Stability · steady institutions',
    color: '#4A6178',
  },
  suburban_families: {
    icon: 'Home',
    nickname: 'The Suburbs',
    lean: 'Stability · household security',
    color: '#7A5C86',
  },
};

// ── Election-cycle phases ──────────────────────────────────────

export interface PhaseMeta {
  key: string;
  label: string;
  short: string;
  description: string;
}

export const PHASE_ORDER: PhaseMeta[] = [
  { key: 'filing', label: 'Filing', short: 'File', description: 'Parties form and candidates declare.' },
  { key: 'campaign', label: 'Campaign', short: 'Camp.', description: 'Candidates build reach across the blocs.' },
  { key: 'polling', label: 'Polling', short: 'Poll', description: 'Ballots are cast and counted.' },
  { key: 'formation', label: 'Formation', short: 'Form', description: 'A governing bloc is brokered.' },
  { key: 'governing', label: 'Governing', short: 'Govern', description: 'The Council sits and passes measures.' },
];

export function phaseIndex(phase: string | undefined): number {
  return PHASE_ORDER.findIndex((p) => p.key === phase);
}

// ── Platform axis descriptors (for readable platform summaries) ───────────

export const AXIS_LABELS: Record<Axis, { label: string; low: string; high: string }> = {
  taxation: { label: 'Taxation', low: 'High-tax / redistributive', high: 'Low-tax / pro-business' },
  labour: { label: 'Labour', low: 'Austerity', high: 'Strong worker protection' },
  investment: { label: 'Investment', low: 'Minimal spend', high: 'Aggressive public works' },
  trade: { label: 'Trade', low: 'Protectionist', high: 'Open / export-friendly' },
  stability: { label: 'Stability', low: 'Reformist', high: 'Institutional order' },
};

/** A short, human summary of where a platform sits on an axis. */
export function describeAxis(axis: Axis, value: number): string {
  const meta = AXIS_LABELS[axis];
  if (value >= 66) return meta.high;
  if (value <= 33) return meta.low;
  return `Balanced ${meta.label.toLowerCase()}`;
}
