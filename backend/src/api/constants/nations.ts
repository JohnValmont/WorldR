/**
 * Nations — identity, constitution and political tuning (Phase 2: politics rebuild).
 *
 * Everything a nation IS (name, flag, constitution, regions, districts, cabinet)
 * lives here as data, so a second starter nation is a data entry plus a
 * pol_states row, not new code. Everything that CHANGES (seats, laws, polls,
 * who holds office) lives in the database.
 *
 * All tunable numbers for the new political systems are at the bottom of this
 * file (AGENTS.md: "ALL tunable numbers in constants files").
 */
import type { Axis, Platform } from './politics';
import type { NationalStat } from './macroEconomy';

// ─── Identity & constitution ────────────────────────────────────────────────

export interface FlagSpec {
  /** Drawing recipe understood by the frontend NationFlag component. */
  pattern: 'hoist-triangle-band' | 'tricolor-vertical' | 'tricolor-horizontal' | 'cross';
  colors: string[];
  emblem: 'star8' | 'gear' | 'wheat' | 'anchor' | 'none';
  emblemColor: string;
}

export interface RegionSpec {
  code: string;          // matches the district `region` and states.id suffix
  name: string;
  capital: string;
  character: string;     // one line, shown on the nation page
  economy: string;       // what people there do for a living
}

export interface DistrictSpec {
  name: string;
  region: string;
  registeredVoters: number;
  /** Multipliers on each voter segment's national size (see SEGMENTS in politics.ts). */
  segmentWeights: Record<string, number>;
}

export interface CabinetPostSpec {
  key: string;
  title: string;
  short: string;
  /** Policy categories (POLICY_CATALOG ids) this minister is responsible for. */
  portfolio: string[];
  blurb: string;
}

export interface NationSpec {
  countryId: string;          // countries.id
  polStateCode: string;       // pol_states.code of the national parliament
  officialName: string;
  shortName: string;
  demonym: string;
  government: string;
  capital: string;
  motto: string;
  currency: string;
  flag: FlagSpec;
  headOfState: { title: string; name: string; role: string };
  headOfGovernment: { title: string; role: string };
  legislature: {
    name: string;
    seats: number;
    majority: number;
    termMonths: number;
    electoralSystem: string;
  };
  constitution: string[];     // short plain-English articles
  regions: RegionSpec[];
  districts: DistrictSpec[];
}

// Regional voter mix: multipliers on each segment's national size.
const MIX = {
  ironvale:  { industrial_workers: 1.7, logistics_trade_workers: 0.8, factory_business_owners: 1.1, civic_professionals: 0.6, suburban_families: 0.8 },
  drennport: { industrial_workers: 0.6, logistics_trade_workers: 1.1, factory_business_owners: 1.5, civic_professionals: 1.6, suburban_families: 1.0 },
  westport:  { industrial_workers: 0.8, logistics_trade_workers: 1.9, factory_business_owners: 1.0, civic_professionals: 0.9, suburban_families: 0.9 },
  greenmere: { industrial_workers: 0.7, logistics_trade_workers: 0.8, factory_business_owners: 0.9, civic_professionals: 0.8, suburban_families: 1.9 },
};
const tweak = (base: Record<string, number>, over: Record<string, number>) => ({ ...base, ...over });

