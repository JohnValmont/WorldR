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
  /** One or two sentences on the people and their politics. */
  culture?: string;
  /** Plain-English list of what is different about playing here (shown to players). */
  traits?: string[];
  /** Rules that differ from the default (see NationRules). */
  rules?: Partial<NationRules>;
  /** Laws already in force when the nation is founded (POLICY_CATALOG ids), where they differ from DEFAULT_LAWS. */
  foundingLaws?: Record<string, string>;
  /** The nation's underlying condition before its laws act on it (0-100, 50 = average). */
  baseStats?: Partial<Record<NationalStat, number>>;
}

/**
 * The handful of rules a nation's constitution and culture can change.
 * Everything else about politics is the same everywhere.
 */
export interface NationRules {
  /** A bill passes when yes beats no by at least this many votes (1 = a bare majority of those voting). */
  passMargin: number;
  /** How far apart two parties' platforms can be and still govern together (0-1). */
  coalitionMaxDistance: number;
  /** Multiplier on what a fundraiser brings in. */
  fundraiseMult: number;
  /** Multiplier on how much a donation counts when asking another party for its votes. */
  donationMult: number;
  /** How many months a decree's effect lasts. */
  decreeMonths: number;
}
export const DEFAULT_NATION_RULES: NationRules = {
  passMargin: 1,
  coalitionMaxDistance: 0.50,   // same as POL_COALITION_MAX_DISTANCE
  fundraiseMult: 1,
  donationMult: 1,
  decreeMonths: 8,              // same as SHOCK_MONTHS
};

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
  culture: 'Factory towns and a busy capital. Drennians argue about everything, trust their unions and their engineers, and expect governments to be built by compromise.',
  traits: [
    'A republic with a proportional Parliament of 151 seats: coalitions are the rule.',
    'Elections every 4 years.',
    'Balanced: no great strength and no great weakness.',
  ],
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

// ─── Starter nations two and three ─────────────────────────────────────────
// The three nations are DIFFERENT, as real neighbours are: different forms of
// government, parliaments, election calendars, laws, wealth and temper. They
// are also BALANCED: each is ahead somewhere and behind somewhere else, and
// their overall power and starting government approval are close
// (tests/floor.test.ts enforces both). Nobody starts with the better country.
const DISTRICT_SIZES = DRENNIA.districts.map(d => d.registeredVoters);

function constitutionFor(o: { seats: number; majority: number; termYears: number; head: string; extra: string[] }): string[] {
  return [
    `Parliament has ${o.seats} seats. A government needs the support of ${o.majority}.`,
    `Elections are held every ${o.termYears} years. Parties file candidates 9 months before polling day and campaign for the last 6.`,
    'After an election the largest party has 2 months to build a majority, alone or in coalition. Otherwise it governs as a minority.',
    `The ${o.head} names a cabinet of ministers from the governing parties. Ministers steer laws in their portfolio.`,
    ...o.extra,
    'Laws take effect gradually: tax changes in months, healthcare and education over years.',
  ];
}

/** Twenty districts, five per region. `scale` sets the nation's size relative to Drennia. */
function districtsFor(scale: number, regions: { code: string; names: string[]; mix: Record<string, number>; tweaks: Record<string, number>[] }[]): DistrictSpec[] {
  const out: DistrictSpec[] = [];
  regions.forEach((r, ri) => r.names.forEach((name, di) => {
    const voters = Math.round(DISTRICT_SIZES[ri * 5 + di] * scale / 1000) * 1000;
    out.push({ name, region: r.code, registeredVoters: voters, segmentWeights: tweak(r.mix, r.tweaks[di] ?? {}) });
  }));
  return out;
}

