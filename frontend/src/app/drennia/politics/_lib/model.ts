// —
// WORLDr — Political Desk Model (display / config source of truth)
// —
// Encodes locked GDD v0.5 decisions as a DISPLAY + CONFIG layer on top of the
// already-wired engine constants. Maps new plain names onto EXISTING backend IDs
// so nothing breaks. Engine math stays authoritative in backend/.../politics.ts.
// —
import type { Axis } from '@/lib/politicsConstants';

// — Creeds (plain ideology names -> existing doctrine IDs) —
export type CreedId =
  | 'forge_accord' | 'the_ledger' | 'the_homestead'
  | 'the_commons'  | 'the_vanguard' | 'the_compact';

export interface Creed {
  id: CreedId;
  name: string;
  tagline: string;
  blurb: string;
  keystone: Axis | null;
}

export const CREEDS: Record<CreedId, Creed> = {
  forge_accord:  { id: 'forge_accord',  name: 'Populist',     tagline: 'Workers first',        blurb: 'Industry built by the state, jobs protected, borders guarded. Puts working people ahead of markets.', keystone: 'trade' },
  the_ledger:    { id: 'the_ledger',    name: 'Liberal',      tagline: 'Free markets',         blurb: 'Low taxes, a small state, and open trade. Trusts markets to create prosperity.', keystone: 'taxation' },
  the_homestead: { id: 'the_homestead', name: 'Conservative', tagline: 'Order & tradition',     blurb: 'Balanced books, protected industry, and law and order. Values stability over sudden change.', keystone: 'stability' },
  the_commons:   { id: 'the_commons',   name: 'Socialist',    tagline: 'Redistribute & reform', blurb: 'Redistribution, public investment, and bold reform. Rebuilds the economy around working people.', keystone: 'taxation' },
  the_vanguard:  { id: 'the_vanguard',  name: 'Progressive',  tagline: 'Reform & openness',     blurb: 'Open trade, pragmatic investment, and bold institutional change. Modernises the state.', keystone: 'stability' },
  the_compact:   { id: 'the_compact',   name: 'Centrist',     tagline: 'The balanced path',     blurb: 'Balanced on every issue. Defined by its record in government, not by rhetoric.', keystone: null },
};

export const CREED_ORDER: CreedId[] = [
  'forge_accord', 'the_ledger', 'the_homestead',
  'the_commons', 'the_vanguard', 'the_compact',
];

export const CREED_NAME_BY_ID: Record<CreedId, string> =
  Object.fromEntries(CREED_ORDER.map((id) => [id, CREEDS[id].name])) as Record<CreedId, string>;

// — Pillars (policy axes) -> plain names + rung ladders —
export interface PillarRung { value: number; label: string; }
export interface Pillar { axis: Axis; name: string; low: string; high: string; rungs: PillarRung[]; }

export const PILLARS: Pillar[] = [
  { axis: 'taxation',   name: 'Tax & Spending',   low: 'High Tax',     high: 'Low Tax',    rungs: [{ value: 20, label: 'Tax the Wealthy' }, { value: 50, label: 'Balanced Budget' }, { value: 80, label: 'Low Taxes' }] },
  { axis: 'labour',     name: 'Workers & Jobs',   low: 'Employer-Led', high: 'Worker-First', rungs: [{ value: 20, label: 'Employer-Led' }, { value: 50, label: 'Balanced' }, { value: 80, label: 'Worker-First' }] },
  { axis: 'investment', name: 'State Investment', low: 'Private / Lean', high: 'State-Built', rungs: [{ value: 20, label: 'Private / Lean' }, { value: 50, label: 'Mixed Economy' }, { value: 80, label: 'State-Built Industry' }] },
  { axis: 'trade',      name: 'Trade',            low: 'Protected',    high: 'Open',       rungs: [{ value: 20, label: 'Protect Industry' }, { value: 50, label: 'Managed Trade' }, { value: 80, label: 'Open Markets' }] },
  { axis: 'stability',  name: 'Order & Reform',   low: 'Bold Reform',  high: 'Law & Order', rungs: [{ value: 20, label: 'Bold Reform' }, { value: 50, label: 'Steady Progress' }, { value: 80, label: 'Law & Order' }] },
];

export const PILLAR_BY_AXIS: Record<Axis, Pillar> =
  Object.fromEntries(PILLARS.map((p) => [p.axis, p])) as Record<Axis, Pillar>;

// — Voter Blocs (plain names -> existing segment keys) —
export interface BlocLabel { key: string; name: string; who: string; }

export const BLOCS: BlocLabel[] = [
  { key: 'industrial_workers',      name: 'Workers',       who: 'Factory and industrial labour' },
  { key: 'logistics_trade_workers', name: 'Merchants',     who: 'Trade, shipping and logistics' },
  { key: 'factory_business_owners', name: 'Business',      who: 'Owners and industry capital' },
  { key: 'civic_professionals',     name: 'Professionals', who: 'Educated white-collar and reformers' },
  { key: 'suburban_families',       name: 'Middle Class',  who: 'Homeowners and salaried families' },
];

export const BLOC_NAME_BY_KEY: Record<string, string> =
  Object.fromEntries(BLOCS.map((b) => [b.key, b.name]));
export const BLOC_WHO_BY_KEY: Record<string, string> =
  Object.fromEntries(BLOCS.map((b) => [b.key, b.who]));

// — Jurisdictions (federal model, GDD D6) —
// Drennia = federal parliamentary system (Australia-inspired). State Assemblies and
// the National Parliament are SEPARATE elections on SEPARATE clocks. seats/termMonths
// are the TARGET model; live engine currently runs Ironvale at 61 seats / 48mo.
// Backend per-jurisdiction wiring is a Phase-2 migration (GDD roadmap).
export type JurisdictionTier = 'state' | 'national';
export interface JurisdictionModel {
  id: string; name: string; tier: JurisdictionTier; character: string;
  seats: number; majority: number; termMonths: number; electionOffsetMonths: number;
}

export const JURISDICTION_MODEL: Record<string, JurisdictionModel> = {
  ironvale:  { id: 'ironvale',  name: 'Ironvale',            tier: 'state',    character: 'Industrial heartland',           seats: 61, majority: 31,  termMonths: 48, electionOffsetMonths: 0  },
  drennport: { id: 'drennport', name: 'Drennport',           tier: 'state',    character: 'Capital & main port',            seats: 120, majority: 61,  termMonths: 24, electionOffsetMonths: 6  },
  westport:  { id: 'westport',  name: 'Westport',            tier: 'state',    character: 'Trade port',                     seats: 72,  majority: 37,  termMonths: 24, electionOffsetMonths: 12 },
  greenmere: { id: 'greenmere', name: 'Greenmere',           tier: 'state',    character: 'Rural & agricultural',           seats: 50,  majority: 26,  termMonths: 24, electionOffsetMonths: 18 },
  national:  { id: 'national',  name: 'National Parliament', tier: 'national', character: 'Federal Parliament of Drennia',  seats: 250, majority: 126, termMonths: 48, electionOffsetMonths: 0  },
};

// — AP model (GDD D3): 12/month, no cap, weighted costs —
export const AP_MODEL = {
  GRANT_PER_MONTH: 12,
  CAP: null as number | null,
  COSTS: {
    vote: 0, campaign: 2, scout: 2, whip: 2, propose_law: 3, court_bloc: 3,
    expedite_bill: 4, recruit: 4, executive_order: 5, signature: 6,
  },
} as const;

/** 1 in-game month = 8 real hours (GDD $3). */
export const REAL_HOURS_PER_MONTH = 8;
