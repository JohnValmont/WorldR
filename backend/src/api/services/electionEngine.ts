import {
  AXES,
  Platform,
  VoterSegment,
  SEGMENTS,
  POL_FIT_EXP,
  POL_REACH_MIN,
  POL_REACH_MAX,
  POL_REACH_HALF_SAT,
  POL_INCUMBENCY_BONUS,
  POL_BASE_TURNOUT,
  POL_COUNCIL_SEATS,
  POL_VOTE_JITTER
} from '../constants/politics';
import { Conditions, conditionTurnoutMultiplier } from './conditions';

export interface EngineCandidate {
  candidateId: string;
  partyId: string;
  platform: Platform;
  credibility: number; // 0..100
  isIncumbent: boolean;
  effortBySegment: Record<string, number>;
  constituencyId: string;
}

export interface EngineConstituency {
  id: string;
  registeredVoters: number;
  conditions?: Conditions | null;
}

export interface ElectionInput {
  candidates: EngineCandidate[];
  constituencies: EngineConstituency[];
}

export interface ConstituencyResult {
  constituencyId: string;
  winnerCandidateId: string | null;
  winnerPartyId: string | null;
  votes: Record<string, number>;
  segmentShares: Record<string, Record<string, number>>;
}

export interface ElectionResult {
  perConstituency: ConstituencyResult[];
  perCandidate: { candidateId: string; partyId: string; votes: number; seatRank: number; wonSeat: boolean; constituencyId: string }[];
  perParty: { partyId: string; votes: number; seats: number }[];
  totalSeatsAllocated: number;
}

export function computeFit(platform: Platform, segment: VoterSegment): number {
  let distSq = 0;
  for (const axis of AXES) {
    const priority = segment.priorities[axis] || 0;
    const pVal = platform[axis] || 0;
    const iVal = segment.ideal[axis] || 0;
    distSq += priority * Math.pow((pVal - iVal) / 100, 2);
  }
  const dist = Math.sqrt(distSq);
  const fit = Math.pow(1 - dist, POL_FIT_EXP);
  return Math.max(0, fit);
}

export function computeReach(effort: number): number {
  if (effort < 0) effort = 0;
  return POL_REACH_MIN + (POL_REACH_MAX - POL_REACH_MIN) * (effort / (effort + POL_REACH_HALF_SAT));
}

/** Deterministic hash → float in [-1, 1] from a string seed. No Math.random(). */
function seededNoise(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // Map signed int32 to [-1, 1]
  return h / 2147483647;
}

export function computeSegmentShares(candidates: EngineCandidate[], segment: VoterSegment): Record<string, number> {
  const rawScores: Record<string, number> = {};
  let totalRaw = 0;

  for (const c of candidates) {
    const fit = computeFit(c.platform, segment);
    const effortInSegment = c.effortBySegment[segment.key] || 0;
    const reach = computeReach(effortInSegment);
    const credMult = 0.5 + 0.5 * (c.credibility / 100);
    const incMult = c.isIncumbent ? POL_INCUMBENCY_BONUS : 1.0;
    // Seeded deterministic jitter: same candidateId+segmentKey always gives same noise
    const jitter = POL_VOTE_JITTER > 0
      ? 1 + POL_VOTE_JITTER * seededNoise(`${c.candidateId}|${segment.key}`)
      : 1;
    const raw = fit * reach * credMult * incMult * jitter;

    rawScores[c.candidateId] = raw;
    totalRaw += raw;
  }

  const shares: Record<string, number> = {};
  for (const c of candidates) {
    shares[c.candidateId] = totalRaw > 0 ? (rawScores[c.candidateId] / totalRaw) : 0;
  }

  return shares;
}