export const DRENNIA: NationSpec = {
  countryId: 'drennia',
  polStateCode: 'national',
  officialName: 'Federal Republic of Drennia',
  shortName: 'Drennia',
  demonym: 'Drennian',
  government: 'Federal parliamentary republic',
  capital: 'Drennport',
  motto: 'Forged in Common',
  currency: 'Drennian dollar',
  flag: {
    pattern: 'hoist-triangle-band',
    colors: ['#1E2A4A', '#C9A227', '#9E2B2B'],
    emblem: 'star8',
    emblemColor: '#F4EBD6',
  },
  headOfState: {
    title: 'President',
    name: 'Halvard Ostrin',
    role: 'Ceremonial head of state. Signs laws, opens Parliament and invites the largest party to form a government.',
  },
  headOfGovernment: {
    title: 'Premier',
    role: 'Leader of the party that commands Parliament. Chairs the cabinet and appoints ministers.',
  },
  legislature: {
    name: 'National Parliament',
    seats: 151,
    majority: 76,
    termMonths: 48,
    electoralSystem:
      "Regional proportional representation. The 151 seats are shared between 20 districts by population; inside each district, seats go to parties in proportion to their votes (D'Hondt).",
  },
  constitution: [
    'Parliament has 151 seats. A government needs the support of 76.',
    'Elections are held every 4 years. Parties file candidates 9 months before polling day and campaign for the last 6.',
    'After an election the largest party has 2 months to build a majority, alone or in coalition. Otherwise it governs as a minority.',
    'The Premier names a cabinet of ministers from the governing parties. Ministers steer laws in their portfolio.',
    'Any party with seats may table a bill. Government bills are cheaper to table; bills pass with more yes than no votes.',
    'Laws take effect gradually: tax changes in months, healthcare and education over years.',
  ],
  regions: [
    { code: 'drennport', name: 'Drennport', capital: 'Drennport City', character: 'Capital and main port: finance, government and services.', economy: 'Finance, shipping, public sector' },
    { code: 'ironvale',  name: 'Ironvale',  capital: 'Ironvale',       character: 'Industrial heartland of foundries and car plants.',            economy: 'Heavy industry, car manufacturing' },
    { code: 'westport',  name: 'Westport',  capital: 'Westport',       character: 'Trade coast of docks, rail yards and warehouses.',             economy: 'Logistics, trade, fishing' },
    { code: 'greenmere', name: 'Greenmere', capital: 'Greenmere Town', character: 'Rural lakes and farmland, proud and traditional.',           economy: 'Agriculture, forestry, tourism' },
  ],
  districts: [
    { name: 'Drennport Metro',     region: 'drennport', registeredVoters: 620_000, segmentWeights: tweak(MIX.drennport, { civic_professionals: 1.9 }) },
    { name: 'Drennport Bay',       region: 'drennport', registeredVoters: 480_000, segmentWeights: tweak(MIX.drennport, { logistics_trade_workers: 1.5 }) },
    { name: 'Drennport Heights',   region: 'drennport', registeredVoters: 450_000, segmentWeights: tweak(MIX.drennport, { factory_business_owners: 2.0 }) },
    { name: 'Drennport Riverside', region: 'drennport', registeredVoters: 470_000, segmentWeights: tweak(MIX.drennport, { industrial_workers: 1.0 }) },
    { name: 'Drennport Suburbs',   region: 'drennport', registeredVoters: 430_000, segmentWeights: tweak(MIX.drennport, { suburban_families: 1.7 }) },
    { name: 'Ironvale North',      region: 'ironvale',  registeredVoters: 380_000, segmentWeights: MIX.ironvale },
    { name: 'Ironvale South',      region: 'ironvale',  registeredVoters: 410_000, segmentWeights: tweak(MIX.ironvale, { industrial_workers: 2.0 }) },
    { name: 'Ironvale Central',    region: 'ironvale',  registeredVoters: 450_000, segmentWeights: tweak(MIX.ironvale, { factory_business_owners: 1.5, civic_professionals: 0.9 }) },
    { name: 'Ironvale East',       region: 'ironvale',  registeredVoters: 360_000, segmentWeights: tweak(MIX.ironvale, { logistics_trade_workers: 1.2 }) },
    { name: 'Ironvale West',       region: 'ironvale',  registeredVoters: 360_000, segmentWeights: tweak(MIX.ironvale, { suburban_families: 1.2 }) },
    { name: 'Westport Central',    region: 'westport',  registeredVoters: 380_000, segmentWeights: tweak(MIX.westport, { civic_professionals: 1.2 }) },
    { name: 'Westport Coast',      region: 'westport',  registeredVoters: 330_000, segmentWeights: tweak(MIX.westport, { logistics_trade_workers: 2.2 }) },
    { name: 'Westport Valley',     region: 'westport',  registeredVoters: 290_000, segmentWeights: tweak(MIX.westport, { suburban_families: 1.3 }) },
    { name: 'Westport Highlands',  region: 'westport',  registeredVoters: 260_000, segmentWeights: tweak(MIX.westport, { suburban_families: 1.5, logistics_trade_workers: 1.4 }) },
    { name: 'Westport Plains',     region: 'westport',  registeredVoters: 280_000, segmentWeights: tweak(MIX.westport, { industrial_workers: 1.2 }) },
    { name: 'Greenmere Forest',    region: 'greenmere', registeredVoters: 190_000, segmentWeights: MIX.greenmere },
    { name: 'Greenmere Lakes',     region: 'greenmere', registeredVoters: 210_000, segmentWeights: tweak(MIX.greenmere, { civic_professionals: 1.1 }) },
    { name: 'Greenmere Agri',      region: 'greenmere', registeredVoters: 230_000, segmentWeights: tweak(MIX.greenmere, { factory_business_owners: 1.3 }) },
    { name: 'Greenmere Border',    region: 'greenmere', registeredVoters: 180_000, segmentWeights: tweak(MIX.greenmere, { suburban_families: 2.2 }) },
    { name: 'Greenmere Town',      region: 'greenmere', registeredVoters: 240_000, segmentWeights: tweak(MIX.greenmere, { logistics_trade_workers: 1.1, civic_professionals: 1.0 }) },
  ],
};

