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
  POL_VOTE_JITTER,
  POL_CONDITION_TURNOUT_SENSITIVITY,
  POL_CONDITION_TURNOUT_MAX_SWING
} from '../constants/politics';
import { NationalStats } from './nationalEconomy.service';
import { NationalStat } from '../constants/macroEconomy';

export interface EngineCandidate {
  candidateId: string;
  partyId: string;
  platform: Platform;
  credibility: number; // 0..100
  isIncumbent: boolean;
  effortBySegment: Record<string, number>;
  constituencyId: string;
  /**
   * Optional final multiplier on this candidate's appeal. Used for government
   * approval: governing parties gain or lose votes with the state of the economy.
   */
  voteMultiplier?: number;
}

export interface EngineConstituency {
  id: string;
  registeredVoters: number;
  conditions: NationalStats | null;
  /**
   * Seats this district elects (district magnitude). Default 1 = first past the
   * post. >1 = seats shared between parties by their district vote (D'Hondt).
   */
  seats?: number;
  /**
   * Multipliers on each voter segment's national size for this district, e.g.
   * { industrial_workers: 1.6 } for a factory town. Normalised internally, so
   * only relative values matter. Missing keys = 1.
   */
  segmentWeights?: Record<string, number>;
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
  /** Seats won in this district per party (sums to the district's seats). */
  seatsByParty: Record<string, number>;
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
    const voteMult = Number.isFinite(c.voteMultiplier) ? Math.max(0, c.voteMultiplier as number) : 1;
    const raw = fit * reach * credMult * incMult * jitter * voteMult;

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
  conditions: NationalStats | null
): number {
  if (candidates.length === 0) return 0;

  let totalReach = 0;
  for (const c of candidates) {
    const effortInSegment = c.effortBySegment[segment.key] || 0;
    totalReach += computeReach(effortInSegment);
  }
  const avgReach = totalReach / candidates.length;
  const base = POL_BASE_TURNOUT * (0.8 + 0.4 * avgReach);
  
  // Conditions Turnout Multiplier
  let mult = 1.0;
  if (conditions) {
    const sensitivity = POL_CONDITION_TURNOUT_SENSITIVITY[segment.key];
    if (sensitivity) {
      let swing = 0;
      for (const [k, factor] of Object.entries(sensitivity)) {
        const statKey = k as NationalStat;
        const val = conditions[statKey] ?? 50;
        // Deviation from neutral (50) on a scale of -5 to +5 to match the old 0-10 scale magnitude
        const deviation = (val - 50) / 10;
        swing += deviation * (factor as number);
      }
      swing = Math.max(-POL_CONDITION_TURNOUT_MAX_SWING, Math.min(POL_CONDITION_TURNOUT_MAX_SWING, swing));
      mult = 1.0 + swing;
    }
  }
  return base * mult;
}

/**
 * Each segment's share of a district's voters: national size x district weight,
 * normalised to sum to 1. With no weights this is exactly the national mix.
 */
export function districtSegmentSizes(weights?: Record<string, number>): Record<string, number> {
  const raw: Record<string, number> = {};
  let total = 0;
  for (const seg of SEGMENTS) {
    const w = weights && Number.isFinite(weights[seg.key]) ? Math.max(0, weights[seg.key]) : 1;
    raw[seg.key] = seg.size * w;
    total += raw[seg.key];
  }
  for (const k of Object.keys(raw)) raw[k] = total > 0 ? raw[k] / total : 0;
  return raw;
}

/**
 * D'Hondt: hand out `seats` one at a time to the party with the highest
 * votes / (seatsAlreadyWon + 1). Ties go to the larger vote, then the lower id,
 * so results are deterministic.
 */
export function allocateSeatsDHondt(votes: Record<string, number>, seats: number): Record<string, number> {
  const out: Record<string, number> = {};
  const ids = Object.keys(votes).sort();
  for (const id of ids) out[id] = 0;
  if (seats <= 0 || ids.length === 0) return out;
  for (let s = 0; s < seats; s++) {
    let best: string | null = null;
    let bestQ = -1;
    for (const id of ids) {
      const v = Math.max(0, votes[id] || 0);
      if (v <= 0) continue;
      const q = v / (out[id] + 1);
      if (q > bestQ || (q === bestQ && best !== null && v > (votes[best] || 0))) {
        best = id;
        bestQ = q;
      }
    }
    if (best === null) break; // nobody has any votes
    out[best]++;
  }
  return out;
}

/**
 * Split `total` seats across districts in proportion to their voters (largest
 * remainder / Hamilton), with every district getting at least `minPerDistrict`.
 */
export function apportionSeats(voters: number[], total: number, minPerDistrict = 1): number[] {
  const n = voters.length;
  if (n === 0) return [];
  const floorTotal = Math.max(0, total - minPerDistrict * n);
  const sum = voters.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const quotas = voters.map(v => (Math.max(0, v) / sum) * floorTotal);
  const seats = quotas.map(q => Math.floor(q));
  let left = floorTotal - seats.reduce((a, b) => a + b, 0);
  const order = quotas.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; k < order.length && left > 0; k++, left--) seats[order[k].i]++;
  return seats.map(s => s + minPerDistrict);
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
  const sizes = districtSegmentSizes(constituency.segmentWeights);

  for (const segment of SEGMENTS) {
    const turnout = computeTurnout(segment, candidates, constituency.conditions);
    const shares = computeSegmentShares(candidates, segment);
    segmentShares[segment.key] = shares;
    
    const segmentVoters = sizes[segment.key] * constituency.registeredVoters * turnout;

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

  // 1. In each district: count votes, then share the district's seats between
  //    parties by D'Hondt. A 1-seat district is plain first-past-the-post.
  for (const constituency of input.constituencies) {
    const candsInConst = input.candidates.filter(c => c.constituencyId === constituency.id);
    const { votes, shares } = computeVotesForConstituency(constituency, candsInConst);
    const districtSeats = Math.max(1, Math.round(constituency.seats ?? 1));

    let winnerId: string | null = null;
    let winnerParty: string | null = null;
    let maxVotes = -1;
    const partyVotesHere: Record<string, number> = {};
    const bestCandOfParty: Record<string, string> = {};

    for (const c of candsInConst) {
      const v = votes[c.candidateId];
      candidateResults[c.candidateId].votes += v;
      partyVotes[c.partyId] += v;
      partyVotesHere[c.partyId] = (partyVotesHere[c.partyId] || 0) + v;
      const prevBest = bestCandOfParty[c.partyId];
      if (!prevBest || v > votes[prevBest] || (v === votes[prevBest] && c.candidateId < prevBest)) {
        bestCandOfParty[c.partyId] = c.candidateId;
      }

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

    const seatsByParty = allocateSeatsDHondt(partyVotesHere, districtSeats);
    for (const [pid, n] of Object.entries(seatsByParty)) {
      if (n <= 0) continue;
      partySeats[pid] = (partySeats[pid] || 0) + n;
      totalSeatsAllocated += n;
      // The party's lead candidate in this district takes its first seat here.
      const lead = bestCandOfParty[pid];
      if (lead) candidateResults[lead].wonSeat = true;
    }

    perConstituency.push({
      constituencyId: constituency.id,
      winnerCandidateId: winnerId,
      winnerPartyId: winnerParty,
      votes,
      segmentShares: shares,
      seatsByParty,
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
