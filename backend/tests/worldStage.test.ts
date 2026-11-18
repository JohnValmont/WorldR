/**
 * The world stage (docs/WORLD_STAGE.md): career ladder, World Influence Index,
 * leadership contests, reader dispatches and banked energy. Pure rules only.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  careerRung, cleanText, contestResult, editionHeadline, influenceScore, InfluenceInput, ladderFor, nationFactor,
  pressClout, rankInfluence, RungInput, validateDispatch,
} from '../src/api/services/worldStage.rules';
import { bankedAp } from '../src/api/services/floor.rules';
import { AP_BANK_CAP, AP_MONTHLY_GRANT } from '../src/api/constants/politics';
import {
  DISPATCH_BODY_MAX, DISPATCH_ENDORSEMENTS_PER_CLOUT, DISPATCH_MAX_CLOUT_PER_MONTH, LADDER, STATESMAN_RANK,
} from '../src/api/constants/worldStage';
import { CONTEST_BALLOT_WEIGHT, CONTEST_MP_BALLOT_MULT, LEADERSHIP_MARGIN } from '../src/api/constants/floor';
import { NATION_PLAYER_CAP } from '../src/api/constants/nations';
import { DEFAULT_REAL_SECONDS_PER_MONTH } from '../src/api/constants/world';

const nobody: RungInput = { hasParty: false, isCandidate: false, hasSeat: false, leadsSeatedParty: false, isMinister: false, isHead: false, worldRank: null };

describe('Owner decisions (2026-11-18)', () => {
  it('a game month is 8 real hours and a nation holds 8 players', () => {
    assert.strictEqual(DEFAULT_REAL_SECONDS_PER_MONTH, 8 * 3600);
    assert.strictEqual(NATION_PLAYER_CAP, 8);
  });
});

describe('Energy carries over, up to a cap', () => {
  it('leftover energy is kept and the grant added', () => {
    assert.strictEqual(bankedAp(6), 6 + AP_MONTHLY_GRANT);
    assert.strictEqual(bankedAp(0), AP_MONTHLY_GRANT);
  });
  it('never above the bank cap', () => {
    assert.strictEqual(bankedAp(AP_BANK_CAP), AP_BANK_CAP);
    assert.strictEqual(bankedAp(AP_BANK_CAP - 1), AP_BANK_CAP);
  });
  it('a once-a-day player gets at least half of what an always-on player gets (3 months a day)', () => {
    let alwaysOn = 0;
    for (let m = 0; m < 3; m++) alwaysOn += AP_MONTHLY_GRANT; // spends every refill
    let e = 0;
    for (let m = 0; m < 3; m++) e = bankedAp(e);              // spends once, at the end of the day
    assert.ok(e / alwaysOn >= 0.5, `daily ${e} vs always-on ${alwaysOn}`);
    assert.ok(e < alwaysOn, 'checking in more often must still be worth something');
  });
});

describe('Career ladder', () => {
  it('has eight rungs from citizen to world statesman, each but the last saying how to climb', () => {
    assert.strictEqual(LADDER.length, 8);
    assert.strictEqual(LADDER[0].key, 'citizen');
    assert.strictEqual(LADDER[LADDER.length - 1].key, 'statesman');
    for (const r of LADDER.slice(0, -1)) assert.ok(r.next && r.next.length > 10, r.key);
  });
  it('places a politician on the highest rung they hold', () => {
    assert.strictEqual(careerRung(nobody), 'citizen');
    assert.strictEqual(careerRung({ ...nobody, hasParty: true }), 'member');
    assert.strictEqual(careerRung({ ...nobody, hasParty: true, isCandidate: true }), 'candidate');
    assert.strictEqual(careerRung({ ...nobody, hasParty: true, hasSeat: true, isCandidate: true }), 'mp');
    assert.strictEqual(careerRung({ ...nobody, hasParty: true, hasSeat: true, leadsSeatedParty: true }), 'leader');
    assert.strictEqual(careerRung({ ...nobody, hasParty: true, leadsSeatedParty: true, isMinister: true }), 'minister');
    assert.strictEqual(careerRung({ ...nobody, hasParty: true, leadsSeatedParty: true, isHead: true }), 'premier');
  });
  it('world statesman needs a top-3 world rank AND real power', () => {
    const head = { ...nobody, hasParty: true, leadsSeatedParty: true, isHead: true };
    assert.strictEqual(careerRung({ ...head, worldRank: STATESMAN_RANK }), 'statesman');
    assert.strictEqual(careerRung({ ...head, worldRank: STATESMAN_RANK + 1 }), 'premier');
    // A backbencher cannot be a statesman whatever the rank says.
    assert.strictEqual(careerRung({ ...nobody, hasParty: true, hasSeat: true, worldRank: 1 }), 'mp');
  });
  it('the ladder view marks reached rungs, the current one and the peak, with the local title', () => {
    const v = ladderFor('mp', 'minister', 'Chancellor');
    assert.deepStrictEqual(v.filter(r => r.reached).map(r => r.key), ['citizen', 'member', 'candidate', 'mp']);
    assert.strictEqual(v.find(r => r.current)?.key, 'mp');
    assert.strictEqual(v.find(r => r.peak)?.key, 'minister');
    assert.strictEqual(v.find(r => r.key === 'premier')?.title, 'Chancellor');
  });
});

const base: InfluenceInput = {
  office: 'member', ledPartySeatShare: 0, governmentSeatShare: 0, clout: 30, trust: 50,
  lawsPassed: 0, wordKept: 0, wordBroken: 0, endorsements: 0, nationPower: 50,
};

describe('World Influence Index', () => {
  it('office ranks: head of government > minister > party leader > MP > member > citizen', () => {
    const s = (office: InfluenceInput['office'], extra: Partial<InfluenceInput> = {}) => influenceScore({ ...base, office, ...extra });
    const head = s('premier', { ledPartySeatShare: 0.4, governmentSeatShare: 0.55 });
    const leader = s('leader', { ledPartySeatShare: 0.25 });
    assert.ok(head > s('minister') && s('minister') > s('leader') && s('leader') > s('mp') && s('mp') > s('member') && s('member') > s('citizen'));
    assert.ok(head / leader >= 1.8, `a head of government should clearly outrank a big opposition leader (${head} vs ${leader})`);
  });
  it('a bigger party makes its leader more influential', () => {
    assert.ok(influenceScore({ ...base, office: 'leader', ledPartySeatShare: 0.4 }) > influenceScore({ ...base, office: 'leader', ledPartySeatShare: 0.1 }));
  });
  it('breaking your word costs three times what keeping it earns', () => {
    const neutral = influenceScore(base);
    const kept = influenceScore({ ...base, wordKept: 1 }) - neutral;
    const broken = neutral - influenceScore({ ...base, wordBroken: 1 });
    assert.ok(Math.abs(broken / kept - 3) < 1e-9);
  });
  it('laws, promises and press are capped, so nobody farms their way up', () => {
    assert.strictEqual(influenceScore({ ...base, lawsPassed: 50 }), influenceScore({ ...base, lawsPassed: 5 }));
    assert.strictEqual(influenceScore({ ...base, endorsements: 500 }), influenceScore({ ...base, endorsements: 20 }));
    assert.strictEqual(influenceScore({ ...base, wordKept: 99 }), influenceScore({ ...base, wordKept: 5 }));
  });
  it('a stronger nation lends weight, but never more than a quarter either way', () => {
    assert.strictEqual(nationFactor(50), 1);
    assert.ok(nationFactor(100) <= 1.25 && nationFactor(0) >= 0.75);
    const strong = influenceScore({ ...base, nationPower: 100 });
    const weak = influenceScore({ ...base, nationPower: 0 });
    assert.ok(strong / weak <= 1.25 / 0.75 + 1e-9);
  });
  it('a score never drops to zero or below', () => {
    assert.ok(influenceScore({ ...base, office: 'citizen', clout: 0, trust: 0, wordBroken: 5 }) > 0);
  });
  it('shares add up to 100% and ranks follow scores', () => {
    const ranked = rankInfluence([{ key: 'a', score: 50 }, { key: 'b', score: 30 }, { key: 'c', score: 20 }]);
    assert.deepStrictEqual(ranked.map(r => r.key), ['a', 'b', 'c']);
    assert.deepStrictEqual(ranked.map(r => r.share), [50, 30, 20]);
    const big = rankInfluence(Array.from({ length: 37 }, (_, i) => ({ key: `k${i}`, score: 1 + (i % 7) })));
    const total = big.reduce((a, r) => a + r.share, 0);
    assert.ok(Math.abs(total - 100) < 1, `shares total ${total}`);
  });
  it('movement compares with last edition: climbing is positive, newcomers have none', () => {
    const ranked = rankInfluence([{ key: 'a', score: 10 }, { key: 'b', score: 30 }, { key: 'n', score: 20 }], { a: 1, b: 2 });
    const by = Object.fromEntries(ranked.map(r => [r.key, r]));
    assert.strictEqual(by.b.move, 1);
    assert.strictEqual(by.a.move, -2);
    assert.strictEqual(by.n.move, null);
  });
  it('ties are broken the same way every time', () => {
    const a = rankInfluence([{ key: 'x', score: 5 }, { key: 'y', score: 5 }]).map(r => r.key);
    const b = rankInfluence([{ key: 'y', score: 5 }, { key: 'x', score: 5 }]).map(r => r.key);
    assert.deepStrictEqual(a, b);
  });
  it('the edition headline names the leader, and a streak when they hold the top', () => {
    const ranked = rankInfluence([{ key: 'a', score: 9, name: 'Ada Voss', nationName: 'Westmark' }, { key: 'b', score: 3, name: 'Bo' }], { a: 1, b: 2 });
    assert.ok(editionHeadline(ranked, 3).includes('Ada Voss') && editionHeadline(ranked, 3).includes('3rd'));
    const newTop = rankInfluence([{ key: 'a', score: 9, name: 'Ada Voss' }, { key: 'b', score: 3, name: 'Bo' }], { a: 2, b: 1 });
    assert.ok(editionHeadline(newTop, 1).includes('takes the top'));
  });
});

describe('Leadership contests', () => {
  it('with nobody voting, the party machine backs the leader unless the challenger has far more clout', () => {
    assert.strictEqual(contestResult({ challengerClout: 55, leaderClout: 50, ballots: [] }).winner, 'leader');
    assert.strictEqual(contestResult({ challengerClout: 50 + LEADERSHIP_MARGIN + 1, leaderClout: 50, ballots: [] }).winner, 'challenger');
  });
  it('a tie goes to the leader', () => {
    assert.strictEqual(contestResult({ challengerClout: 50 + LEADERSHIP_MARGIN, leaderClout: 50, ballots: [] }).winner, 'leader');
  });
  it('members decide: one ballot can swing a close contest', () => {
    assert.strictEqual(contestResult({ challengerClout: 55, leaderClout: 50, ballots: [{ side: 'challenger', hasSeat: false }] }).winner, 'challenger');
  });
  it('an MP\'s ballot weighs twice a member\'s', () => {
    const mp = contestResult({ challengerClout: 50, leaderClout: 50, ballots: [{ side: 'challenger', hasSeat: true }] });
    const member = contestResult({ challengerClout: 50, leaderClout: 50, ballots: [{ side: 'challenger', hasSeat: false }] });
    assert.strictEqual((mp.challenger - 50) / (member.challenger - 50), CONTEST_MP_BALLOT_MULT);
    assert.strictEqual(member.challenger - 50, CONTEST_BALLOT_WEIGHT);
  });
  it('a leader whose MPs stand by them survives a big clout gap', () => {
    const r = contestResult({ challengerClout: 90, leaderClout: 50, ballots: [{ side: 'leader', hasSeat: true }, { side: 'leader', hasSeat: true }] });
    assert.strictEqual(r.winner, 'leader');
  });
});

describe('Reader dispatches', () => {
  it('accepts a proper story and tidies its text', () => {
    const v = validateDispatch('  Westmark   Chancellor caught  napping ', 'Sources close to the guilds say the Chancellor slept through the budget debate.\n\n\n\nMore soon.') as any;
    assert.strictEqual(v.headline, 'Westmark Chancellor caught napping');
    assert.ok(!v.body.includes('\n\n\n'));
  });
  it('refuses empty, too short or too long stories', () => {
    assert.ok('error' in validateDispatch('', 'x'.repeat(100)));
    assert.ok('error' in validateDispatch('A fine headline', 'too short'));
    assert.ok('error' in validateDispatch('A fine headline', 'x'.repeat(DISPATCH_BODY_MAX + 1)));
  });
  it('strips control and direction-override characters', () => {
    assert.strictEqual(cleanText('Hi\u0007 there‮!', false), 'Hi there!');
  });
  it('press clout: one point per N endorsements, capped each month', () => {
    assert.strictEqual(pressClout(DISPATCH_ENDORSEMENTS_PER_CLOUT - 1), 0);
    assert.strictEqual(pressClout(DISPATCH_ENDORSEMENTS_PER_CLOUT), 1);
    assert.strictEqual(pressClout(10_000), DISPATCH_MAX_CLOUT_PER_MONTH);
  });
});
