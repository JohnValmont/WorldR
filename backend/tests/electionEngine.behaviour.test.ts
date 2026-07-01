import assert from 'assert';
import {
  computeFit,
  computeReach,
  computeSegmentShares,
  computeTurnout,
  computeVotes,
  allocateSeatsDHondt,
  runElection,
  EngineCandidate,
  ElectionInput
} from '../src/api/services/electionEngine';
import {
  SEGMENTS,
  AXES,
  Platform,
  POL_REACH_HALF_SAT
} from '../src/api/constants/politics';

function runTests() {
  const seg = SEGMENTS[0]; // Industrial Workers

  function createCandidate(id: string, platform: Platform, cred: number, effort: number, isIncumbent = false): EngineCandidate {
    return {
      candidateId: id,
      partyId: 'party_' + id,
      platform,
      credibility: cred,
      isIncumbent,
      effortBySegment: { [seg.key]: effort }
    };
  }

  console.log('Running test 1...');
  {
    const idealCandidate = createCandidate('c1', { ...seg.ideal }, 50, 10);
    const farPlatform: Platform = { taxation: 100, labour: 0, investment: 0, trade: 100, stability: 0 };
    const farCandidate = createCandidate('c2', farPlatform, 50, 10);
    
    const shares = computeSegmentShares([idealCandidate, farCandidate], seg);
    assert(shares['c1'] > shares['c2'], 'Ideal platform should beat far platform');
  }

  console.log('Running test 2...');
  {
    const baseCandidate = createCandidate('c1', { ...seg.ideal }, 50, POL_REACH_HALF_SAT);
    const competitor = createCandidate('c2', { ...seg.ideal }, 50, POL_REACH_HALF_SAT);

    const input1: ElectionInput = { candidates: [baseCandidate, competitor], registeredVoters: 1000000 };
    const res1 = runElection(input1);
    const share1 = res1.segmentShares[seg.key]['c1'];

    const doubleEffortCandidate = createCandidate('c1', { ...seg.ideal }, 50, POL_REACH_HALF_SAT * 2);
    const input2: ElectionInput = { candidates: [doubleEffortCandidate, competitor], registeredVoters: 1000000 };
    const res2 = runElection(input2);
    const share2 = res2.segmentShares[seg.key]['c1'];

    assert(share2 > share1, 'Double effort should increase share');
    const ratio = share2 / share1;
    assert(ratio > 1.0 && ratio < 2.0, `Diminishing returns broken: ratio is ${ratio}`);
  }

  console.log('Running test 3...');
  {
    const baseCandidate = createCandidate('c1', { ...seg.ideal }, 50, 10);
    const competitor = createCandidate('c2', { ...seg.ideal }, 50, 10);
    
    const shares1 = computeSegmentShares([baseCandidate, competitor], seg);
    const share1 = shares1['c1'];

    const highCredCandidate = createCandidate('c1', { ...seg.ideal }, 100, 10);
    const shares2 = computeSegmentShares([highCredCandidate, competitor], seg);
    const share2 = shares2['c1'];

    const ratio = share2 / share1;
    assert(ratio > 1.1 && ratio < 1.6, `Credibility ratio out of bounds: ${ratio}`);
  }

  console.log('Running test 4...');
  {
    const c1 = createCandidate('c1', { ...seg.ideal }, 50, 10);
    const c2 = createCandidate('c2', { ...seg.ideal }, 80, 20);
    const c3 = createCandidate('c3', { ...seg.ideal }, 20, 5);

    const shares = computeSegmentShares([c1, c2, c3], seg);
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    assert(Math.abs(sum - 1.0) < 1e-9, 'Shares do not sum to 1.0');
  }

  console.log('Running test 5...');
  {
    const seats = allocateSeatsDHondt({
      p1: 20000,
      p2: 10000,
      p3: 5000
    }, 61);

    const totalSeats = Object.values(seats).reduce((a, b) => a + b, 0);
    assert(totalSeats === 61, 'Should allocate exactly 61 seats');
    assert(seats['p1'] >= seats['p2'], 'Party with 2x votes should get >= seats');
    assert(seats['p1'] > seats['p2'], 'Party with 2x votes should strictly get more seats');
  }

  console.log('Running test 6...');
  {
    const input: ElectionInput = {
      registeredVoters: 1600000,
      candidates: [
        createCandidate('c1', { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 }, 60, 20),
        createCandidate('c2', { taxation: 60, labour: 40, investment: 40, trade: 60, stability: 60 }, 50, 15)
      ]
    };

    const res1 = runElection(input);
    const res2 = runElection(JSON.parse(JSON.stringify(input)));

    assert(JSON.stringify(res1) === JSON.stringify(res2), 'Results are not identical');
  }

  console.log('Running test 8...');
  {
    const c1 = createCandidate('c1', { ...seg.ideal }, 50, 10);
    const c2 = createCandidate('c2', { ...seg.ideal }, 50, 10);

    const turnout1 = computeTurnout(seg, [c1, c2]);

    const c1High = createCandidate('c1', { ...seg.ideal }, 50, 1000);
    const turnout2 = computeTurnout(seg, [c1High, c2]);

    assert(turnout2 >= turnout1, 'Turnout should not decrease with higher reach');
  }

  console.log('All tests passed!');
}

runTests();
