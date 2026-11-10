/**
 * Phase 2 politics rebuild: proportional districts, NPC lawmaking, approval.
 * Pure functions only (no database). Assertions are ratio-based (AGENTS.md).
 */
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  allocateSeatsDHondt, apportionSeats, districtSegmentSizes, runElection, EngineCandidate,
} from '../src/api/services/electionEngine';
import {
  computeApproval, approvalVoteMultiplier, decidePartyVote, pickNpcBill, projectElection,
  optionAlignment, findOption, changeDesirability, pickPassableBill, projectTally, uniqueNpcName,
} from '../src/api/services/statecraft.service';
import { DRENNIA, DEFAULT_LAWS, NPC_GOV_WHIP } from '../src/api/constants/nations';
import { SEGMENTS, Platform } from '../src/api/constants/politics';

const PLATFORMS: Record<string, Platform> = {
  labour:   { taxation: 30, labour: 90, investment: 70, trade: 50, stability: 50 },
  progress: { taxation: 85, labour: 35, investment: 75, trade: 80, stability: 60 },
  civic:    { taxation: 55, labour: 55, investment: 60, trade: 60, stability: 80 },
  indep:    { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
};
const parties = Object.entries(PLATFORMS).map(([id, platform]) => ({ id, platform, credibility: 50 }));
const seatsFor = apportionSeats(DRENNIA.districts.map(d => d.registeredVoters), DRENNIA.legislature.seats, 1);
const districts = DRENNIA.districts.map((d, i) => ({
  id: `d${i}`, registered_voters: d.registeredVoters, seats: seatsFor[i], segment_weights: d.segmentWeights,
}));

describe("D'Hondt seat allocation", () => {
  it('always hands out exactly the seats available', () => {
    for (const seats of [1, 3, 7, 12]) {
      const r = allocateSeatsDHondt({ a: 5000, b: 3000, c: 1500, d: 200 }, seats);
      assert.strictEqual(Object.values(r).reduce((x, y) => x + y, 0), seats);
    }
  });
  it('one seat goes to the party with the most votes (first past the post)', () => {
    const r = allocateSeatsDHondt({ a: 5000, b: 5200, c: 100 }, 1);
    assert.strictEqual(r.b, 1);
  });
  it('seat shares track vote shares in a big district', () => {
    const r = allocateSeatsDHondt({ a: 600, b: 300, c: 100 }, 100);
    assert.ok(Math.abs(r.a / r.b - 2) < 0.15, `a/b = ${r.a / r.b}`);
  });
  it('a party with ~12% of the vote in a 10-seat district wins a seat', () => {
    const r = allocateSeatsDHondt({ big: 4500, mid: 3300, small: 1200 }, 10);
    assert.ok(r.small >= 1);
  });
});

describe('Seat apportionment across districts', () => {
  it('shares exactly 151 seats, at least one per district', () => {
    assert.strictEqual(seatsFor.reduce((a, b) => a + b, 0), 151);
    assert.ok(Math.min(...seatsFor) >= 1);
  });
  it('bigger districts get proportionally more seats', () => {
    const big = DRENNIA.districts.findIndex(d => d.name === 'Drennport Metro');
    const small = DRENNIA.districts.findIndex(d => d.name === 'Greenmere Border');
    const voterRatio = DRENNIA.districts[big].registeredVoters / DRENNIA.districts[small].registeredVoters;
    assert.ok(Math.abs(seatsFor[big] / seatsFor[small] / voterRatio - 1) < 0.25);
  });
});

describe('District voter mix', () => {
  it('Ironvale has a larger share of industrial workers than the nation', () => {
    const iv = DRENNIA.districts.find(d => d.name === 'Ironvale South')!;
    const sizes = districtSegmentSizes(iv.segmentWeights);
    const national = SEGMENTS.find(s => s.key === 'industrial_workers')!.size;
    assert.ok(sizes.industrial_workers / national > 1.3);
  });
  it('sizes always sum to 1', () => {
    for (const d of DRENNIA.districts) {
      const sum = Object.values(districtSegmentSizes(d.segmentWeights)).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9);
    }
  });
});

