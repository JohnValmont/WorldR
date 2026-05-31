// ─────────────────────────────────────────────────────────────────────────────
// WORLDR ELECTION ENGINE
// Temporary local election simulation. In multiplayer, final election results
// must be calculated server-side from validated party stats, election
// registrations, campaign funds, and country election config.
// ─────────────────────────────────────────────────────────────────────────────
// This engine is reusable for all future nations by swapping CountryElectionConfig.
// Only hard country data should change per nation.

import {
  getSocietyProfile,
  extractIdeologies,
  calculateBlocAppeal,
  IDEOLOGY_BLOC_EFFECTS,
  MAIN_PROMISE_BLOC_EFFECTS,
  type VoterBloc,
} from './voterBlocs';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CountryElectionConfig {
  countryId: string;
  countryName: string;
  continentName: string;
  population: number;
  adultRatio: number;
  parliamentSeats: number;
  majoritySeats: number;
  baseTurnout: number;
  civicBonus: number;
  turnoutMin: number;
  turnoutMax: number;
  notaBase: number;
  electionType: string;
  votingAge: number;
  stabilityDefault: number; // fallback if country stability not available
  independentBaseStrength: number;
  // Per-bloc political independence modifiers (keyed by bloc.id)
  independentBlocModifiers: Record<string, number>;
}

export interface ElectionPartyInput {
  partyId: string;
  partyName: string;
  partyAbbreviation: string;
  leaderName: string;
  ideologyIds: string[];
  mainPromise: string | null;
  members: number;
  recognition: number;
  support: number;
  publicTrust: number;
  mediaPresence: number;
  campaignStrength: number;
  controversy: number;
  electionFundsAllocated: number;
  isCurrentParty?: boolean;
}

export interface ElectionPartyResult {
  partyId: string;
  partyName: string;
  partyAbbreviation: string;
  leaderName: string;
  ideologies: string[];
  mainPromise: string | null;
  voteShare: number; // percent
  votes: number;
  seats: number;
  status: string;
  electionFundsAllocated: number;
  recognition: number;
  support: number;
  members: number;
  publicTrust: number;
  mediaPresence: number;
  campaignStrength: number;
  controversy: number;
  isCurrentParty?: boolean;
}

export interface IndependentResult {
  voteShare: number;
  votes: number;
  seats: number;
  strength: number;
}

export interface TurnoutBreakdown {
  baseTurnout: number;
  stabilityEffect: number;
  competitionEffect: number;
  recognitionEffect: number;
  trustEffect: number;
  controversyEffect: number;
  civicBonus: number;
  finalPercent: number;
}

export interface NotaBreakdown {
  baseNota: number;
  trustPenalty: number;
  controversyBonus: number;
  lowChoiceBonus: number;
  finalPercent: number;
}