export function computeTurnout(
  segment: VoterSegment,
  candidates: EngineCandidate[],
  conditions?: Conditions | null
): number {
  if (candidates.length === 0) return 0;
  let totalReach = 0;
  for (const c of candidates) {
    const effortInSegment = c.effortBySegment[segment.key] || 0;
    totalReach += computeReach(effortInSegment);
  }
  const avgReach = totalReach / candidates.length;
  const base = POL_BASE_TURNOUT * (0.8 + 0.4 * avgReach);
  // Conditions (GDD $5/$11) scale turnout per bloc; 1.0 when no conditions given.
  return base * conditionTurnoutMultiplier(segment.key, conditions);
}

export function computeVotesForConstituency(
  constituency: EngineConstituency,
  candidates: EngineCandidate[]
): { votes: Record<string, number>; shares: Record<string, Record<string, number>> } {
  const votes: Record<string, number> = {};
  for (const c of candidates) {
    votes[c.candidateId] = 0;
  }

  const segmentShares: Record<string, Record<string, number>> = {};

  for (const segment of SEGMENTS) {
    const turnout = computeTurnout(segment, candidates, constituency.conditions);
    const shares = computeSegmentShares(candidates, segment);
    segmentShares[segment.key] = shares;
    
    const segmentVoters = segment.size * constituency.registeredVoters * turnout;

    for (const c of candidates) {
      votes[c.candidateId] += segmentVoters * (shares[c.candidateId] || 0);
    }
  }

  for (const c of candidates) {
    votes[c.candidateId] = Math.round(votes[c.candidateId]);
  }

  return { votes, shares: segmentShares };
}

export function runElection(input: ElectionInput): ElectionResult {
  const perConstituency: ConstituencyResult[] = [];
  const candidateResults: Record<string, { partyId: string; votes: number; wonSeat: boolean; constituencyId: string }> = {};
  const partyVotes: Record<string, number> = {};
  const partySeats: Record<string, number> = {};
  let totalSeatsAllocated = 0;

  for (const c of input.candidates) {
    candidateResults[c.candidateId] = { partyId: c.partyId, votes: 0, wonSeat: false, constituencyId: c.constituencyId };
    partyVotes[c.partyId] = 0;
    partySeats[c.partyId] = 0;
  }

  // 1. Run First Past the Post (FPTP) in each constituency
  for (const constituency of input.constituencies) {
    const candsInConst = input.candidates.filter(c => c.constituencyId === constituency.id);
    const { votes, shares } = computeVotesForConstituency(constituency, candsInConst);
    
    let winnerId: string | null = null;
    let winnerParty: string | null = null;
    let maxVotes = -1;

    for (const c of candsInConst) {
      const v = votes[c.candidateId];
      candidateResults[c.candidateId].votes += v;
      partyVotes[c.partyId] += v;
      
      if (v > maxVotes) {
        maxVotes = v;
        winnerId = c.candidateId;
        winnerParty = c.partyId;
      } else if (v === maxVotes && winnerId !== null) {
        // tie breaker by id
        if (c.candidateId < winnerId) {
          winnerId = c.candidateId;
          winnerParty = c.partyId;
        }
      }
    }

    if (winnerId && winnerParty) {
      candidateResults[winnerId].wonSeat = true;
      partySeats[winnerParty]++;
      totalSeatsAllocated++;
    }

    perConstituency.push({
      constituencyId: constituency.id,
      winnerCandidateId: winnerId,
      winnerPartyId: winnerParty,
      votes,
      segmentShares: shares
    });
  }

  // 2. Format results
  const perCandidate = [];
  for (const [candidateId, data] of Object.entries(candidateResults)) {
    perCandidate.push({
      candidateId,
      partyId: data.partyId,
      votes: data.votes,
      seatRank: data.wonSeat ? 1 : 2, // FPTP means rank 1 won, rank 2+ lost
      wonSeat: data.wonSeat,
      constituencyId: data.constituencyId
    });
  }

  const perParty = [];
  for (const [partyId, votes] of Object.entries(partyVotes)) {
    perParty.push({
      partyId,
      votes,
      seats: partySeats[partyId] || 0
    });
  }

  return {
    perConstituency,
    perCandidate,
    perParty,
    totalSeatsAllocated
  };
}
