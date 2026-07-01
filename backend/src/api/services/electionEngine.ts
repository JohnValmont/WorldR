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

export interface EngineCandidate {
  candidateId: string;
  partyId: string;
  platform: Platform;
  credibility: number; // 0..100
  isIncumbent: boolean;
  effortBySegment: Record<string, number>;
}

export interface ElectionInput {
  candidates: EngineCandidate[];
  registeredVoters: number;
}

export interface ElectionResult {
  perCandidate: { candidateId: string; partyId: string; votes: number; seatRank: number; wonSeat: boolean }[];
  perParty: { partyId: string; votes: number; seats: number }[];
  totalSeatsAllocated: number;
  segmentShares: Record<string, Record<string, number>>;
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

export function computeSegmentShares(candidates: EngineCandidate[], segment: VoterSegment): Record<string, number> {
  const rawScores: Record<string, number> = {};
  let totalRaw = 0;

  for (const c of candidates) {
    const fit = computeFit(c.platform, segment);
    const effortInSegment = c.effortBySegment[segment.key] || 0;
    const reach = computeReach(effortInSegment);
    const credMult = 0.5 + 0.5 * (c.credibility / 100);
    const incMult = c.isIncumbent ? POL_INCUMBENCY_BONUS : 1.0;
    const raw = fit * reach * credMult * incMult;

    rawScores[c.candidateId] = raw;
    totalRaw += raw;
  }

  const shares: Record<string, number> = {};
  for (const c of candidates) {
    shares[c.candidateId] = totalRaw > 0 ? (rawScores[c.candidateId] / totalRaw) : 0;
  }

  return shares;
}

export function computeTurnout(segment: VoterSegment, candidates: EngineCandidate[]): number {
  if (candidates.length === 0) return 0;
  let totalReach = 0;
  for (const c of candidates) {
    const effortInSegment = c.effortBySegment[segment.key] || 0;
    totalReach += computeReach(effortInSegment);
  }
  const avgReach = totalReach / candidates.length;
  return POL_BASE_TURNOUT * (0.8 + 0.4 * avgReach);
}

export function computeVotes(input: ElectionInput): Record<string, number> {
  const votes: Record<string, number> = {};
  for (const c of input.candidates) {
    votes[c.candidateId] = 0;
  }

  for (const segment of SEGMENTS) {
    const turnout = computeTurnout(segment, input.candidates);
    const shares = computeSegmentShares(input.candidates, segment);
    const segmentVoters = segment.size * input.registeredVoters * turnout;

    for (const c of input.candidates) {
      votes[c.candidateId] += segmentVoters * (shares[c.candidateId] || 0);
    }
  }

  for (const c of input.candidates) {
    votes[c.candidateId] = Math.round(votes[c.candidateId]);
  }

  return votes;
}

export function allocateSeatsDHondt(partyVotes: Record<string, number>, totalSeats: number = POL_COUNCIL_SEATS): Record<string, number> {
  const seats: Record<string, number> = {};
  for (const partyId of Object.keys(partyVotes)) {
    seats[partyId] = 0;
  }

  for (let i = 0; i < totalSeats; i++) {
    let winningParty = null;
    let maxQuotient = -1;

    for (const [partyId, votes] of Object.entries(partyVotes)) {
      const currentSeats = seats[partyId];
      const quotient = votes / (currentSeats + 1);

      if (quotient > maxQuotient) {
        maxQuotient = quotient;
        winningParty = partyId;
      } else if (quotient === maxQuotient && winningParty !== null) {
        // deterministic tie-break: 1. more total votes, 2. lexicographically smaller partyId
        const currentWinnerVotes = partyVotes[winningParty] || 0;
        if (votes > currentWinnerVotes) {
          winningParty = partyId;
        } else if (votes === currentWinnerVotes) {
          if (partyId < winningParty) {
            winningParty = partyId;
          }
        }
      }
    }

    if (winningParty !== null) {
      seats[winningParty]++;
    }
  }

  return seats;
}

export function runElection(input: ElectionInput): ElectionResult {
  const votes = computeVotes(input);
  
  const segmentShares: Record<string, Record<string, number>> = {};
  for (const segment of SEGMENTS) {
    segmentShares[segment.key] = computeSegmentShares(input.candidates, segment);
  }

  const partyVotes: Record<string, number> = {};
  for (const c of input.candidates) {
    partyVotes[c.partyId] = (partyVotes[c.partyId] || 0) + votes[c.candidateId];
  }

  const partySeats = allocateSeatsDHondt(partyVotes, POL_COUNCIL_SEATS);

  // Group candidates by party
  const candidatesByParty: Record<string, EngineCandidate[]> = {};
  for (const c of input.candidates) {
    if (!candidatesByParty[c.partyId]) candidatesByParty[c.partyId] = [];
    candidatesByParty[c.partyId].push(c);
  }

  const perCandidate: ElectionResult["perCandidate"] = [];
  const perParty: ElectionResult["perParty"] = [];
  let totalSeatsAllocated = 0;

  for (const [partyId, seatsWon] of Object.entries(partySeats)) {
    perParty.push({
      partyId,
      votes: partyVotes[partyId] || 0,
      seats: seatsWon
    });
    totalSeatsAllocated += seatsWon;

    const partyCands = candidatesByParty[partyId] || [];
    // Sort descending by votes, tie-break candidateId
    partyCands.sort((a, b) => {
      const vA = votes[a.candidateId];
      const vB = votes[b.candidateId];
      if (vA !== vB) return vB - vA;
      return a.candidateId.localeCompare(b.candidateId);
    });

    for (let i = 0; i < partyCands.length; i++) {
      const c = partyCands[i];
      const wonSeat = i < seatsWon;
      perCandidate.push({
        candidateId: c.candidateId,
        partyId: c.partyId,
        votes: votes[c.candidateId],
        seatRank: i + 1,
        wonSeat
      });
    }
  }

  return {
    perCandidate,
    perParty,
    totalSeatsAllocated,
    segmentShares
  };
}