export interface ElectionResult {
  resultId: string;
  electionId: string;
  electionName: string;
  countryName: string;
  continentName: string;
  electionType: string;
  gameDate: { year: number; month: number; day: number };
  parliamentSeats: number;
  majoritySeats: number;
  population: number;
  adultPopulation: number;
  eligibleVoters: number;
  turnoutPercent: number;
  votesCast: number;
  notaPercent: number;
  notaVotes: number;
  validVotes: number;
  nonVoters: number;
  parties: ElectionPartyResult[];
  independentIndividuals: IndependentResult;
  turnoutBreakdown: TurnoutBreakdown;
  notaBreakdown: NotaBreakdown;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRENNIA ELECTION CONFIG
// ─────────────────────────────────────────────────────────────────────────────
// Drennia is a middle-class Varelian parliamentary nation. Varelia has stable
// institutions, civic culture, educated cities, and old political traditions,
// giving Drennia a positive civic turnout bonus.

export const DRENNIA_ELECTION_CONFIG: CountryElectionConfig = {
  countryId: 'drennia',
  countryName: 'Drennia',
  continentName: 'Varelia',
  population: 3100000,
  adultRatio: 0.74,
  parliamentSeats: 120,
  majoritySeats: 61,
  baseTurnout: 62,
  civicBonus: 4,
  turnoutMin: 48,
  turnoutMax: 84,
  notaBase: 3,
  electionType: 'Parliamentary Election',
  votingAge: 18,
  stabilityDefault: 67,
  independentBaseStrength: 500,
  // Per-bloc modifiers for Independent Individuals in Drennia
  // (higher = independents are more competitive in that bloc)
  independentBlocModifiers: {
    old_establishment: 1.10,
    rural_farmers: 1.05,
    urban_professionals: 0.95,
    students_youth: 0.90,
    industrial_workers: 0.95,
    small_business_owners: 1.00,
    public_sector_workers: 1.00,
    religious_conservatives: 1.05,
    military_families: 1.05,
    big_business_owners: 1.10,
    low_income_citizens: 1.00,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTION CONFIG REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export function getElectionConfig(countryName: string): CountryElectionConfig | null {
  if (countryName === 'Drennia') return DRENNIA_ELECTION_CONFIG;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TURNOUT CALCULATION (Task 8)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateTurnout(
  config: CountryElectionConfig,
  parties: ElectionPartyInput[],
  countryStability?: number,
): TurnoutBreakdown {
  const stability = countryStability ?? config.stabilityDefault;
  const stabilityEffect = (stability - 50) * 0.20;

  const competitionEffect = Math.min(parties.length * 1.2, 8);

  const totalRecognition = parties.reduce((acc, p) => acc + (p.recognition || 0), 0);
  const recognitionEffect = Math.min(totalRecognition * 0.15, 6);

  const avgPublicTrust =
    parties.length > 0
      ? parties.reduce((acc, p) => acc + (p.publicTrust || 0), 0) / parties.length
      : 0;
  const trustEffect = (avgPublicTrust - 5) * 1.5;

  const avgControversy =
    parties.length > 0
      ? parties.reduce((acc, p) => acc + (p.controversy || 0), 0) / parties.length
      : 0;
  const controversyEffect = -(avgControversy * 1.2);

  const civicBonus = config.civicBonus;

  const raw =
    config.baseTurnout +
    stabilityEffect +
    competitionEffect +
    recognitionEffect +
    trustEffect +
    controversyEffect +
    civicBonus;

  const finalPercent =
    Math.round(Math.max(config.turnoutMin, Math.min(config.turnoutMax, raw)) * 10) / 10;

  return {
    baseTurnout: config.baseTurnout,
    stabilityEffect: Math.round(stabilityEffect * 100) / 100,
    competitionEffect: Math.round(competitionEffect * 100) / 100,
    recognitionEffect: Math.round(recognitionEffect * 100) / 100,
    trustEffect: Math.round(trustEffect * 100) / 100,
    controversyEffect: Math.round(controversyEffect * 100) / 100,
    civicBonus,
    finalPercent,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTA CALCULATION (Task 9)
// ─────────────────────────────────────────────────────────────────────────────
// NOTA means voters who show up but reject all options.

export function calculateNOTA(
  config: CountryElectionConfig,
  parties: ElectionPartyInput[],
): NotaBreakdown {
  const avgPublicTrust =
    parties.length > 0
      ? parties.reduce((acc, p) => acc + (p.publicTrust || 0), 0) / parties.length
      : 0;
  const avgControversy =
    parties.length > 0
      ? parties.reduce((acc, p) => acc + (p.controversy || 0), 0) / parties.length
      : 0;

  const trustPenalty = Math.max(0, (5 - avgPublicTrust) * 0.8);
  const controversyBonus = avgControversy * 0.5;
  const lowChoiceBonus = parties.length <= 2 ? 2 : 0;

  const raw = config.notaBase + trustPenalty + controversyBonus + lowChoiceBonus;
  const finalPercent = Math.round(Math.max(2, Math.min(12, raw)) * 10) / 10;

  return {
    baseNota: config.notaBase,
    trustPenalty: Math.round(trustPenalty * 100) / 100,
    controversyBonus: Math.round(controversyBonus * 100) / 100,
    lowChoiceBonus,
    finalPercent,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTY BLOC COMPETITION SCORE (Task 11)
// ─────────────────────────────────────────────────────────────────────────────

function calculatePartyBlocScore(
  party: ElectionPartyInput,
  bloc: VoterBloc,
  applySwing: boolean,
): number {
  const ideologies = party.ideologyIds || [];

  // Ideology appeal for this bloc
  let ideologyScore = 0;
  for (const ideology of ideologies) {
    const effectMap = IDEOLOGY_BLOC_EFFECTS[ideology] || IDEOLOGY_BLOC_EFFECTS[ideology.toLowerCase().replace(/\s+/g, '_')];
    if (effectMap && effectMap[bloc.id] != null) {
      ideologyScore += effectMap[bloc.id];
    }
  }

  // Main promise effect
  let mainPromiseScore = 0;
  if (party.mainPromise) {
    const promiseMap = MAIN_PROMISE_BLOC_EFFECTS[party.mainPromise];
    if (promiseMap && promiseMap[bloc.id] != null) {
      mainPromiseScore = promiseMap[bloc.id];
    }
  }

  const finalAppealScore = ideologyScore + mainPromiseScore;
  const ideologyAppealPower = finalAppealScore * 6;

  const recognitionPower = (party.recognition || 0) * 1.5;
  const supportPower = (party.support || 0.1) * 6;
  const publicTrustPower = (party.publicTrust || 0) * 1.2;
  const campaignStrengthPower = (party.campaignStrength || 0) * 1.2;
  const mediaPresencePower = (party.mediaPresence || 0) * 0.8;
  const memberOrganizationPower = Math.min(
    Math.log10(Math.max(1, party.members || 1) + 1) * 3,
    18,
  );
  const electionFundPower = Math.min(
    Math.log(1 + (party.electionFundsAllocated || 0) / 100000) * 4,
    20,
  );
  const controversyPenalty = (party.controversy || 0) * 2;

  const baseScore =
    3 +
    ideologyAppealPower +
    recognitionPower +
    supportPower +
    publicTrustPower +
    campaignStrengthPower +
    mediaPresencePower +
    memberOrganizationPower +
    electionFundPower -
    controversyPenalty;

  // Election swing: ±6% of base score
  const swing = applySwing
    ? baseScore * (Math.random() * 0.12 - 0.06)
    : 0;

  return Math.max(1, baseScore + swing);
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEPENDENT INDIVIDUALS BLOC SCORE (Task 12)
// ─────────────────────────────────────────────────────────────────────────────
// Independent Individuals are NOT AI parties. They represent non-party elected
// figures, local independents, unaligned civic candidates, and voters not
// captured by player parties.

function calculateIndependentBlocScore(
  config: CountryElectionConfig,
  bloc: VoterBloc,
  registeredPlayerPartiesCount: number,
  totalPlayerPartyRecognition: number,
): number {
  const baseIndep =
    config.independentBaseStrength * (bloc.populationShare / 100);

  const registeredPartyModifier = 1 - Math.min(
    (registeredPlayerPartiesCount - 1) * 0.07,
    0.35,
  );
  const recognitionModifier = 1 - Math.min(
    totalPlayerPartyRecognition * 0.0025,
    0.25,
  );
  const blocMod = config.independentBlocModifiers[bloc.id] ?? 1.0;

  return Math.max(
    0,
    baseIndep * registeredPartyModifier * recognitionModifier * blocMod,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// D'HONDT SEAT ALLOCATION (Task 15)
// ─────────────────────────────────────────────────────────────────────────────
// Drennia uses D'Hondt because it's a Varelian parliamentary system. D'Hondt is
// proportional and slightly favours stronger parties — realistic for this system.

export function runDHondt(
  participants: { id: string; votes: number }[],
  totalSeats: number,
): Record<string, number> {
  const seats: Record<string, number> = {};
  for (const p of participants) seats[p.id] = 0;

  // Generate all quotients
  const quotients: { id: string; quotient: number }[] = [];
  for (const p of participants) {
    for (let divisor = 1; divisor <= totalSeats; divisor++) {
      quotients.push({ id: p.id, quotient: p.votes / divisor });
    }
  }

  // Sort descending and pick top N
  quotients.sort((a, b) => b.quotient - a.quotient);
  for (let i = 0; i < totalSeats; i++) {
    if (quotients[i]) seats[quotients[i].id] = (seats[quotients[i].id] || 0) + 1;
  }

  return seats;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT STATUS (Task 16)
// ─────────────────────────────────────────────────────────────────────────────

export function getPartyResultStatus(seats: number, totalSeats: number, majoritySeats: number): string {
  if (seats === 0) return 'No parliamentary presence';
  if (seats <= 4) return 'Small entry';
  if (seats <= 14) return 'Minor party';
  if (seats <= 29) return 'Rising party';
  if (seats <= majoritySeats - 1) return 'Major party — minority government possible';
  return 'Majority government';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SIMULATION (Tasks 7–15)
// ─────────────────────────────────────────────────────────────────────────────

export function simulateElectionDay(
  config: CountryElectionConfig,
  electionId: string,
  electionName: string,
  parties: ElectionPartyInput[],
  countryStability?: number,
): ElectionResult {
  // ── ADULT POPULATION & ELIGIBLE VOTERS (Task 7) ───────────────────────────
  // Future versions may add residency, legal restrictions, diaspora voting, and voter registration systems.
  const adultPopulation = Math.round(config.population * config.adultRatio);
  const eligibleVoters = adultPopulation;

  // ── TURNOUT (Task 8) ──────────────────────────────────────────────────────
  const turnoutBreakdown = calculateTurnout(config, parties, countryStability);
  const votesCast = Math.round(eligibleVoters * turnoutBreakdown.finalPercent / 100);
  const nonVoters = eligibleVoters - votesCast;

  // ── NOTA (Task 9) ─────────────────────────────────────────────────────────
  const notaBreakdown = calculateNOTA(config, parties);
  const notaVotes = Math.round(votesCast * notaBreakdown.finalPercent / 100);
  const validVotes = votesCast - notaVotes;

  // ── VOTER BLOC COMPETITION ENGINE (Task 10–13) ────────────────────────────
  const society = getSocietyProfile(config.countryName);
  const blocs = society?.blocs || [];

  const totalRegisteredRecognition = parties.reduce(
    (acc, p) => acc + (p.recognition || 0),
    0,
  );
  const registeredCount = Math.max(1, parties.length);

  // For each bloc: calculate party scores + independent score
  // Then split that bloc's population share proportionally
  const partyBlocShares: Record<string, number> = {};
  for (const p of parties) partyBlocShares[p.partyId] = 0;
  let independentTotalShare = 0;

  let independentTotalBlocScore = 0;

  for (const bloc of blocs) {
    const partyBlocScores: { partyId: string; score: number }[] = [];
    let totalBlocScore = 0;

    for (const party of parties) {
      const score = calculatePartyBlocScore(party, bloc, true);
      partyBlocScores.push({ partyId: party.partyId, score });
      totalBlocScore += score;
    }

    const indepScore = calculateIndependentBlocScore(
      config,
      bloc,
      registeredCount,
      totalRegisteredRecognition,
    );
    independentTotalBlocScore += indepScore;
    totalBlocScore += indepScore;

    if (totalBlocScore <= 0) continue;

    // Distribute this bloc's population share by score ratio
    for (const ps of partyBlocScores) {
      partyBlocShares[ps.partyId] +=
        bloc.populationShare * (ps.score / totalBlocScore);
    }
    independentTotalShare +=
      bloc.populationShare * (indepScore / totalBlocScore);
  }

  // Ensure independent floor (Task 12)
  // If total bloc score for independents is very low, floor is guaranteed by
  // the calculateIndependentBlocScore floor logic above.

  // ── NORMALIZE VOTE SHARES (Task 13) ──────────────────────────────────────
  const totalShareBeforeNorm =
    Object.values(partyBlocShares).reduce((a, b) => a + b, 0) +
    independentTotalShare;

  const normFactor = totalShareBeforeNorm > 0 ? 100 / totalShareBeforeNorm : 1;

  for (const pid of Object.keys(partyBlocShares)) {
    partyBlocShares[pid] = Math.round(partyBlocShares[pid] * normFactor * 100) / 100;
  }
  const independentVoteShare =
    Math.round(independentTotalShare * normFactor * 100) / 100;

  // ── RAW VOTES (Task 14) ───────────────────────────────────────────────────
  // Use validVotes, not total population
  const partyVotes: Record<string, number> = {};
  let totalPartyVotes = 0;
  for (const party of parties) {
    const v = Math.round(validVotes * partyBlocShares[party.partyId] / 100);
    partyVotes[party.partyId] = v;
    totalPartyVotes += v;
  }
  // Independents get remainder to ensure total = validVotes
  const independentVotes = Math.max(0, validVotes - totalPartyVotes);

  // ── D'HONDT SEAT ALLOCATION (Task 15) ────────────────────────────────────
  const dhondtParticipants = [
    ...parties.map((p) => ({ id: p.partyId, votes: partyVotes[p.partyId] || 0 })),
    { id: '__independent__', votes: independentVotes },
  ];

  const seatAllocation = runDHondt(dhondtParticipants, config.parliamentSeats);

  // ── ASSEMBLE RESULTS ──────────────────────────────────────────────────────
  const partyResults: ElectionPartyResult[] = parties.map((party) => {
    const seats = seatAllocation[party.partyId] || 0;
    const votes = partyVotes[party.partyId] || 0;
    const voteShare =
      validVotes > 0 ? Math.round((votes / validVotes) * 1000) / 10 : 0;
    return {
      partyId: party.partyId,
      partyName: party.partyName,
      partyAbbreviation: party.partyAbbreviation,
      leaderName: party.leaderName,
      ideologies: party.ideologyIds || [],
      mainPromise: party.mainPromise,
      voteShare,
      votes,
      seats,
      status: getPartyResultStatus(seats, config.parliamentSeats, config.majoritySeats),
      electionFundsAllocated: party.electionFundsAllocated,
      recognition: party.recognition,
      support: party.support,
      members: party.members,
      publicTrust: party.publicTrust,
      mediaPresence: party.mediaPresence,
      campaignStrength: party.campaignStrength,
      controversy: party.controversy,
      isCurrentParty: party.isCurrentParty,
    };
  });

  const indepSeats = seatAllocation['__independent__'] || 0;
  const indepVoteShare =
    validVotes > 0 ? Math.round((independentVotes / validVotes) * 1000) / 10 : 0;

  const resultId =
    `er_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    resultId,
    electionId,
    electionName,
    countryName: config.countryName,
    continentName: config.continentName,
    electionType: config.electionType,
    gameDate: { year: 0, month: 1, day: 1 }, // Alpha: game calendar not implemented yet
    parliamentSeats: config.parliamentSeats,
    majoritySeats: config.majoritySeats,
    population: config.population,
    adultPopulation,
    eligibleVoters,
    turnoutPercent: turnoutBreakdown.finalPercent,
    votesCast,
    notaPercent: notaBreakdown.finalPercent,
    notaVotes,
    validVotes,
    nonVoters,
    parties: partyResults,
    independentIndividuals: {
      voteShare: indepVoteShare,
      votes: independentVotes,
      seats: indepSeats,
      strength: Math.round(independentTotalBlocScore * 10) / 10,
    },
    turnoutBreakdown,
    notaBreakdown,
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ELECTION RESULT STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const PAST_ELECTIONS_KEY = 'worldr_past_elections';

export function loadPastElections(): ElectionResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PAST_ELECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePastElection(result: ElectionResult): void {
  if (typeof window === 'undefined') return;
  const existing = loadPastElections();
  // Prevent duplicates: remove any existing result for same electionId + countryName
  const filtered = existing.filter(
    (r) => !(r.electionId === result.electionId && r.countryName === result.countryName),
  );
  filtered.unshift(result);
  localStorage.setItem(PAST_ELECTIONS_KEY, JSON.stringify(filtered));
}

export function electionResultExists(electionId: string, countryName: string): boolean {
  const existing = loadPastElections();
  return existing.some(
    (r) => r.electionId === electionId && r.countryName === countryName,
  );
}