// Westmark: a rich trading republic run by merchants. Smaller, wealthier and
// better connected than its neighbours; more unequal, costlier to live in and
// barely armed. Money buys more here, and governments are broad and short-lived.
export const WESTMARK: NationSpec = {
  countryId: 'westmark',
  polStateCode: 'westmark',
  officialName: 'Free Ports of Westmark',
  shortName: 'Westmark',
  demonym: 'Westmarker',
  government: 'Merchant republic',
  capital: 'Saltgate',
  motto: 'By Tide and Trade',
  culture: 'Merchant houses, guilds and sailors. A deal is sealed with a handshake, everything has a price, and nobody trusts a politician who has never met a payroll.',
  traits: [
    'A merchant republic with a small Assembly of 101 seats and elections every 3 years.',
    'Money talks: fundraisers bring in half as much again, and a donation counts for more when you ask for votes.',
    'Parties ally easily, so governments are broad.',
    'Rich and well connected abroad. Unequal, expensive to live in, and lightly armed.',
  ],
  currency: 'Drennian dollar',
  flag: { pattern: 'tricolor-horizontal', colors: ['#14364F', '#F2EFE6', '#1F8A8A'], emblem: 'anchor', emblemColor: '#14364F' },
  headOfState: { title: 'Lord Warden', name: 'Corin Halewood', role: 'Chosen for life by the guilds. Ceremonial: opens the Assembly and invites the largest party to form a government.' },
  headOfGovernment: { title: 'Chancellor', role: 'Leader of the party that commands the Assembly. Chairs the cabinet and appoints ministers.' },
  legislature: {
    name: 'Assembly of the Ports', seats: 101, majority: 51, termMonths: 36,
    electoralSystem: "Proportional representation in 20 small districts (D'Hondt). With fewer seats in each, larger parties do a little better than their vote.",
  },
  constitution: constitutionFor({ seats: 101, majority: 51, termYears: 3, head: 'Chancellor', extra: [
    'Any party with seats may table a bill. Bills pass with more yes than no votes.',
    'Parties may accept donations without limit, and say so openly.',
  ] }),
  rules: { coalitionMaxDistance: 0.60, fundraiseMult: 1.5, donationMult: 1.5 },
  foundingLaws: { tariffs: 'free_trade', welfare: 'minimal', media: 'deregulated', defense: 'minimal', immigration: 'open' },
  baseStats: { prosperity: 54, cost_of_living: 57, fiscal_health: 48, equity: 45, human_development: 50, order_safety: 47, freedom_rights: 56, bureaucracy: 51, global_standing: 58 },
  regions: [
    { code: 'saltgate',  name: 'Saltgate',  capital: 'Saltgate',     character: 'Capital and great harbour: shipping houses, banks and customs.', economy: 'Shipping, finance, customs' },
    { code: 'tidewater', name: 'Tidewater', capital: 'Port Brannow', character: 'A coast of docks, shipyards and canneries.',                    economy: 'Shipbuilding, fishing, freight' },
    { code: 'marches',   name: 'The Marches', capital: 'Harrowick',  character: 'Mill towns along the rivers running down to the sea.',          economy: 'Textiles, light industry' },
    { code: 'downs',     name: 'The Downs', capital: 'Wetherby',     character: 'Rolling sheep country and market towns.',                       economy: 'Wool, farming, small trades' },
  ],
  districts: districtsFor(0.7, [
    { code: 'saltgate', names: ['Saltgate Quays', 'Saltgate Exchange', 'Saltgate Hill', 'Saltgate East', 'Saltgate Shore'], mix: MIX.westport,
      tweaks: [{ logistics_trade_workers: 2.2 }, { factory_business_owners: 1.8, civic_professionals: 1.5 }, { civic_professionals: 1.8 }, { industrial_workers: 1.3 }, { suburban_families: 1.5 }] },
    { code: 'tidewater', names: ['Port Brannow', 'Tidewater Yards', 'Tidewater North', 'Cannery Row', 'Tidewater Sands'], mix: MIX.westport,
      tweaks: [{ logistics_trade_workers: 2.0 }, { industrial_workers: 1.6 }, {}, { industrial_workers: 1.4 }, { suburban_families: 1.4 }] },
    { code: 'marches', names: ['Harrowick', 'Marches Mills', 'Marches Vale', 'Lower Marches', 'Upper Marches'], mix: MIX.ironvale,
      tweaks: [{ civic_professionals: 1.0 }, { industrial_workers: 2.0 }, { suburban_families: 1.2 }, { logistics_trade_workers: 1.2 }, {}] },
    { code: 'downs', names: ['Wetherby', 'Downs East', 'Downs West', 'Sheepwash', 'Downs Coast'], mix: MIX.greenmere,
      tweaks: [{ civic_professionals: 1.1 }, {}, { factory_business_owners: 1.3 }, { suburban_families: 2.2 }, { logistics_trade_workers: 1.3 }] },
  ]),
};