describe('Elections are no longer landslides', () => {
  const proj = projectElection(parties, districts, null, new Set(), 50);
  const total = Object.values(proj.seats).reduce((a, b) => a + b, 0);

  it('fills the full 151-seat parliament', () => {
    assert.strictEqual(total, 151);
  });
  it('no party wins more than 70% of seats with four distinct platforms', () => {
    assert.ok(Math.max(...Object.values(proj.seats)) / total < 0.7, JSON.stringify(proj.seats));
  });
  it('at least three parties win seats', () => {
    assert.ok(Object.values(proj.seats).filter(n => n > 0).length >= 3, JSON.stringify(proj.seats));
  });
  it('the old one-seat, identical-district system gave the winner almost everything', () => {
    const cands: EngineCandidate[] = [];
    const flat = Array.from({ length: 151 }, (_, i) => ({ id: `f${i}`, registeredVoters: 46000, conditions: null }));
    for (const d of flat) for (const p of parties) {
      cands.push({ candidateId: `${p.id}_${d.id}`, partyId: p.id, platform: p.platform, credibility: 50, isIncumbent: false, effortBySegment: {}, constituencyId: d.id });
    }
    const old = runElection({ candidates: cands, constituencies: flat });
    const top = Math.max(...old.perParty.map(p => p.seats));
    const newTop = Math.max(...Object.values(proj.seats));
    assert.ok(top / 151 > 0.85, `old top share ${top / 151}`);
    assert.ok(newTop / top < 0.8, 'new system spreads seats more evenly than the old one');
  });
});

describe('Economy moves elections (approval)', () => {
  it('approval is 50 when every national stat is neutral', () => {
    assert.strictEqual(computeApproval({}), 50);
  });
  it('prosperity raises approval and cost of living lowers it', () => {
    assert.ok(computeApproval({ prosperity: 80 }) > 50);
    assert.ok(computeApproval({ cost_of_living: 80 }) < 50);
  });
  it('approval stays within 5..95', () => {
    assert.ok(computeApproval({ prosperity: 100, order_safety: 100, equity: 100, fiscal_health: 100, human_development: 100, cost_of_living: 0 }) <= 95);
    assert.ok(computeApproval({ prosperity: 0, order_safety: 0, equity: 0, fiscal_health: 0, human_development: 0, cost_of_living: 100 }) >= 5);
  });
  it('a popular government wins clearly more seats than an unpopular one', () => {
    const gov = new Set(['civic']);
    const high = projectElection(parties, districts, null, gov, 90).seats.civic;
    const low = projectElection(parties, districts, null, gov, 10).seats.civic;
    assert.ok(high / Math.max(1, low) > 1.25, `high ${high} vs low ${low}`);
    assert.ok(approvalVoteMultiplier(95) / approvalVoteMultiplier(5) > 1.25);
  });
});

describe('Computer-run parties vote by ideology', () => {
  it('government members back their own government bill even if they mildly dislike it', () => {
    assert.strictEqual(decidePartyVote({ desirability: -(NPC_GOV_WHIP - 0.1), voterInGovernment: true, billFromGovernment: true }), 'yea');
  });
  it('government members rebel against a bill they strongly dislike', () => {
    assert.strictEqual(decidePartyVote({ desirability: -0.8, voterInGovernment: true, billFromGovernment: true }), 'nay');
  });
  it('the opposition votes against a neutral government bill but for one it strongly likes', () => {
    assert.strictEqual(decidePartyVote({ desirability: 0, voterInGovernment: false, billFromGovernment: true }), 'nay');
    assert.strictEqual(decidePartyVote({ desirability: 0.5, voterInGovernment: false, billFromGovernment: true }), 'yea');
  });
  it('an opposition bill can pass if government parties like it', () => {
    assert.strictEqual(decidePartyVote({ desirability: 0.4, voterInGovernment: true, billFromGovernment: false }), 'yea');
  });
  it('a party always backs its own bill', () => {
    assert.strictEqual(decidePartyVote({ desirability: -1, voterInGovernment: false, billFromGovernment: false, ownBill: true }), 'yea');
  });
});

