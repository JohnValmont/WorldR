// Mirrors backend/src/api/services/desk.service.ts (GET /politics/desk).
// Everything the politics screens show comes from this one call.
import type { Bill, Capitol, Me } from '../_capitol/types';

export type Vote = 'yea' | 'nay';
export type Tone = 'good' | 'mixed' | 'bad';

export interface Effects {
  trust?: number;
  clout?: number;
  cash?: number;
  funds?: number;
  support?: Record<string, number>;
  rival?: number;
  stat?: Record<string, number>;
}

export interface HandOption {
  label: string;
  cost: { ap: number; cash: number; funds: number };
  outcomes: { chance: number; tone: Tone; effects: Effects }[];
}
export interface HandCard {
  id: string;
  key: string;
  kicker: string;
  title: string;
  body: string;
  status: 'open' | 'resolved' | 'expired';
  chosen: number | null;
  result: { index: number; tone: Tone; text: string; effects: Effects } | null;
  options: HandOption[];
}

export interface Segment { key: string; label: string; short: string; size: number }

export interface FloorBill extends Bill {
  lineSource: Record<string, 'leader' | 'pact' | 'favour' | 'pressure' | 'ideology'>;
  byParty: Record<string, { yea: number; nay: number; rebels: number }>;
  rebels: number;
}

export interface PactForecast {
  human: boolean;
  live: string | null;
  committed: boolean;
  yea?: { accept: boolean; score: number; reason: string };
  nay?: { accept: boolean; score: number; reason: string };
}
export interface PactRow {
  id: string; billId: string; billTitle: string; fromPartyId: string; toPartyId: string;
  askedVote: Vote; cash: number; status: string; arc: number; mine: boolean;
}
export interface FavourRow {
  id: string; partyId: string; status: 'pending' | 'open' | 'called' | 'kept' | 'broken';
  billId: string | null; billTitle: string | null; vote: Vote | null; arc: number;
}
export interface Deals {
  canDeal: boolean;
  whyNot: string | null;
  wordBrokenLeft: number;
  forecasts: Record<string, Record<string, PactForecast>>;
  incoming: { id: string; billId: string; billTitle: string; fromPartyId: string; fromName: string; askedVote: Vote; cash: number }[];
  pacts: PactRow[];
  favoursHeld: FavourRow[];
  favoursOwed: FavourRow[];
}

export interface PartyRoom {
  cooldownLeft: number;
  leaderIsHuman?: boolean;
  leaderName?: string | null;
  canChallenge?: boolean;
  challengeWaitMonths?: number;
  challengeNeed?: number;
  challengeWouldWin?: boolean;
  funds?: number;
  members?: { id: string; name: string; role: string; trust: number; clout: number; hasSeat: boolean; isMe: boolean; thisMonth?: MemberWork }[];
  contest?: Contest | null;
  districtsTaken?: string[];
  canStand?: boolean;
}

export interface MemberWork { rallies: number; ads: number; fundraisers: number; raised: number; deals: number }
export interface Contest {
  id: string; status: 'open' | 'won' | 'lost' | 'void'; openedArc: number; closesArc: number;
  challenger: { id: string; name: string; clout: number };
  leader: { id: string; name: string; clout: number };
  ballots: { id: string; name: string; side: 'challenger' | 'leader'; mp: boolean }[];
  myBallot: 'challenger' | 'leader' | null;
  standing: { challenger: number; leader: number; winner: 'challenger' | 'leader' } | null;
  rules: { ballotWeight: number; mpMult: number; incumbency: number };
}

// ─── Career ladder, inbox ────────────────────────────────────────────────────
export interface LadderRung { key: string; title: string; unlocks: string; next: string | null; reached: boolean; current: boolean; peak: boolean }
export interface Career {
  peakRung: string; peakRungArc: number | null;
  monthsMp: number; monthsLeader: number; monthsMinister: number; monthsHead: number;
  bestWorldRank: number | null; bestWorldRankArc: number | null; monthsWorldTop: number;
}
export interface Notice { id: string; arc: number; kind: string; text: string; tab: string | null; read: boolean; at: string }

export interface ElectionReplay {
  cycleId: string;
  arc: number;
  hasResults: boolean;
  districts: { id: string; name: string; region: string; seats: number; votes: Record<string, number>; won: Record<string, number> }[];
  previousSeats: Record<string, number>;
}

/** Nations simulation (docs/NATIONS_SIMULATION.md): people, jobs, sectors and the world rating. Read-only. */
export interface NationSim {
  polStateCode: string; arc: number | null; projected: boolean;
  population: number; populationChange: { births: number; deaths: number; migration: number };
  labourForce: number; unemployment: number; unemploymentTrend: number | null;
  gdpYearly: number; gdpPerPerson: number; gdpTrend: number | null;
  sectors: { id: string; name: string; jobs: number; jobShare: number; outputYearly: number; outputShare: number; buildings: number; buildingName: string }[];
  rating: number; ratingTrend: number | null; tier: string; tierBlurb: string; rank: number;
  pillars: { id: string; name: string; value: number }[];
  history: { arc: number; rating: number; unemployment: number; gdpYearly: number; population: number }[];
}

export interface NationRow {
  countryId: string; polStateCode: string; name: string; officialName: string; capital: string; government: string; motto: string;
  flag: { pattern: string; colors: string[]; emblem: string; emblemColor: string };
  leaderTitle: string; headOfState: { title: string; name: string; role: string }; legislatureName: string; termYears: number;
  culture: string | null; traits: string[];
  premier: string | null; premierIsPlayer: boolean; leadParty: { name: string; color: string } | null;
  governmentSeats: number; seats: number; approval: number;
  power: { economy: number; military: number; influence: number; overall: number };
  sim: NationSim | null;
  monthsToElection: number | null; players: number; cap: number; mine: boolean;
}
export interface DecreeRow { key: string; office: string; title: string; blurb: string; stat: Record<string, number>; support: Record<string, number> }
export interface Office { titles: string[]; decreeAp: number; lastsMonths: number; usedThisMonth: string | null; decrees: DecreeRow[] }

