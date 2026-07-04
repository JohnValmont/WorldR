import { SEGMENTS, POL_MAJORITY_SEATS, POL_COUNCIL_SEATS, POL_PULSE } from '../constants/politics';
import { ElectionResult } from './electionEngine';

/**
 * politics.pulse.ts — PURE feedback-layer derivation.
 *
 * Turns a raw election projection into an "engagement pulse": near-miss tension,
 * momentum, a named rival, loss-aversion (defend-your-seat) and per-segment
 * opportunity. It NEVER touches the election engine, the DB, time, or randomness.
 * All thresholds live in POL_PULSE (constants/politics.ts).
 */

export interface PulseParty {
  id: string;
  name: string;
  is_npc: boolean;
  leader_character_id: string | null;
}

export interface PulseContext {
  projection: ElectionResult;
  prevProjection?: ElectionResult | null;
  parties: PulseParty[];
  myPartyId?: string | null;
  myCandidateId?: string | null;
  heldSeatsByParty?: Record<string, number>;
}

export type SegmentStatus = 'winning' | 'contested' | 'losing' | 'none';

export interface SegmentPulse {
  key: string;
  label: string;
  myShare: number;
  leaderShare: number;
  leaderCandidateId: string | null;
  isMineLeading: boolean;
  /** how far behind the segment leader (>0), or margin over 2nd place when leading (>0) */
  gap: number;
  status: SegmentStatus;
  /** change in my share vs the previous month's projection */
  delta: number;
}