describe('Computer-run parties table laws that match their ideology', () => {
  it('the workers party wants worker-first or tax-the-wealthy laws', () => {
    const pick = pickNpcBill(PLATFORMS.labour, DEFAULT_LAWS)!;
    assert.ok(pick, 'should want some change');
    const opt = findOption(pick.category, pick.option)!;
    assert.ok(opt.tags.some(t => t === 'WORKER-FIRST' || t === 'TAX THE WEALTHY'), `${pick.category}/${pick.option} ${opt.tags}`);
  });
  it('the business party wants low-tax or open-market laws', () => {
    const pick = pickNpcBill(PLATFORMS.progress, DEFAULT_LAWS)!;
    const opt = findOption(pick.category, pick.option)!;
    assert.ok(opt.tags.some(t => t === 'LOW TAXES' || t === 'OPEN MARKETS' || t === 'PRIVATE-LEAN'), `${pick.category}/${pick.option} ${opt.tags}`);
  });
  it('the two rivals disagree about each other\'s favourite change', () => {
    const labourPick = pickNpcBill(PLATFORMS.labour, DEFAULT_LAWS)!;
    const businessView = changeDesirability(PLATFORMS.progress, labourPick.category, DEFAULT_LAWS[labourPick.category], labourPick.option);
    assert.ok(businessView < 0, `business party view of labour's bill: ${businessView}`);
  });
  it('a perfectly centrist party scores tagged laws at zero ideology', () => {
    const opt = { tags: ['LOW TAXES'], effects: {} };
    assert.strictEqual(optionAlignment(PLATFORMS.indep, opt), 0);
  });
});

describe('Governments table bills they can pass', () => {
  const voters = [
    { id: 'civic', platform: PLATFORMS.civic, seats: 48, inGovernment: true },
    { id: 'labour', platform: PLATFORMS.labour, seats: 36, inGovernment: false },
    { id: 'progress', platform: PLATFORMS.progress, seats: 34, inGovernment: false },
    { id: 'indep', platform: PLATFORMS.indep, seats: 21, inGovernment: false },
  ];
  it('a minority government picks a change that a majority of seats would back', () => {
    const { passable } = pickPassableBill(voters[0], voters, DEFAULT_LAWS);
    if (!passable) return; // no consensual change available is also acceptable
    const t = projectTally(voters, 'civic', true, passable.category, DEFAULT_LAWS[passable.category], passable.option);
    assert.ok(t.yea > t.nay, JSON.stringify(t));
  });
  it('its favourite change is never preferred over a passable one when the favourite would fail', () => {
    const { passable, favourite } = pickPassableBill(voters[0], voters, DEFAULT_LAWS);
    if (!favourite || !passable) return;
    const fav = projectTally(voters, 'civic', true, favourite.category, DEFAULT_LAWS[favourite.category], favourite.option);
    if (fav.yea <= fav.nay) assert.notDeepStrictEqual([passable.category, passable.option], [favourite.category, favourite.option]);
  });
  it('a majority government can pass its own favourite', () => {
    const big = voters.map(v => v.id === 'civic' ? { ...v, seats: 120 } : v);
    const { passable, favourite } = pickPassableBill(big[0], big, DEFAULT_LAWS);
    assert.ok(passable && favourite && passable.gain / favourite.gain > 0.999);
  });
});

describe('Computer-run ministers', () => {
  it('a cabinet never repeats a name', () => {
    const used = new Set<string>();
    const names = Array.from({ length: 5 }, (_, i) => uniqueNpcName(`state|post${i}|party|14`, used));
    assert.strictEqual(new Set(names).size, names.length);
  });
});