export interface FloorMe extends Me {
  charisma: number;
  background: { key: string; label: string; edge: string; homeGroup: string | null } | null;
  convictions: Record<string, number> | null;
  hasSeat: boolean;
  voteMode: 'line' | 'seat' | null;
}

export interface Desk extends Omit<Capitol, 'bills' | 'me'> {
  bills: FloorBill[];
  me: FloorMe | null;
  desk: {
    segments: Segment[];
    support: Record<string, Record<string, number>>;
    supportTargets: Record<string, Record<string, number>>;
    election: ElectionReplay | null;
    rules: {
      passMargin: number;
      partyFoundingCost: number; rallyAp: number; adAp: number; adCost: number; fundraiseAp: number;
      pactAp: number; pactMaxCash: number; pactCashPerPoint: number; leadershipAp: number; leadershipMinClout?: number; switchCooldownMonths: number;
    };
    hand: HandCard[];
    actions: {
      rally: { ap: number; gain: Record<string, number>; homeGroup?: string | null };
      ad: { ap: number; cost: number; paidBy: 'party' | 'you'; gain: number };
      fundraise: { ap: number; low: number; high: number };
    } | null;
    deals: Deals | null;
    handshakesIncoming?: number;
    partyRoom: PartyRoom | null;
    log: { arc: number; kind: string; summary: string }[];
    world: NationRow[];
    office: Office | null;
    notices: { unread: number; items: Notice[] };
    ladder: LadderRung[] | null;
    career: Career | null;
  };
}

// ─── Corridors (GET /politics/corridors) ─────────────────────────────────────
export interface Person {
  id: string; name: string; isPlayer: boolean; isMe: boolean; role: string;
  party: { id: string; name: string; color: string } | null; isLeader: boolean; district: string | null; canVote: boolean;
  trust: number; clout: number; background: string | null; record: { kept: number; broken: number }; lastSeen: string | null;
}
export interface DealSide { billId: string | null; billTitle: string | null; vote: Vote | null; cash: number; result: 'kept' | 'broken' | 'void' | null }
export interface Deal {
  id: string; status: 'offered' | 'accepted' | 'declined' | 'withdrawn' | 'expired' | 'settled'; mine: boolean; note: string | null; createdArc: number;
  otherId: string; otherName: string; iGive: DealSide; iGet: DealSide;
}
export interface Corridors {
  me: { id: string; partyId: string | null };
  nation: { code: string; name: string };
  people: Person[];
  bills: { id: string; title: string; partyName: string | null }[];
  deals: Deal[];
  rules: { handshakeAp: number; maxCash: number };
}
export interface PersonProfile {
  id: string; name: string; background: { label: string; blurb: string } | null; record: { kept: number; broken: number };
  votes: { billId: string; title: string; vote: Vote; status: string }[];
  brokenWord: { headline: string; body: string; arc: number }[];
  career?: Career | null;
  worldRank?: { rank: number; share: number; arc: number; of: number } | null;
}

// ─── The Meridian Wire (GET /agency/front) ──────────────────────────────────
export interface IndexRow {
  key: string; rank: number; prevRank: number | null; move: number | null; share: number; score: number;
  name: string; isPlayer: boolean; characterId: string | null; nationCode: string; nationName: string;
  partyName: string | null; partyColor: string | null; officeLabel: string;
}
export interface WireStory { nationCode: string; nationName: string; kind: string; headline: string; body: string }
export interface Dispatch {
  id: string; arc: number; headline: string; body: string; status: 'published' | 'hidden' | 'removed';
  endorsements: number; reports: number; at: string;
  author: { id: string; name: string; nationName: string | null };
  mine?: boolean; myReaction?: 'endorse' | 'report' | null;
}
export interface Edition {
  arc: number; headline: string; publishedAt: string; rankings: IndexRow[]; total: number; mine: IndexRow | null;
  stories: WireStory[]; dispatches: Dispatch[];
}
export interface WireFront {
  agency: { name: string; tagline: string };
  arc: number;
  edition: Edition | null;
  archive: { arc: number; headline: string }[];
  live: { top: IndexRow[]; mine: IndexRow | null; total: number };
  dispatches: Dispatch[];
  allowance: { filed: number; perMonth: number; ap: number; energy: number } | null;
  career: Career | null;
  rules: { perMonth: number; ap: number; headlineMax: number; bodyMax: number; endorsementsPerClout: number; maxCloutPerMonth: number; hideAtReports: number; publishSize: number; statesmanRank: number };
}

// ─── Political map (GET /politics/map) ───────────────────────────────────────
export interface MapParty {
  id: string; name: string; abbr: string; color: string; motto: string | null; platform: Record<string, number>;
  seats: number; pollSeats: number; pollShare: number; governing: boolean; leadsGovernment: boolean; leader: string | null; leaderIsPlayer: boolean;
}
export interface MapDistrict {
  id: string; name: string; region: string; seats: number; voters: number; groups: Record<string, number>;
  last: { shares: Record<string, number>; seats: Record<string, number> };
  poll: { shares: Record<string, number>; seats: Record<string, number> };
  players: { id: string; name: string; partyId: string }[];
}
export interface MapNation {
  code: string; countryId: string; name: string; officialName: string; capital: string; government: string; leaderTitle: string;
  regions: { code: string; name: string; capital: string; character: string }[];
  parties: MapParty[]; districts: MapDistrict[];
}
export interface PoliticalMap { nations: MapNation[] }
