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
  members?: { id: string; name: string; role: string; trust: number; clout: number; hasSeat: boolean; isMe: boolean }[];
  districtsTaken?: string[];
  canStand?: boolean;
}

export interface ElectionReplay {
  cycleId: string;
  arc: number;
  hasResults: boolean;
  districts: { id: string; name: string; region: string; seats: number; votes: Record<string, number>; won: Record<string, number> }[];
  previousSeats: Record<string, number>;
}

export interface NationRow {
  countryId: string; polStateCode: string; name: string; officialName: string; capital: string; government: string; motto: string;
  flag: { pattern: string; colors: string[]; emblem: string; emblemColor: string };
  premier: string | null; premierIsPlayer: boolean; leadParty: { name: string; color: string } | null;
  governmentSeats: number; seats: number; approval: number;
  power: { economy: number; military: number; influence: number; overall: number };
  monthsToElection: number | null; players: number; cap: number; mine: boolean;
}
export interface DecreeRow { key: string; office: string; title: string; blurb: string; stat: Record<string, number>; support: Record<string, number> }
export interface Office { titles: string[]; decreeAp: number; lastsMonths: number; usedThisMonth: string | null; decrees: DecreeRow[] }

export interface FloorMe extends Me {
  charisma: number;
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
      partyFoundingCost: number; rallyAp: number; adAp: number; adCost: number; fundraiseAp: number;
      pactAp: number; pactMaxCash: number; pactCashPerPoint: number; leadershipAp: number; switchCooldownMonths: number;
    };
    hand: HandCard[];
    actions: {
      rally: { ap: number; gain: Record<string, number> };
      ad: { ap: number; cost: number; paidBy: 'party' | 'you'; gain: number };
      fundraise: { ap: number; low: number; high: number };
    } | null;
    deals: Deals | null;
    partyRoom: PartyRoom | null;
    log: { arc: number; kind: string; summary: string }[];
    world: NationRow[];
    office: Office | null;
  };
}
