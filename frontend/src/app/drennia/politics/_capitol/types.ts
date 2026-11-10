// Mirrors backend/src/api/services/capitol.service.ts (GET /politics/capitol).
// Only real data: nothing here is invented client-side.

export type Axis = 'taxation' | 'labour' | 'investment' | 'trade' | 'stability';
export type Platform = Record<Axis, number>;

export interface FlagSpec {
  pattern: 'hoist-triangle-band' | 'tricolor-vertical' | 'tricolor-horizontal' | 'cross';
  colors: string[];
  emblem: 'star8' | 'gear' | 'wheat' | 'anchor' | 'none';
  emblemColor: string;
}

export interface CapitolParty {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  motto: string | null;
  blurb: string | null;
  leaderName: string | null;
  isNpc: boolean;
  platform: Platform;
  lean: number;
  seats: number;
  members: number;
  inGovernment: boolean;
  leadsGovernment: boolean;
  treasury: number;
}

export interface CabinetSeat {
  key: string;
  title: string;
  short: string;
  blurb: string;
  portfolio: { id: string; name: string }[];
  holderName: string | null;
  characterId: string | null;
  isPlayer: boolean;
  partyId: string | null;
  since: number | null;
}

export interface PollPoint {
  arc: number;
  shares: Record<string, number>;
  seats: Record<string, number>;
  approval: number | null;
}

export interface LawOption {
  id: string;
  name: string;
  tags: string[];
  effects: Record<string, number>;
  supporters: string[];
}

export interface Law {
  id: string;
  name: string;
  mechanism: string;
  rolloutMonths: number;
  ministry: { key: string; short: string } | null;
  currentOptionId: string;
  enactedArc: number | null;
  options: LawOption[];
}

export interface Bill {
  id: string;
  title: string;
  category: string | null;
  option: string | null;
  currentOptionId: string | null;
  status: 'proposed' | 'passed' | 'failed' | 'active';
  proposedArc: number;
  resolvedArc: number | null;
  proposer: { id: string; name: string; color: string; abbreviation: string } | null;
  fromGovernment: boolean;
  partyVotes: Record<string, 'yea' | 'nay'>;
  tally: { yea: number; nay: number };
  projectedPass: boolean;
  myVote: 'yea' | 'nay' | null;
}

export interface District {
  id: string;
  name: string;
  region: string;
  seats: number;
  voters: number;
  sitting: Record<string, number>;
}

export type Rung = 'citizen' | 'member' | 'candidate' | 'mp' | 'minister' | 'premier';

export interface Me {
  characterId: string;
  name: string;
  credibility: number;
  influence: number;
  cash: number | null;
  ap: { current: number; cap: number };
  party: { id: string; name: string; color: string; role: string; seats: number; inGovernment: boolean } | null;
  seatDistrict: string | null;
  candidacyDistrict: string | null;
  office: string | null;
  rung: Rung;
  ladder: Rung[];
  canTableBill: boolean;
  tableBillApCost: number;
  isPartyLeader: boolean;
  eligibleMinisters: { id: string; name: string; credibility: number; partyId: string }[];
  nextGoal: string;
}

export interface Capitol {
  nation: {
    officialName: string;
    shortName: string;
    demonym?: string;
    government?: string;
    capital?: string;
    motto?: string;
    currency?: string;
    flag?: FlagSpec;
    headOfState?: { title: string; name: string; role: string };
    headOfGovernment?: { title: string; role: string };
    legislature: { name: string; seats: number; majority: number; termMonths?: number; electoralSystem?: string };
    constitution?: string[];
    regions?: { code: string; name: string; capital: string; character: string; economy: string }[];
  };
  state: { id: string; code: string; population: number; registeredVoters: number };
  stats: Record<string, number>;
  approval: { current: number; live: number };
  calendar: {
    arc: number;
    phase: 'governing' | 'filing' | 'campaign' | 'polling' | 'formation';
    cycleNumber: number;
    electionArc: number;
    filingArc: number;
    campaignArc: number;
    formationEndArc: number;
    monthsToElection: number;
  };
  parliament: {
    name: string;
    seats: number;
    majority: number;
    filled: number;
    government: { type: 'majority' | 'coalition' | 'minority'; leadPartyId: string; memberPartyIds: string[]; seats: number } | null;
  };
  parties: CapitolParty[];
  premier: { name: string; characterId: string | null; isPlayer: boolean; partyId: string; since: number } | null;
  cabinet: CabinetSeat[];
  polls: { latest: PollPoint | null; history: PollPoint[]; live: boolean };
  laws: Law[];
  businessEffects: { costMultiplier: number; demandMultiplier: number; reliabilityBonus: number; appealBonus: number; marketAccessBonus: number } | null;
  bills: Bill[];
  districts: District[];
  news: { id: string; arc: number; kind: string; headline: string; body: string }[];
  me: Me | null;
}
