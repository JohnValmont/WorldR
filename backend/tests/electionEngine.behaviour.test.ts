/**
 * The real election engine (services/electionEngine.ts): district votes, then
 * each district's seats shared by D'Hondt. Pure and deterministic, no database.
 * Rewritten for the district engine; the old version targeted a national pool
 * that no longer exists.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateSeatsDHondt, apportionSeats, computeFit, computeReach, computeSegmentShares, runElection,
  EngineCandidate, EngineConstituency,
} from '../src/api/services/electionEngine';
import { SEGMENTS, Platform, POL_REACH_HALF_SAT } from '../src/api/constants/politics';

const seg = SEGMENTS[0];
const far: Platform = { taxation: 100, labour: 0, investment: 0, trade: 100, stability: 0 };
const allEffort = (e: number) => Object.fromEntries(SEGMENTS.map(s => [s.key, e]));
const cand = (id: string, party: string, district: string, platform: Platform, effort = POL_REACH_HALF_SAT, cred = 50): EngineCandidate => ({
  candidateId: id, partyId: party, platform, credibility: cred, isIncumbent: false, effortBySegment: allEffort(effort), constituencyId: district,
});
const district = (id: string, seats: number, voters = 100_000): EngineConstituency => ({ id, registeredVoters: voters, conditions: null, seats });

describe('Voter appeal', () => {
  it('a platform at the group\'s ideal fits better than a far one', () => {
    assert.ok(computeFit({ ...seg.ideal }, seg) > computeFit(far, seg));
    const shares = computeSegmentShares([cand('a', 'A', 'd', { ...seg.ideal }), cand('b', 'B', 'd', far)], seg);
    assert.ok(shares.a > shares.b);
    assert.ok(Math.abs(shares.a + shares.b - 1) < 1e-9, 'shares sum to 1');
  });
  it('campaign effort has diminishing returns', () => {
    const r1 = computeReach(POL_REACH_HALF_SAT), r2 = computeReach(POL_REACH_HALF_SAT * 2), r0 = computeReach(0);
    assert.ok(r2 > r1 && r1 > r0);
    assert.ok((r2 - r1) < (r1 - r0), 'the second dose of effort adds less than the first');
    assert.equal(computeReach(-5), computeReach(0), 'negative effort counts as none');
  });
  it('more credibility wins more of a group, all else equal', () => {
    const shares = computeSegmentShares([cand('a', 'A', 'd', { ...seg.ideal }, 10, 80), cand('b', 'B', 'd', { ...seg.ideal }, 10, 40)], seg);
    assert.ok(shares.a > shares.b);
  });
});

describe('D\'Hondt seat sharing', () => {
  it('hands out exactly the seats available, roughly in proportion to votes', () => {
    const seats = allocateSeatsDHondt({ A: 60_000, B: 30_000, C: 10_000 }, 10);
    assert.equal(seats.A + seats.B + seats.C, 10);
    assert.ok(seats.A / seats.B >= 1.5 && seats.A / seats.B <= 3, `A:B ratio ${seats.A}:${seats.B}`);
  });
  it('a single-seat district is first past the post', () => {
    const seats = allocateSeatsDHondt({ A: 501, B: 499 }, 1);
    assert.deepEqual(seats, { A: 1, B: 0 });
  });
  it('nobody with no votes gets a seat', () => {
    assert.equal(allocateSeatsDHondt({ A: 0, B: 0 }, 5).A, 0);
  });
  it('apportioning seats to districts follows voters and gives every district one', () => {
    const out = apportionSeats([100, 300, 600], 20);
    assert.equal(out.reduce((a, b) => a + b, 0), 20);
    assert.ok(out[2] > out[1] && out[1] > out[0] && out[0] >= 1);
  });
});

describe('A whole election', () => {
  const input = () => ({
    constituencies: [district('north', 5), district('south', 3), district('east', 1)],
    candidates: [
      cand('a1', 'A', 'north', { ...seg.ideal }), cand('b1', 'B', 'north', far),
      cand('a2', 'A', 'south', { ...seg.ideal }), cand('b2', 'B', 'south', far),
      cand('a3', 'A', 'east', far), cand('b3', 'B', 'east', { ...seg.ideal }, POL_REACH_HALF_SAT * 3, 90),
    ],
  });
  it('fills every district\'s seats and no more', () => {
    const res = runElection(input());
    assert.equal(res.totalSeatsAllocated, 9);
    for (const d of res.perConstituency) {
      const want = input().constituencies.find(c => c.id === d.constituencyId)!.seats!;
      assert.equal(Object.values(d.seatsByParty).reduce((a, b) => a + b, 0), want, d.constituencyId);
    }
    assert.equal(res.perParty.reduce((a, p) => a + p.seats, 0), 9);
  });
  it('is deterministic: the same input gives the same result', () => {
    assert.deepEqual(runElection(input()), runElection(input()));
  });
  it('the party that fits voters better wins more seats overall', () => {
    const res = runElection(input());
    const seats = Object.fromEntries(res.perParty.map(p => [p.partyId, p.seats]));
    assert.ok(seats.A > seats.B, JSON.stringify(seats));
  });
  it('a candidate only competes in their own district', () => {
    const res = runElection(input());
    const east = res.perConstituency.find(d => d.constituencyId === 'east')!;
    assert.deepEqual(Object.keys(east.votes).sort(), ['a3', 'b3']);
  });
});