export interface PoliticalPulse {
  hasCandidacy: boolean;
  majoritySeats: number;
  totalSeats: number;
  standings: { partyId: string; name: string; seats: number; votes: number; isMine: boolean; isNpc: boolean }[];
  leadingParty: { partyId: string; name: string; seats: number; votes: number } | null;
  myParty: { partyId: string; name: string; seats: number; votes: number } | null;
  seatsFromMajority: number | null;
  momentum: { deltaSeats: number; direction: 'up' | 'down' | 'flat' } | null;
  rival: { partyId: string; name: string; seats: number; votes: number; seatGap: number; ahead: boolean; message: string } | null;
  defense: { heldSeats: number; projectedSeats: number; atRisk: number; message: string } | null;
  segments: SegmentPulse[];
  weakestSegment: SegmentPulse | null;
  banner: { tone: 'triumph' | 'tension' | 'danger' | 'neutral'; title: string; detail: string };
  callToAction: string | null;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function buildPulse(ctx: PulseContext): PoliticalPulse {
  const { projection, prevProjection, parties, myPartyId, myCandidateId, heldSeatsByParty } = ctx;

  const nameOf = new Map<string, PulseParty>();
  for (const p of parties) nameOf.set(p.id, p);

  // ── Standings (seats desc, then votes desc) ───────────────────────────────
  const standings = [...projection.perParty]
    .map(pp => ({
      partyId: pp.partyId,
      name: nameOf.get(pp.partyId)?.name || 'Unknown Party',
      seats: pp.seats,
      votes: pp.votes,
      isMine: !!myPartyId && pp.partyId === myPartyId,
      isNpc: nameOf.get(pp.partyId)?.is_npc ?? true
    }))
    .sort((a, b) => (b.seats - a.seats) || (b.votes - a.votes));

  const leadingParty = standings.length
    ? { partyId: standings[0].partyId, name: standings[0].name, seats: standings[0].seats, votes: standings[0].votes }
    : null;

  const mineStanding = standings.find(s => s.isMine) || null;
  const myParty = mineStanding
    ? { partyId: mineStanding.partyId, name: mineStanding.name, seats: mineStanding.seats, votes: mineStanding.votes }
    : null;

  const hasCandidacy = !!myPartyId && !!myCandidateId;

  // ── Near-miss: seats from a governing majority ────────────────────────────
  const seatsFromMajority = myParty ? Math.max(0, POL_MAJORITY_SEATS - myParty.seats) : null;

  // ── Momentum: change in my party's projected seats vs previous month ─────────
  let momentum: PoliticalPulse['momentum'] = null;
  if (myParty && prevProjection) {
    const prevSeats = prevProjection.perParty.find(p => p.partyId === myPartyId)?.seats ?? myParty.seats;
    const deltaSeats = myParty.seats - prevSeats;
    momentum = { deltaSeats, direction: deltaSeats > 0 ? 'up' : deltaSeats < 0 ? 'down' : 'flat' };
  }

  // ── Rival / nemesis: nearest party by seats (prefer one just ahead) ────────
  let rival: PoliticalPulse['rival'] = null;
  if (myParty) {
    let best: typeof standings[number] | null = null;
    let bestGap = Infinity;
    for (const s of standings) {
      if (s.partyId === myPartyId) continue;
      const gap = Math.abs(s.seats - myParty.seats);
      const ahead = s.seats >= myParty.seats;
      // tie-break: prefer a rival that is ahead of us (the one to catch)
      if (gap < bestGap || (gap === bestGap && ahead && !(best && best.seats >= myParty.seats))) {
        bestGap = gap;
        best = s;
      }
    }
    if (best && bestGap <= POL_PULSE.RIVAL_MAX_SEAT_GAP) {
      const ahead = best.seats >= myParty.seats;
      const message = ahead
        ? bestGap === 0
          ? `Dead heat with ${best.name} — every month counts.`
          : `${best.name} is ahead by ${bestGap} seat${bestGap === 1 ? '' : 's'}. Catch them.`
        : `You lead ${best.name} by ${bestGap} seat${bestGap === 1 ? '' : 's'} — don't let them close it.`;
      rival = { partyId: best.partyId, name: best.name, seats: best.seats, votes: best.votes, seatGap: bestGap, ahead, message };
    }
  }

  // ── Per-segment pulse ──────────────────────────────────────────────────────
  const segments: SegmentPulse[] = SEGMENTS.map(seg => {
    const shares = projection.segmentShares[seg.key] || {};
    let leaderCandidateId: string | null = null;
    let leaderShare = 0;
    let secondShare = 0;
    for (const [cid, share] of Object.entries(shares)) {
      if (share > leaderShare) {
        secondShare = leaderShare;
        leaderShare = share;
        leaderCandidateId = cid;
      } else if (share > secondShare) {
        secondShare = share;
      }
    }
    const myShare = (myCandidateId && shares[myCandidateId]) || 0;
    const isMineLeading = !!myCandidateId && leaderCandidateId === myCandidateId;

    let gap: number;
    let status: SegmentStatus;
    if (!hasCandidacy) {
      gap = 0;
      status = 'none';
    } else if (isMineLeading) {
      gap = myShare - secondShare; // margin over 2nd place
      status = gap >= POL_PULSE.SEGMENT_WIN_MARGIN ? 'winning' : 'contested';
    } else {
      gap = leaderShare - myShare; // how far behind
      status = gap > POL_PULSE.SEGMENT_CONTESTED_MARGIN ? 'losing' : 'contested';
    }

    let delta = 0;
    if (myCandidateId && prevProjection) {
      const prevShare = (prevProjection.segmentShares[seg.key] || {})[myCandidateId] || 0;
      const d = myShare - prevShare;
      delta = Math.abs(d) >= POL_PULSE.MOMENTUM_MIN_DELTA ? d : 0;
    }

    return { key: seg.key, label: seg.label, myShare, leaderShare, leaderCandidateId, isMineLeading, gap, status, delta };
  });

  // Weakest = best flip opportunity (closest segment I'm not winning), else thinnest lead to defend.
  let weakestSegment: SegmentPulse | null = null;
  if (hasCandidacy) {
    const notWinning = segments.filter(s => s.status === 'losing' || s.status === 'contested');
    const pool = notWinning.length ? notWinning : segments.filter(s => s.status === 'winning');
    weakestSegment = pool.reduce<SegmentPulse | null>((acc, s) => (!acc || s.gap < acc.gap ? s : acc), null);
  }

  // ── Loss aversion: seats held that are projected to flip away ──────────────
  let defense: PoliticalPulse['defense'] = null;
  if (myParty && heldSeatsByParty) {
    const heldSeats = heldSeatsByParty[myParty.partyId] || 0;
    const projectedSeats = myParty.seats;
    const atRisk = Math.max(0, heldSeats - projectedSeats);
    if (heldSeats > 0) {
      const message = atRisk > 0
        ? `You hold ${heldSeats} seats but are projected only ${projectedSeats}. ${atRisk} at risk — campaign to defend them.`
        : `Holding all ${heldSeats} of your seats — keep the pressure on.`;
      defense = { heldSeats, projectedSeats, atRisk, message };
    }
  }

  // ── Headline banner (server-computed so the client stays dumb) ─────────────
  let banner: PoliticalPulse['banner'];
  if (!hasCandidacy) {
    banner = {
      tone: 'neutral',
      title: 'The Council Awaits',
      detail: 'Found or join a party and declare candidacy to enter the race for Ironvale.'
    };
  } else if (defense && defense.atRisk > 0) {
    banner = {
      tone: 'danger',
      title: `${defense.atRisk} SEAT${defense.atRisk === 1 ? '' : 'S'} AT RISK`,
      detail: defense.message
    };
  } else if (myParty && seatsFromMajority === 0) {
    banner = {
      tone: 'triumph',
      title: 'MAJORITY IN HAND',
      detail: `${myParty.name} is projected to command ${myParty.seats}/${POL_COUNCIL_SEATS} seats — the Premiership is yours to take.`
    };
  } else if (seatsFromMajority !== null && seatsFromMajority <= POL_PULSE.NEAR_MISS_SEATS) {
    banner = {
      tone: 'tension',
      title: `${seatsFromMajority} SEAT${seatsFromMajority === 1 ? '' : 'S'} FROM POWER`,
      detail: rival?.ahead
        ? `${rival.name} stands between you and a majority. ${rival.message}`
        : `A governing majority is ${seatsFromMajority} seat${seatsFromMajority === 1 ? '' : 's'} away — press your campaign now.`
    };
  } else if (myParty) {
    banner = {
      tone: 'neutral',
      title: `${myParty.seats} SEAT${myParty.seats === 1 ? '' : 'S'} PROJECTED`,
      detail: rival ? rival.message : `Build reach across segments to climb toward ${POL_MAJORITY_SEATS}.`
    };
  } else {
    banner = {
      tone: 'neutral',
      title: 'CAMPAIGN UNDERWAY',
      detail: 'No seats projected yet — target a segment where your platform fits and build reach.'
    };
  }

  // ── Single sharpest next action ────────────────────────────────────────────
  let callToAction: string | null = null;
  if (weakestSegment) {
    if (weakestSegment.status === 'winning') {
      callToAction = `Your lead in ${weakestSegment.label} is only ${pct(weakestSegment.gap)} — shore it up before rivals move in.`;
    } else if (weakestSegment.status === 'contested') {
      callToAction = `${weakestSegment.label} is a coin-flip (${pct(weakestSegment.gap)} apart). One targeted Rally could tip it your way.`;
    } else {
      callToAction = `You trail in ${weakestSegment.label} by ${pct(weakestSegment.gap)}. Canvass or Rally there to flip votes.`;
    }
  }

  return {
    hasCandidacy,
    majoritySeats: POL_MAJORITY_SEATS,
    totalSeats: POL_COUNCIL_SEATS,
    standings,
    leadingParty,
    myParty,
    seatsFromMajority,
    momentum,
    rival,
    defense,
    segments,
    weakestSegment,
    banner,
    callToAction
  };
}