/** Nations by pol_states.code of their national parliament. */
export const NATIONS_BY_POL_STATE: Record<string, NationSpec> = {
  [DRENNIA.polStateCode]: DRENNIA,
};

export function getNationForPolState(code: string | null | undefined): NationSpec | null {
  return (code && NATIONS_BY_POL_STATE[code]) || null;
}

// ─── Cabinet ────────────────────────────────────────────────────────────────
// The Premier itself stays in pol_offices; these are the ministers below them.

export const CABINET_POSTS: CabinetPostSpec[] = [
  { key: 'finance',  title: 'Minister of Finance',            short: 'Finance',  portfolio: ['income_tax', 'corp_tax', 'fiscal_rule', 'interest_rate'], blurb: 'Taxes, the budget and the cost of borrowing.' },
  { key: 'industry', title: 'Minister of Industry & Trade',   short: 'Industry', portfolio: ['tariffs', 'min_wage', 'immigration'],                    blurb: 'Tariffs, wages and the workforce: the levers business feels first.' },
  { key: 'welfare',  title: 'Minister of Health & Welfare',   short: 'Welfare',  portfolio: ['welfare', 'healthcare', 'education'],                    blurb: 'The safety net, hospitals and schools.' },
  { key: 'interior', title: 'Minister of the Interior',       short: 'Interior', portfolio: ['policing', 'civil_service', 'media'],                    blurb: 'Police, the civil service and press law.' },
  { key: 'defence',  title: 'Minister of Defence & Foreign Affairs', short: 'Defence', portfolio: ['defense'],                                       blurb: 'The armed forces and Drennia\'s standing abroad.' },
];

export function portfolioPostFor(category: string): CabinetPostSpec | undefined {
  return CABINET_POSTS.find(p => p.portfolio.includes(category));
}

// Names for computer-run ministers (picked deterministically, never random per request).
export const NPC_FIRST_NAMES = ['Ada', 'Bram', 'Celia', 'Dorian', 'Elsa', 'Fenn', 'Greta', 'Hollis', 'Ines', 'Jasper', 'Kira', 'Lucan', 'Mirela', 'Niko', 'Orla', 'Piet', 'Rhea', 'Soren', 'Talia', 'Viktor'];
export const NPC_SURNAMES   = ['Ashdown', 'Brandt', 'Corvel', 'Dunmore', 'Eskell', 'Farrow', 'Galt', 'Halloran', 'Ivers', 'Jessop', 'Kestrel', 'Lowe', 'Marrick', 'Norwood', 'Ostler', 'Pell', 'Quaid', 'Rourke', 'Stroud', 'Thorne'];

export function npcName(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const u = h >>> 0;
  return `${NPC_FIRST_NAMES[u % NPC_FIRST_NAMES.length]} ${NPC_SURNAMES[(u >>> 8) % NPC_SURNAMES.length]}`;
}

// ─── Government approval ───────────────────────────────────────────────────
// Approval (0-100) = 50 + sum(weight x (stat - 50)), clamped. National stats are
// 0-100 with 50 neutral. cost_of_living is "higher = worse", hence negative.
export const APPROVAL_WEIGHTS: Partial<Record<NationalStat, number>> = {
  prosperity: 0.30,
  cost_of_living: -0.20,
  order_safety: 0.15,
  fiscal_health: 0.10,
  equity: 0.10,
  human_development: 0.10,
  freedom_rights: 0.05,
};
export const APPROVAL_MIN = 5;
export const APPROVAL_MAX = 95;
/**
 * How much approval moves the governing parties' vote at an election:
 * vote multiplier = 1 + SWING x (approval - 50) / 50, so 95% approval = +22.5%,
 * 5% approval = -22.5%. This is the economy -> politics link.
 */
export const APPROVAL_ELECTION_SWING = 0.25;

