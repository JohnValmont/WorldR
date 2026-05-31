// ─────────────────────────────────────────────────────────────────────────────
// WORLDR ELECTION ENGINE — bloc_dhondt_v1
// One shared engine for projection, survey, and final result.
// All modes use identical voter bloc competition + D'Hondt seat allocation.
// Only mode="final" applies random per-bloc swing.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getSocietyProfile,
  extractIdeologies,
  calculateBlocAppeal,
  IDEOLOGY_BLOC_EFFECTS,
  MAIN_PROMISE_BLOC_EFFECTS,
  type VoterBloc,
} from './voterBlocs';

// ─────────────────────────────────────────────────────────────────────────────
// VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const ELECTION_CALC_VERSION = 'bloc_dhondt_v1';

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
  stabilityDefault: number;
  independentBaseStrength: number;
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
  dissolved?: boolean;
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

// Stored in worldr_past_elections
export interface ElectionResult {
  resultId: string;
  electionId: string;
  electionRunId?: string;
  partyId?: string;
  primeMinisterName?: string;
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
  calculationVersion: string;
}

// Options for the unified projection engine
export type ElectionMode = 'projection' | 'survey' | 'final';

export interface ElectionProjectionOptions {
  mode: ElectionMode;
  // When false (projection/survey): deterministic base; low/high use uniform ±swingPercent scaling
  applyRandomSwing: boolean;
  // Percentage for uniform swing on low/high scenarios (default 6)
  swingPercent?: number;
}

// Output of calculateElectionProjection
export interface ElectionProjectionResult {
  // Base scenario (no swing / deterministic)
  baseVoteShare: number;       // percent
  baseSeats: number;
  baseIndepVoteShare: number;
  baseIndepSeats: number;
  baseStatus: string;

  // Low scenario (base - swingPercent%)
  lowVoteShare: number;
  lowSeats: number;

  // High scenario (base + swingPercent%)
  highVoteShare: number;
  highSeats: number;

  // Turnout / NOTA context
  turnoutPercent: number;
  notaPercent: number;
  validVotes: number;
  eligibleVoters: number;

  // Debug info
  partyBlocShare: number;     // party's raw bloc share before normalization
  independentBlocShare: number;
  calculationVersion: string;
}