// Eryndor: an old kingdom of farms and mines. Bigger, poorer and more inward
// than its neighbours; orderly, fairer and well armed. The Crown slows
// Parliament down, so the executive matters more and change comes hard.
export const ERYNDOR: NationSpec = {
  countryId: 'eryndor',
  polStateCode: 'eryndor',
  officialName: 'Kingdom of Eryndor',
  shortName: 'Eryndor',
  demonym: 'Eryndoran',
  government: 'Constitutional monarchy',
  capital: 'Highmoor',
  motto: 'From the Hills, Plenty',
  culture: 'Farmers, miners and old families under an ancient crown. Eryndorans are slow to change their minds, quick to close ranks, and proud that nobody has ever told them what to do.',
  traits: [
    'A kingdom: the King sends back any bill that passes by fewer than 5 votes.',
    'A Diet of 131 seats, elected only every 5 years.',
    'Parties rarely ally, so minority governments are common and every vote must be fought for.',
    'The Crown lends its weight to the government: decrees last 12 months instead of 8.',
    'Orderly, fair and well armed. Poorer, inward-looking and less free.',
  ],
  currency: 'Drennian dollar',
  flag: { pattern: 'cross', colors: ['#2E5E3A', '#E9C46A'], emblem: 'wheat', emblemColor: '#E9C46A' },
  headOfState: { title: 'King', name: 'Aldric IV', role: 'Reigns but does not rule. Signs laws, and by old custom sends back any bill passed by fewer than five votes.' },
  headOfGovernment: { title: 'Prime Minister', role: 'Leader of the party that commands the Diet. Governs in the King\'s name, chairs the cabinet and appoints ministers.' },
  legislature: {
    name: 'Diet of Eryndor', seats: 131, majority: 66, termMonths: 60,
    electoralSystem: "Proportional representation in 20 districts (D'Hondt). A bill needs a margin of five votes to receive the King's assent.",
  },
  constitution: constitutionFor({ seats: 131, majority: 66, termYears: 5, head: 'Prime Minister', extra: [
    'Any party with seats may table a bill. A bill needs five more yes votes than no votes, or the King returns it unsigned.',
    'Orders made in the King\'s name stand for a full year.',
  ] }),
  rules: { passMargin: 5, coalitionMaxDistance: 0.42, donationMult: 0.75, decreeMonths: 12 },
  foundingLaws: { tariffs: 'high', policing: 'tough', defense: 'high', immigration: 'closed', media: 'licensed', min_wage: 'med' },
  baseStats: { prosperity: 46, cost_of_living: 44, fiscal_health: 57, equity: 53, human_development: 48, order_safety: 53, freedom_rights: 44, bureaucracy: 48, global_standing: 42 },
  regions: [
    { code: 'highmoor',  name: 'Highmoor',  capital: 'Highmoor',    character: 'The royal capital on the plateau: court, colleges and the Diet.', economy: 'Government, education, services' },
    { code: 'coalreach', name: 'Coalreach', capital: 'Blackfold',   character: 'Pit villages and smelters in the northern hills.',          economy: 'Mining, steel, heavy industry' },
    { code: 'goldmere',  name: 'Goldmere',  capital: 'Fenwick Cross', character: 'The grain plain: big farms and bigger landowners.',      economy: 'Grain, cattle, milling' },
    { code: 'southfold', name: 'Southfold', capital: 'Oakhaven',    character: 'Orchards, river ports and the road to the sea.',            economy: 'Fruit, river trade, timber' },
  ],
  districts: districtsFor(1.25, [
    { code: 'highmoor', names: ['Highmoor Old Town', 'Highmoor Colleges', 'Highmoor Gate', 'Highmoor Fields', 'Highmoor Commons'], mix: MIX.drennport,
      tweaks: [{ civic_professionals: 1.9 }, { civic_professionals: 2.1 }, { factory_business_owners: 1.8 }, { suburban_families: 1.6 }, { industrial_workers: 1.1 }] },
    { code: 'coalreach', names: ['Blackfold', 'Coalreach Pits', 'Coalreach Works', 'Coalreach Dale', 'Coalreach Edge'], mix: MIX.ironvale,
      tweaks: [{}, { industrial_workers: 2.1 }, { industrial_workers: 1.9, factory_business_owners: 1.3 }, { suburban_families: 1.2 }, { logistics_trade_workers: 1.1 }] },
    { code: 'goldmere', names: ['Fenwick Cross', 'Goldmere Plain', 'Goldmere Mills', 'Goldmere Marsh', 'Goldmere Wolds'], mix: MIX.greenmere,
      tweaks: [{ civic_professionals: 1.1 }, { factory_business_owners: 1.5 }, { industrial_workers: 1.2 }, {}, { suburban_families: 2.1 }] },
    { code: 'southfold', names: ['Oakhaven', 'Southfold Orchards', 'Southfold River', 'Southfold Weald', 'Southfold Ford'], mix: MIX.greenmere,
      tweaks: [{ logistics_trade_workers: 1.5 }, {}, { logistics_trade_workers: 1.7 }, { suburban_families: 2.0 }, { factory_business_owners: 1.2 }] },
  ]),
};