// ─── Computer-run lawmaking (NPC parties) ──────────────────────────────────
// Chance per month that a computer-run party tables a bill (if it has a change
// it wants badly enough and no bill of its own is still open).
export const NPC_BILL_CHANCE_LEAD = 0.45;      // party leading the government
export const NPC_BILL_CHANCE_PARTNER = 0.15;   // coalition partner
export const NPC_BILL_CHANCE_OPPOSITION = 0.10;
/** A party only tables a change it rates at least this much better than the current law. */
export const NPC_BILL_MIN_GAIN = 0.20;
/** Government members back government bills unless they dislike them by more than this. */
export const NPC_GOV_WHIP = 0.35;
/** Opposition parties are this much less keen on anything the government tables. */
export const NPC_OPPOSITION_BIAS = 0.15;
/** Bills tabled by a party outside government start with this handicap among government parties. */
export const NPC_GOV_RESIST_PRIVATE_BILL = 0.10;
/** Computer-run parties don't re-table a bill on the same law within this many months of a FAILED vote... */
export const NPC_BILL_COOLDOWN_MONTHS = 6;
/** ...or within this many months of a law PASSING (it needs time to work; stops flip-flopping). */
export const NPC_PASSED_LAW_COOLDOWN_MONTHS = 24;
/**
 * Governing parties only table bills they expect to pass. Opposition parties
 * also table bills they expect to lose this share of the time, to make a point.
 */
export const NPC_OPPOSITION_SIGNAL_SHARE = 0.3;
/** Weight of a law's measured effects (vs its ideological tags) in a party's opinion of it. */
export const NPC_EFFECT_WEIGHT = 0.5;

/** Ideology tags in POLICY_CATALOG -> which platform axis they pull, and which way. */
export const TAG_AXIS: Record<string, { axis: Axis; dir: 1 | -1 }> = {
  'LOW TAXES': { axis: 'taxation', dir: 1 },
  'TAX THE WEALTHY': { axis: 'taxation', dir: -1 },
  'WORKER-FIRST': { axis: 'labour', dir: 1 },
  'EMPLOYER-LED': { axis: 'labour', dir: -1 },
  'PRIVATE-LEAN': { axis: 'investment', dir: -1 },
  'STATE-BUILT': { axis: 'investment', dir: 1 },
  'OPEN MARKETS': { axis: 'trade', dir: 1 },
  'PROTECT INDUSTRY': { axis: 'trade', dir: -1 },
  'LAW & ORDER': { axis: 'stability', dir: 1 },
  'BOLD REFORM': { axis: 'stability', dir: -1 },
};

/**
 * How much a party with a given platform cares about each national stat
 * (positive = wants it higher). Shared by NPC voting and the UI's "who likes
 * this law" hints. Platform axes are 0-100, 50 = centre.
 */
export function statPreferences(p: Platform): Partial<Record<NationalStat, number>> {
  const c = (axis: Axis) => ((p[axis] ?? 50) - 50) / 50; // -1..+1
  return {
    prosperity: 0.5 + 0.3 * c('taxation'),
    equity: 0.2 + 0.4 * c('labour') - 0.3 * c('taxation'),
    fiscal_health: 0.2 + 0.3 * c('stability'),
    order_safety: 0.2 + 0.5 * c('stability'),
    freedom_rights: 0.1 - 0.4 * c('stability'),
    global_standing: 0.1 + 0.4 * c('trade'),
    human_development: 0.3 + 0.3 * c('investment'),
    cost_of_living: -0.5,
    bureaucracy: 0.1,
  };
}

// ─── Ministers ─────────────────────────────────────────────────────────────
/** Monthly salary paid to human ministers (Premier gets PREMIER_SALARY). */
export const MINISTER_SALARY = 6_000;
export const PREMIER_SALARY = 10_000;
/** AP discount when a minister tables a bill in their own portfolio. */
export const MINISTER_PORTFOLIO_AP_DISCOUNT = 1;
/** Extra support from government parties for a bill tabled by its own minister. */
export const MINISTER_BACKING_BONUS = 0.10;
/** AP cost to table a bill from outside government (a "private member's bill"). */
export const PRIVATE_BILL_AP_EXTRA = 2;

// ─── Laws in force before any bill has passed ──────────────────────────────
// (POLICY_CATALOG option ids). Shown on the Laws page and used by NPC parties
// to judge whether a change is worth tabling.
export const DEFAULT_LAWS: Record<string, string> = {
  income_tax: 'flat_med',
  corp_tax: 'med',
  tariffs: 'moderate',
  min_wage: 'low',
  welfare: 'standard',
  healthcare: 'hybrid',
  education: 'med',
  interest_rate: 'neutral',
  immigration: 'skilled',
  defense: 'moderate',
  policing: 'standard',
  civil_service: 'neglect',
  media: 'free',
  fiscal_rule: 'deficit_limit',
};

// ─── Polls ─────────────────────────────────────────────────────────────────
/**
 * Campaign effort every computer-run candidate gets for free in each voter
 * segment (their party machine). Mirrors the +15 in buildEngineCandidates so
 * polls predict what the election engine will actually do.
 */
export const NPC_MACHINE_EFFORT = 15;
/** How many monthly poll snapshots the Capitol page returns for the trend chart. */
export const POLL_HISTORY_MONTHS = 24;