// Survey snapshot saved to worldr_election_surveys
export interface ElectionSurveySnapshot {
  surveyId: string;
  electionId: string;
  partyId: string;
  createdAt: string;
  inputSnapshot: {
    recognition: number;
    support: number;
    members: number;
    publicTrust: number;
    mediaPresence: number;
    campaignStrength: number;
    controversy: number;
    electionFundsAllocated: number;
    mainPromise: string | null;
    ideologies: string[];
  };
  pollingAccuracy: string;
  voteShareMargin: number;
  projectedVoteShareBase: number;
  projectedVoteShareLow: number;
  projectedVoteShareHigh: number;
  projectedSeatsBase: number;
  projectedSeatsLow: number;
  projectedSeatsHigh: number;
  independentSeatsBase: number;
  calculationVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRENNIA ELECTION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

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
// TURNOUT CALCULATION
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
// NOTA CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

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
// PARTY BLOC COMPETITION SCORE
// ─────────────────────────────────────────────────────────────────────────────
// swingMultiplier: 1.0 = base, 0.94 = low, 1.06 = high, or random for final mode

function calculatePartyBlocScore(
  party: ElectionPartyInput,
  bloc: VoterBloc,
  swingMultiplier: number,
): number {
  const ideologies = party.ideologyIds || [];

  let ideologyScore = 0;
  for (const ideology of ideologies) {
    const effectMap = IDEOLOGY_BLOC_EFFECTS[ideology] || IDEOLOGY_BLOC_EFFECTS[ideology.toLowerCase().replace(/\s+/g, '_')];
    if (effectMap && effectMap[bloc.id] != null) {
      ideologyScore += effectMap[bloc.id];
    }
  }

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

  return Math.max(1, baseScore * swingMultiplier);
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEPENDENT INDIVIDUALS BLOC SCORE
// ─────────────────────────────────────────────────────────────────────────────

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
// D'HONDT SEAT ALLOCATION
// ─────────────────────────────────────────────────────────────────────────────

export function runDHondt(
  participants: { id: string; votes: number }[],
  totalSeats: number,
): Record<string, number> {
  const seats: Record<string, number> = {};
  for (const p of participants) seats[p.id] = 0;

  const quotients: { id: string; quotient: number }[] = [];
  for (const p of participants) {
    for (let divisor = 1; divisor <= totalSeats; divisor++) {
      quotients.push({ id: p.id, quotient: p.votes / divisor });
    }
  }

  quotients.sort((a, b) => b.quotient - a.quotient);
  for (let i = 0; i < totalSeats; i++) {
    if (quotients[i]) seats[quotients[i].id] = (seats[quotients[i].id] || 0) + 1;
  }

  return seats;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT STATUS
// ─────────────────────────────────────────────────────────────────────────────

export function getPartyResultStatus(seats: number, totalSeats: number, majoritySeats: number): string {
  if (seats === 0) return 'No parliamentary presence';
  if (seats <= 4) return 'Small entry';
  if (seats <= 14) return 'Minor party';
  if (seats <= 29) return 'Rising party';
  if (seats <= majoritySeats - 1) return 'Opposition';
  return 'Majority government';
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE SHARED ENGINE — ONE SCENARIO PASS
// ─────────────────────────────────────────────────────────────────────────────
// swingMultiplier: 1.0 = base/deterministic, 0.94 = low, 1.06 = high
// For final mode, pass swingMultiplier = random (0.94–1.06) per call

interface ScenarioResult {
  partySeats: Record<string, number>;
  partyVoteShares: Record<string, number>;
  partyVotes: Record<string, number>;
  indepSeats: number;
  indepVoteShare: number;
  indepVotes: number;
  validVotes: number;
  votesCast: number;
  turnoutPercent: number;
  notaPercent: number;
  eligibleVoters: number;
  adultPopulation: number;
  partyRawBlocShare: Record<string, number>;
  indepRawBlocShare: number;
  independentTotalBlocScore: number;
}

function runOneScenario(
  config: CountryElectionConfig,
  parties: ElectionPartyInput[],
  swingMultiplier: number,  // uniform multiplier applied to ALL party bloc scores
  countryStability?: number,
): ScenarioResult {
  const adultPopulation = Math.round(config.population * config.adultRatio);
  const eligibleVoters = adultPopulation;

  const turnoutBreakdown = calculateTurnout(config, parties, countryStability);
  const votesCast = Math.round(eligibleVoters * turnoutBreakdown.finalPercent / 100);

  const notaBreakdown = calculateNOTA(config, parties);
  const notaVotes = Math.round(votesCast * notaBreakdown.finalPercent / 100);
  const validVotes = votesCast - notaVotes;

  const society = getSocietyProfile(config.countryName);
  const blocs = society?.blocs || [];

  const totalRegisteredRecognition = parties.reduce(
    (acc, p) => acc + (p.recognition || 0),
    0,
  );
  const registeredCount = Math.max(1, parties.length);

  const partyBlocShares: Record<string, number> = {};
  for (const p of parties) partyBlocShares[p.partyId] = 0;
  let independentTotalShare = 0;
  let independentTotalBlocScore = 0;

  for (const bloc of blocs) {
    const partyBlocScores: { partyId: string; score: number }[] = [];
    let totalBlocScore = 0;

    for (const party of parties) {
      const score = calculatePartyBlocScore(party, bloc, swingMultiplier);
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

    for (const ps of partyBlocScores) {
      partyBlocShares[ps.partyId] +=
        bloc.populationShare * (ps.score / totalBlocScore);
    }
    independentTotalShare +=
      bloc.populationShare * (indepScore / totalBlocScore);
  }

  // Normalize
  const totalShareBeforeNorm =
    Object.values(partyBlocShares).reduce((a, b) => a + b, 0) +
    independentTotalShare;

  const normFactor = totalShareBeforeNorm > 0 ? 100 / totalShareBeforeNorm : 1;

  const normalizedPartyShares: Record<string, number> = {};
  for (const pid of Object.keys(partyBlocShares)) {
    normalizedPartyShares[pid] = Math.round(partyBlocShares[pid] * normFactor * 100) / 100;
  }
  const independentVoteShare =
    Math.round(independentTotalShare * normFactor * 100) / 100;

  // Raw votes
  const partyVotes: Record<string, number> = {};
  let totalPartyVotes = 0;
  for (const party of parties) {
    const v = Math.round(validVotes * normalizedPartyShares[party.partyId] / 100);
    partyVotes[party.partyId] = v;
    totalPartyVotes += v;
  }
  const independentVotes = Math.max(0, validVotes - totalPartyVotes);

  // D'Hondt
  const dhondtParticipants = [
    ...parties.map((p) => ({ id: p.partyId, votes: partyVotes[p.partyId] || 0 })),
    { id: '__independent__', votes: independentVotes },
  ];
  const seatAllocation = runDHondt(dhondtParticipants, config.parliamentSeats);

  // Vote shares as % of valid votes
  const partyVoteShares: Record<string, number> = {};
  for (const party of parties) {
    const votes = partyVotes[party.partyId] || 0;
    partyVoteShares[party.partyId] =
      validVotes > 0 ? Math.round((votes / validVotes) * 1000) / 10 : 0;
  }

  const indepSeats = seatAllocation['__independent__'] || 0;
  const indepVoteShare =
    validVotes > 0 ? Math.round((independentVotes / validVotes) * 1000) / 10 : 0;

  const partySeats: Record<string, number> = {};
  for (const p of parties) {
    partySeats[p.partyId] = seatAllocation[p.partyId] || 0;
  }

  return {
    partySeats,
    partyVoteShares,
    partyVotes,
    indepSeats,
    indepVoteShare,
    indepVotes: independentVotes,
    validVotes,
    votesCast,
    turnoutPercent: turnoutBreakdown.finalPercent,
    notaPercent: notaBreakdown.finalPercent,
    eligibleVoters,
    adultPopulation,
    partyRawBlocShare: normalizedPartyShares,
    indepRawBlocShare: independentVoteShare,
    independentTotalBlocScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED PROJECTION ENGINE — PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
// For a single current party input. Returns base/low/high scenarios.
// mode="final" is handled by simulateElectionDay instead.

export function calculateElectionProjection(
  config: CountryElectionConfig,
  parties: ElectionPartyInput[],
  currentPartyId: string,
  options: ElectionProjectionOptions,
  countryStability?: number,
): ElectionProjectionResult {
  const swing = options.swingPercent ?? 6;

  let baseMultiplier = 1.0;
  let lowMultiplier = 1 - swing / 100;   // 0.94 for swing=6
  let highMultiplier = 1 + swing / 100;  // 1.06 for swing=6

  if (options.applyRandomSwing) {
    // Final mode: single random pass
    const r = 1 + (Math.random() * swing * 2 / 100) - (swing / 100);
    baseMultiplier = r;
    lowMultiplier = r;
    highMultiplier = r;
  }

  const base = runOneScenario(config, parties, baseMultiplier, countryStability);
  const low  = options.applyRandomSwing ? base : runOneScenario(config, parties, lowMultiplier,  countryStability);
  const high = options.applyRandomSwing ? base : runOneScenario(config, parties, highMultiplier, countryStability);

  const baseSeats = base.partySeats[currentPartyId] ?? 0;
  const lowSeats  = low.partySeats[currentPartyId]  ?? 0;
  const highSeats = high.partySeats[currentPartyId] ?? 0;

  const baseVoteShare = base.partyVoteShares[currentPartyId] ?? 0;
  const lowVoteShare  = low.partyVoteShares[currentPartyId]  ?? 0;
  const highVoteShare = high.partyVoteShares[currentPartyId] ?? 0;

  return {
    baseVoteShare,
    baseSeats,
    baseIndepVoteShare: base.indepVoteShare,
    baseIndepSeats: base.indepSeats,
    baseStatus: getPartyResultStatus(baseSeats, config.parliamentSeats, config.majoritySeats),
    lowVoteShare,
    lowSeats,
    highVoteShare,
    highSeats,
    turnoutPercent: base.turnoutPercent,
    notaPercent: base.notaPercent,
    validVotes: base.validVotes,
    eligibleVoters: base.eligibleVoters,
    partyBlocShare: base.partyRawBlocShare[currentPartyId] ?? 0,
    independentBlocShare: base.indepRawBlocShare,
    calculationVersion: ELECTION_CALC_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ELECTION DAY SIMULATION — wraps the unified engine
// ─────────────────────────────────────────────────────────────────────────────

export function simulateElectionDay(
  config: CountryElectionConfig,
  electionId: string,
  electionName: string,
  parties: ElectionPartyInput[],
  countryStability?: number,
): ElectionResult {
  // Use a single random swing multiplier per-party-per-bloc is NOT done here to
  // keep things simple and fair. Instead, we apply one uniform random multiplier
  // for the final result so it is near but not identical to the projection.
  const swingPct = 6;
  const swingMultiplier = 1 + (Math.random() * swingPct * 2 / 100) - (swingPct / 100);

  const scenario = runOneScenario(config, parties, swingMultiplier, countryStability);

  const resultId =
    `er_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const turnoutBreakdown = calculateTurnout(config, parties, countryStability);
  const notaBreakdown = calculateNOTA(config, parties);

  const partyResults: ElectionPartyResult[] = parties.map((party) => {
    const seats = scenario.partySeats[party.partyId] || 0;
    const votes = scenario.partyVotes[party.partyId] || 0;
    const voteShare = scenario.partyVoteShares[party.partyId] || 0;
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

  return {
    resultId,
    electionId,
    electionName,
    countryName: config.countryName,
    continentName: config.continentName,
    electionType: config.electionType,
    gameDate: { year: 0, month: 1, day: 1 },
    parliamentSeats: config.parliamentSeats,
    majoritySeats: config.majoritySeats,
    population: config.population,
    adultPopulation: scenario.adultPopulation,
    eligibleVoters: scenario.eligibleVoters,
    turnoutPercent: scenario.turnoutPercent,
    votesCast: scenario.votesCast,
    notaPercent: scenario.notaPercent,
    notaVotes: Math.round(scenario.votesCast * scenario.notaPercent / 100),
    validVotes: scenario.validVotes,
    nonVoters: scenario.eligibleVoters - scenario.votesCast,
    parties: partyResults,
    independentIndividuals: {
      voteShare: scenario.indepVoteShare,
      votes: scenario.indepVotes,
      seats: scenario.indepSeats,
      strength: Math.round(scenario.independentTotalBlocScore * 10) / 10,
    },
    turnoutBreakdown,
    notaBreakdown,
    createdAt: new Date().toISOString(),
    calculationVersion: ELECTION_CALC_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SURVEY OUTDATED DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export function surveyIsOutdated(
  inputSnapshot: ElectionSurveySnapshot['inputSnapshot'],
  currentStats: {
    recognition?: number;
    support?: number;
    members?: number;
    publicTrust?: number;
    mediaPresence?: number;
    campaignStrength?: number;
    controversy?: number;
    electionFundsAllocated?: number;
    mainPromise?: string | null;
    ideologies?: string[];
  },
): boolean {
  const eps = 0.01; // floating point tolerance
  if (Math.abs((inputSnapshot.recognition ?? 0) - (currentStats.recognition ?? 0)) > eps) return true;
  if (Math.abs((inputSnapshot.support ?? 0) - (currentStats.support ?? 0)) > eps) return true;
  if ((inputSnapshot.members ?? 0) !== (currentStats.members ?? 0)) return true;
  if (Math.abs((inputSnapshot.publicTrust ?? 0) - (currentStats.publicTrust ?? 0)) > eps) return true;
  if (Math.abs((inputSnapshot.mediaPresence ?? 0) - (currentStats.mediaPresence ?? 0)) > eps) return true;
  if (Math.abs((inputSnapshot.campaignStrength ?? 0) - (currentStats.campaignStrength ?? 0)) > eps) return true;
  if (Math.abs((inputSnapshot.controversy ?? 0) - (currentStats.controversy ?? 0)) > eps) return true;
  if (Math.abs((inputSnapshot.electionFundsAllocated ?? 0) - (currentStats.electionFundsAllocated ?? 0)) > eps) return true;
  if ((inputSnapshot.mainPromise ?? null) !== (currentStats.mainPromise ?? null)) return true;
  const snapIdeologies = (inputSnapshot.ideologies ?? []).slice().sort().join(',');
  const currIdeologies = (currentStats.ideologies ?? []).slice().sort().join(',');
  if (snapIdeologies !== currIdeologies) return true;
  return false;
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