/** Every playable starter nation, in the order they are listed to players. */
export const STARTER_NATIONS: NationSpec[] = [DRENNIA, WESTMARK, ERYNDOR];

/** Nations by pol_states.code of their national parliament. */
export const NATIONS_BY_POL_STATE: Record<string, NationSpec> = Object.fromEntries(STARTER_NATIONS.map(n => [n.polStateCode, n]));
export const NATIONS_BY_COUNTRY: Record<string, NationSpec> = Object.fromEntries(STARTER_NATIONS.map(n => [n.countryId, n]));

// ─── Business: each nation has its own car market ───────────────────────────
// A company always opens in its owner's nation (createCompany) and sells in that
// nation's region markets. Markets, states and rival car makers for Westmark and
// Eryndor are copied from Drennia's by database/seeds/0006_nation_car_markets.sql,
// so all three markets start equal. A new nation needs an entry here AND rows
// in that seed (tests/nationMarkets.test.ts checks every state id below exists there).
/** Headquarters choice per region: region code -> states.id. */
export const NATION_HQ_STATES: Record<string, Record<string, string>> = {
  drennia:  { drennport: 'drennia-drennport', ironvale: 'drennia-ironvale', westport: 'drennia-westport', greenmere: 'drennia-greenmere' },
  westmark: { saltgate: 'westmark-saltgate', tidewater: 'westmark-tidewater', marches: 'westmark-marches', downs: 'westmark-downs' },
  eryndor:  { highmoor: 'eryndor-highmoor', coalreach: 'eryndor-coalreach', goldmere: 'eryndor-goldmere', southfold: 'eryndor-southfold' },
};

export interface HqOption { id: string; city: string; tagline: string; desc: string }

/** The state of a nation's capital region (its first region), where computer-run companies sit. */
export function nationCapitalState(countryId: string | null | undefined): string {
  const spec = NATIONS_BY_COUNTRY[countryId ?? ''];
  const states = NATION_HQ_STATES[countryId ?? ''];
  return (spec && states && states[spec.regions[0]?.code]) || NATION_HQ_STATES.drennia.drennport;
}

/** The headquarters a player of this nation can choose, described from the nation's own regions. */
export function hqOptionsFor(countryId: string | null | undefined): HqOption[] {
  const spec = NATIONS_BY_COUNTRY[countryId ?? ''];
  const states = NATION_HQ_STATES[countryId ?? ''];
  if (!spec || !states) return [];
  return spec.regions
    .filter(r => states[r.code])
    .map(r => ({ id: states[r.code], city: r.name, tagline: r.economy, desc: r.character }));
}

/** The rules in force in a nation's parliament (defaults where its constitution says nothing). */
export function nationRules(polStateCode: string | null | undefined): NationRules {
  return { ...DEFAULT_NATION_RULES, ...(NATIONS_BY_POL_STATE[polStateCode ?? '']?.rules ?? {}) };
}
/** What the head of government is called there ("Premier" unless the nation says otherwise). */
export function headOfGovernmentTitle(polStateCode: string | null | undefined): string {
  return NATIONS_BY_POL_STATE[polStateCode ?? '']?.headOfGovernment.title ?? 'Premier';
}

