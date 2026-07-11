import assert from 'assert';
import {
  computeSegmentShares,
  computeFit,
  computeFatigueMultipliers,
  EngineCandidate
} from '../src/api/services/electionEngine';
import { SEGMENTS, Platform, POL_CROWDING_STRENGTH } from '../src/api/constants/politics';

// Task D — Anti-copycat (GDD $9): Crowding (vote-splitting near a bloc ideal)
// and Fatigue (diminishing returns on repeated action types). Pure/deterministic;
// no DB required.
function runTests() {
  const seg = SEGMENTS[0]; // industrial_workers

  function mk(id: string, platform: Platform, cred = 50, effort = 50): EngineCandidate {
    return {
      candidateId: id,
      partyId: 'p_' + id,
      platform,
      credibility: cred,
      isIncumbent: false,
      effortBySegment: { [seg.key]: effort },
    };
  }

  const far: Platform = { taxation: 20, labour: 20, investment: 90, trade: 90, stability: 90 };

  // ── Crowding ──────────────────────────────────────────────────────────────

  console.log('Crowding test 1 — copycats bleed to the differentiated party...');
  {
    // A owns the bloc; C is differentiated (poor fit here). Adding an A-copycat (B)
    // must raise C's share RELATIVE to A: a naive proportional split would leave
    // the C:A ratio unchanged, so a strict increase proves crowding is active.
    const A = mk('A', { ...seg.ideal });
    const B = mk('B', { ...seg.ideal }); // copycat of A
    const C = mk('C', far);

    const two = computeSegmentShares([A, C], seg);
    const three = computeSegmentShares([A, B, C], seg);

    const ratioTwo = two['C'] / two['A'];
    const ratioThree = three['C'] / three['A'];
    assert(
      ratioThree > ratioTwo,
      `Copycat should bleed A relative to C: ratio ${ratioThree} !> ${ratioTwo}`
    );
  }

  console.log('Crowding test 2 — a lone owner keeps near-full capture...');
  {
    // One party at the ideal vs two far rivals: crowding must NOT punish a
    // legitimate, uncontested winner.
    const A = mk('A', { ...seg.ideal });
    const C = mk('C', far);
    const D = mk('D', far);
    const shares = computeSegmentShares([A, C, D], seg);
    assert(shares['A'] > 0.7, `Lone owner should dominate, got ${shares['A']}`);
  }

  console.log('Crowding test 3 — per-bloc shares still normalise to 1...');
  {
    const A = mk('A', { ...seg.ideal });
    const B = mk('B', { ...seg.ideal });
    const C = mk('C', far);
    const shares = computeSegmentShares([A, B, C], seg);
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    assert(Math.abs(sum - 1.0) < 1e-9, `Shares do not sum to 1.0 (got ${sum})`);
  }

  console.log('Crowding test 4 — identical copycats split evenly (symmetry)...');
  {
    const A = mk('A', { ...seg.ideal });
    const B = mk('B', { ...seg.ideal });
    const shares = computeSegmentShares([A, B], seg);
    // Two identical parties differ only by deterministic jitter; near 50/50.
    assert(Math.abs(shares['A'] - shares['B']) < 0.1, `Copycats should split ~evenly: ${JSON.stringify(shares)}`);
  }

  console.log('Crowding test 5 — strength constant is a sane, active lever...');
  {
    assert(POL_CROWDING_STRENGTH > 0, 'POL_CROWDING_STRENGTH must be positive to be active');
  }

  // ── Fatigue ───────────────────────────────────────────────────────────────

  console.log('Fatigue test 1 — repeats inside the window decay geometrically...');
  {
    const m = computeFatigueMultipliers([0, 1, 2]);
    assert(m.length === 3, 'Expected 3 multipliers');
    assert(m[0] === 1, `First action should be full-strength, got ${m[0]}`);
    assert(m[1] < m[0] && m[2] < m[1], `Repeats should diminish: ${JSON.stringify(m)}`);
  }

  console.log('Fatigue test 2 — a gap longer than the window resets fatigue...');
  {
    // Window default is 3 months. Arc 10 is >3 after arc 0 → full-strength again.
    const m = computeFatigueMultipliers([0, 10, 11]);
    assert(m[0] === 1, 'First should be full-strength');
    assert(m[1] === 1, `Post-gap action should reset to full-strength, got ${m[1]}`);
    assert(m[2] < 1, `Immediate repeat after reset should decay, got ${m[2]}`);
  }

  console.log('Fatigue test 3 — window boundary is inclusive vs exclusive...');
  {
    // gap == window (3) still counts as "inside" (decays); gap > window resets.
    const inWindow = computeFatigueMultipliers([0, 3]);
    const outWindow = computeFatigueMultipliers([0, 4]);
    assert(inWindow[1] < 1, `Gap == window should still fatigue, got ${inWindow[1]}`);
    assert(outWindow[1] === 1, `Gap > window should reset, got ${outWindow[1]}`);
  }

  console.log('Fatigue test 4 — a single action is never fatigued...');
  {
    const m = computeFatigueMultipliers([5]);
    assert(m.length === 1 && m[0] === 1, `Single action must be full-strength, got ${JSON.stringify(m)}`);
  }

  console.log('Fatigue test 5 — deterministic (same input → same output)...');
  {
    const a = computeFatigueMultipliers([0, 1, 2, 8, 9]);
    const b = computeFatigueMultipliers([0, 1, 2, 8, 9]);
    assert(JSON.stringify(a) === JSON.stringify(b), 'Fatigue must be deterministic');
  }

  console.log('All crowding + fatigue tests passed!');
}

runTests();