// ─── Nation size (owner decision, 2026-11-18: 8, was 6) ───────────────────
/** Human players per nation. Small on purpose: you know every rival by name. */
export const NATION_PLAYER_CAP = 8;
/** A player not seen for this many days stops counting toward the cap (their character stays). */
export const NATION_ACTIVE_DAYS = 14;
/**
 * If every nation is full, a new player still gets in, to the least crowded
 * nation. Turning this off means "the world is full" and sign-ups are refused.
 * Owner decision (2026-11-25, closed alpha): off, so the alpha is capped at
 * NATION_PLAYER_CAP x 3 nations = 24 active players.
 */
export const NATION_OVERFLOW_WHEN_ALL_FULL = false;

// ─── Nation power (shown on the Nation screen) ─────────────────────────────
// Three scores out of 100 that let nations be compared. Nations start with
// different profiles (Westmark rich and connected, Eryndor armed and orderly,
// Drennia even) but close overall totals.
export const POWER_ECONOMY_WEIGHTS = { prosperity: 0.6, fiscal_health: 0.4 } as const;
/** Military strength comes from the defence law in force. There is no war system yet. */
export const DEFENCE_STRENGTH: Record<string, number> = { minimal: 40, moderate: 50, high: 60, very_high: 70 };

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

// ─── The economy people feel -> approval ───────────────────────────────────
// On top of the national stats, voters judge the government on outcomes from
// the nations simulation (docs/NATIONS_SIMULATION.md): jobs, growth and debt.
// Approval = stat approval + economy adjustment (each part capped, then the total).
// Both the real election and every poll read the same number (liveApproval).
export const ECONOMY_APPROVAL = {
  /** Unemployment voters accept without complaint (share of the labour force). */
  unemploymentNorm: 0.06,
  /** Approval points per percentage point of unemployment above the norm (negative)... */
  perPointUnemploymentAbove: -1.5,
  /** ...and per point below it (smaller: people notice bad news more than good). */
  perPointUnemploymentBelow: -0.75,
  unemploymentCap: 10,
  /** Yearly growth in output (GDP) voters take as normal: what a steady economy does here (mostly population growth, about 0.3%). */
  growthNorm: 0.003,
  /** Approval points per percentage point of yearly growth above (or below) the norm. */
  perPointGrowth: 1.0,
  growthCap: 6,
  /** Growth is measured against this many months ago (needs that much history; otherwise no growth term). */
  growthLookbackMonths: 12,
  /** Debt above this share of GDP costs approval, this many points per percentage point. */
  debtSafeRatio: 0.9,
  perPointDebt: -0.1,
  /** Extra when lenders refuse (debt past the ceiling, programmes cut). */
  debtCeilingPenalty: -6,
  debtCap: 10,
  /** The whole economy adjustment never moves approval more than this either way. */
  totalCap: 15,
} as const;

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

// ─── One set of stories, three sets of place names ─────────────────────────
// Decision cards and news were written with Drennia's towns and its Premier.
// For the other nations the same story is told with their own industrial
// town, port, farm country and head of government.
export const NATION_PLACES: Record<string, { industry: string; port: string; farms: string }> = {
  drennia: { industry: 'Ironvale', port: 'Westport', farms: 'Greenmere' },
  westmark: { industry: 'Harrowick', port: 'Tidewater', farms: 'Wetherby' },
  eryndor: { industry: 'Coalreach', port: 'Southfold', farms: 'Goldmere' },
};

export function localisePlaces(text: string, polStateCode: string | null | undefined): string {
  const spec = getNationForPolState(polStateCode);
  if (!text || !spec || spec.countryId === DRENNIA.countryId) return text;
  const p = NATION_PLACES[spec.countryId];
  if (!p) return text;
  return text
    .replace(/Drennian dollar/g, 'dollar')
    .replace(/Drennport/g, spec.capital)
    .replace(/Ironvale/g, p.industry)
    .replace(/Westport/g, p.port)
    .replace(/Greenmere/g, p.farms)
    .replace(/Drennian/g, spec.demonym)
    .replace(/Drennia/g, spec.shortName)
    .replace(/\bPremier\b/g, spec.headOfGovernment.title);
}
