/**
 * Coalitions (docs/COALITIONS.md): talks, offers, unity. Pure rules only, ratio-based.
 * Party platforms below are the seeded ones (database/migrations + 0099_starter_nations.sql).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as C from '../src/api/services/coalition.rules';
import { partyVoteScore } from '../src/api/services/statecraft.service';
import { nationRules } from '../src/api/constants/nations';
import {
  COALITION_MAX_PROMISES, COALITION_RIVAL_MIN_UNITY, UNITY_WALKOUT_AT, UNITY_WHIP_REF,
} from '../src/api/constants/coalition';

// Drennia
const CSU = { taxation: 55, labour: 55, investment: 60, trade: 60, stability: 80 };
const NPP = { taxation: 85, labour: 35, investment: 75, trade: 80, stability: 60 };
const NLF = { taxation: 30, labour: 90, investment: 70, trade: 50, stability: 50 };
const IND = { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 };
// Eryndor
const HU = { taxation: 55, labour: 55, investment: 55, trade: 45, stability: 82 };
const EEP = { taxation: 85, labour: 35, investment: 70, trade: 75, stability: 60 };
const MSF = { taxation: 30, labour: 86, investment: 75, trade: 38, stability: 50 };
const HIN = IND;

const P = (id: string, seats: number, platform: any) => ({ id, seats, platform });
const DRENNIA = [P('csu', 45, CSU), P('nlf', 43, NLF), P('npp', 34, NPP), P('ind', 29, IND)];
const ERYNDOR = [P('hu', 38, HU), P('msf', 37, MSF), P('eep', 29, EEP), P('hin', 27, HIN)];

const offer = (o: Partial<C.OfferScoreInput>) => C.offerScore({
  distance: 0.3, maxDistance: 0.5, posts: ['interior', 'defence'], fairPostCount: 2,
  promiseLikings: [], hog: false, blocSize: 2, wordBroken: false, ...o,
});

describe('Unity: how tightly a coalition holds', () => {
  it('more parties, wider views and a minority all start a coalition weaker', () => {
    const two = C.startingUnity({ platforms: [CSU, NPP], seats: 79, majority: 76 });
    const three = C.startingUnity({ platforms: [CSU, NPP, IND], seats: 108, majority: 76 });
    const wide = C.startingUnity({ platforms: [NLF, NPP], seats: 77, majority: 76 });
    const minority = C.startingUnity({ platforms: [HU, HIN], seats: 65, majority: 66 });
    const majority = C.startingUnity({ platforms: [HU, HIN], seats: 67, majority: 66 });
    assert.ok(three < two, `3 parties (${three}) should be weaker than 2 (${two})`);
    assert.ok(wide < two, `left-right deal (${wide}) weaker than neighbours (${two})`);
    assert.ok(minority < majority);
  });
  it('the worked examples in the design doc', () => {
    assert.ok(Math.abs(C.startingUnity({ platforms: [CSU, NPP], seats: 79, majority: 76 }) - 64) <= 1);
    assert.ok(Math.abs(C.startingUnity({ platforms: [HU, EEP], seats: 67, majority: 66 }) - 59) <= 1);
    assert.ok(C.startingUnity({ platforms: [MSF, HIN, EEP], seats: 93, majority: 66 }) < COALITION_RIVAL_MIN_UNITY,
      'Eryndor\'s three smaller parties are too far apart to gang up');
  });
  it('kept promises raise it, broken ones cost more, a defeated attempt costs less than ignoring it', () => {
    const base = 60;
    const kept = C.unityAfterMonth(50, base, { ...C.NO_UNITY_EVENTS, kept: 1 });
    const broken = C.unityAfterMonth(50, base, { ...C.NO_UNITY_EVENTS, broken: 1 });
    const tried = C.unityAfterMonth(50, base, { ...C.NO_UNITY_EVENTS, tried: 1 });
    assert.ok(kept > 50 && broken < tried && tried < 50);
    assert.ok(50 - broken > kept - 50, 'breaking a promise hurts more than keeping one helps');
  });
  it('a quiet month recovers slowly, never past the starting level', () => {
    assert.strictEqual(C.unityAfterMonth(50, 60, C.NO_UNITY_EVENTS), 51);
    assert.strictEqual(C.unityAfterMonth(60, 60, C.NO_UNITY_EVENTS), 60);
    assert.strictEqual(C.unityAfterMonth(70, 60, C.NO_UNITY_EVENTS), 70, 'kept promises can lift it above the start; quiet months do not pull it down');
  });
  it('unity stays within 0..100', () => {
    assert.strictEqual(C.unityAfterMonth(3, 60, { ...C.NO_UNITY_EVENTS, broken: 3 }), 0);
    assert.strictEqual(C.unityAfterMonth(98, 60, { ...C.NO_UNITY_EVENTS, kept: 3 }), 100);
  });
  it('bands read in plain English, and the walkout line is "Breaking up"', () => {
    assert.strictEqual(C.unityLabel(90), 'Solid');
    assert.strictEqual(C.unityLabel(UNITY_WALKOUT_AT - 1), 'Breaking up');
  });
});

describe('Unity changes how partners vote (through the one vote rule)', () => {
  it('the whip is unchanged at the reference level, halved at half of it, and one-party governments are unaffected', () => {
    assert.strictEqual(C.whipScale(UNITY_WHIP_REF), 1);
    assert.ok(Math.abs(C.whipScale(UNITY_WHIP_REF / 2) - 0.5) < 1e-9);
    assert.strictEqual(C.whipScale(null), 1);
    assert.ok(C.whipScale(0) > 0 && C.whipScale(100) <= 1.25);
  });
  it('a partner that mildly dislikes a government bill backs it in a united coalition and opposes it in a fragile one', () => {
    const ctx = { desirability: -0.2, voterInGovernment: true, billFromGovernment: true };
    assert.ok(partyVoteScore({ ...ctx, whipScale: C.whipScale(70) }) > 0);
    assert.ok(partyVoteScore({ ...ctx, whipScale: C.whipScale(20) }) < 0);
    assert.strictEqual(partyVoteScore(ctx), partyVoteScore({ ...ctx, whipScale: 1 }), 'no unity = the old behaviour');
  });
});

describe('Will a computer-run party join?', () => {
  it('closer parties are easier to win over', () => {
    assert.ok(offer({ distance: 0.2 }).score > offer({ distance: 0.45 }).score);
  });
  it('a fair share of ministries is enough inside the nation\'s limit, not beyond it', () => {
    assert.ok(offer({ distance: 0.4 }).accept);
    assert.ok(!offer({ distance: 0.7 }).accept);
  });
  it('better ministries, laws they want and the top job all raise the score', () => {
    const plain = offer({ distance: 0.6 }).score;
    assert.ok(offer({ distance: 0.6, posts: ['finance', 'defence'] }).score > plain);
    assert.ok(offer({ distance: 0.6, promiseLikings: [0.4] }).score > plain);
    assert.ok(offer({ distance: 0.6, hog: true }).score > plain);
  });
  it('a law they dislike counts against the offer', () => {
    assert.ok(offer({ promiseLikings: [-0.4] }).score < offer({}).score);
  });
  it('crowded governments and a broken word put them off', () => {
    assert.ok(offer({ blocSize: 4 }).score < offer({ blocSize: 2 }).score);
    assert.ok(offer({ wordBroken: true }).score < offer({}).score);
  });
  it('the same offer is easier in Westmark (parties ally easily) than in Eryndor (they rarely do)', () => {
    const d = 0.5;
    assert.ok(offer({ distance: d, maxDistance: nationRules('westmark').coalitionMaxDistance }).score
      > offer({ distance: d, maxDistance: nationRules('eryndor').coalitionMaxDistance }).score);
  });
  it('every refusal explains itself', () => {
    const r = offer({ distance: 0.9 });
    assert.ok(!r.accept && r.reason.length > 10);
  });
  it('a party takes its best offer; ties go to the bigger party; nothing below the bar', () => {
    assert.strictEqual(C.pickBestOffer([{ id: 'a', score: 0.1, leadSeats: 30 }, { id: 'b', score: 0.3, leadSeats: 20 }])?.id, 'b');
    assert.strictEqual(C.pickBestOffer([{ id: 'a', score: 0.2, leadSeats: 30 }, { id: 'b', score: 0.2, leadSeats: 40 }])?.id, 'b');
    assert.strictEqual(C.pickBestOffer([{ id: 'a', score: -0.1, leadSeats: 30 }]), null);
  });
});

describe('Offers must be well-formed', () => {
  const base = {
    posts: ['finance'], promises: [], hog: false, validPosts: ['finance', 'industry', 'welfare', 'interior', 'defence'],
    postsPromisedElsewhere: [] as string[], hogPromisedElsewhere: false, isValidChange: () => true,
  };
  it('accepts a simple offer', () => { assert.strictEqual(C.offerProblem(base), null); });
  it('refuses double-promised posts, giving away every post, or an empty offer', () => {
    assert.ok(C.offerProblem({ ...base, postsPromisedElsewhere: ['finance'] }));
    assert.ok(C.offerProblem({ ...base, posts: ['finance', 'industry'], postsPromisedElsewhere: ['welfare', 'interior', 'defence'] }));
    assert.ok(C.offerProblem({ ...base, posts: [] }));
  });
  it('refuses too many promises, a bad deadline, or the top job twice', () => {
    const many = Array.from({ length: COALITION_MAX_PROMISES + 1 }, (_, i) => ({ category: `c${i}`, option: 'x', months: 6 }));
    assert.ok(C.offerProblem({ ...base, promises: many }));
    assert.ok(C.offerProblem({ ...base, promises: [{ category: 'c', option: 'x', months: 1 }] }));
    assert.ok(C.offerProblem({ ...base, hog: true, hogPromisedElsewhere: true }));
  });
});

describe('How a computer-run party builds a government', () => {
  const noWishes = {};
  it('Drennia: the largest party wins over its nearest workable partner', () => {
    const plan = C.buildNpcBloc({ leadId: 'csu', parties: DRENNIA, majority: 76, maxDistance: nationRules('national').coalitionMaxDistance, wishes: noWishes });
    assert.ok(plan);
    assert.deepStrictEqual(plan!.packages.map(p => p.partyId), ['npp']);
    assert.ok(plan!.seats >= 76 && plan!.packages.every(p => p.score >= 0));
  });
  it('the leader always keeps at least one ministry, and no post is promised twice', () => {
    const plan = C.buildNpcBloc({ leadId: 'csu', parties: DRENNIA, majority: 76, maxDistance: 0.5, wishes: noWishes })!;
    const promised = plan.packages.flatMap(p => p.posts);
    assert.strictEqual(new Set(promised).size, promised.length);
    assert.ok(promised.length < C.POST_COUNT);
  });
  it('Eryndor: a better ministry and a law buy the Enterprise Party, giving the largest party a majority', () => {
    const wishes = { eep: [{ category: 'corp_tax', option: 'low', partnerLiking: 0.35, leadLiking: 0 }] };
    const plan = C.buildNpcBloc({ leadId: 'hu', parties: ERYNDOR, majority: 66, maxDistance: nationRules('eryndor').coalitionMaxDistance, wishes });
    assert.ok(plan, 'a majority should be possible with a price');
    const eep = plan!.packages.find(p => p.partyId === 'eep');
    assert.ok(eep && eep.score >= 0);
    assert.ok(eep!.posts.includes('finance') || eep!.promises.length > 0, 'the price was paid in a top post or a law');
  });
  it('a rival bloc of parties too far apart cannot be bought', () => {
    const plan = C.buildNpcBloc({ leadId: 'nlf', parties: DRENNIA, majority: 76, maxDistance: 0.5, wishes: noWishes, excluded: new Set(['csu']) });
    assert.ok(!plan || plan.unity < COALITION_RIVAL_MIN_UNITY, 'Labour cannot buy the free-marketeers without the top job');
  });
  it('the top job is offered only to a partner bigger than the leader', () => {
    const plan = C.buildNpcBloc({ leadId: 'npp', parties: DRENNIA, majority: 76, maxDistance: 0.5, wishes: noWishes, excluded: new Set(['nlf']) });
    for (const p of plan?.packages ?? []) {
      if (p.hog) assert.ok(DRENNIA.find(x => x.id === p.partyId)!.seats > 34);
    }
  });
  it('when a rival courts the same partner, the largest party raises its offer to beat it', () => {
    const wishes = { npp: [{ category: 'tariffs', option: 'free_trade', partnerLiking: 0.5, leadLiking: 0 }] };
    const opening = C.buildNpcBloc({ leadId: 'csu', parties: DRENNIA, majority: 76, maxDistance: 0.5, wishes })!;
    const before = opening.packages.find(p => p.partyId === 'npp')!.score;
    const raised = C.buildNpcBloc({ leadId: 'csu', parties: DRENNIA, majority: 76, maxDistance: 0.5, wishes, mustBeat: { npp: before + 0.1 } });
    assert.ok(raised, 'it can afford to outbid');
    assert.ok(raised!.packages.find(p => p.partyId === 'npp')!.score > before + 0.1);
  });
  it('mid-term, a minority government offers only posts it holds, and counts its partners\' seats', () => {
    const plan = C.buildNpcBloc({
      leadId: 'hu', parties: ERYNDOR, majority: 66, maxDistance: 0.42, wishes: {},
      fixedIds: ['hin'], freePosts: ['industry', 'welfare', 'defence'],
    });
    for (const pk of plan?.packages ?? []) {
      assert.ok(pk.partyId !== 'hin', 'a party already in government is not courted again');
      for (const post of pk.posts) assert.ok(['industry', 'welfare', 'defence'].includes(post));
    }
  });
  it('no majority is possible with too few seats', () => {
    assert.strictEqual(C.buildNpcBloc({ leadId: 'csu', parties: [P('csu', 10, CSU), P('x', 10, IND)], majority: 76, maxDistance: 0.5, wishes: noWishes }), null);
  });
});

describe('Walkouts', () => {
  it('the partner wronged most leaves first, then the one furthest away', () => {
    assert.strictEqual(C.walkoutChoice([{ id: 'a', brokenToThem: 0, distance: 0.6 }, { id: 'b', brokenToThem: 1, distance: 0.2 }]), 'b');
    assert.strictEqual(C.walkoutChoice([{ id: 'a', brokenToThem: 0, distance: 0.6 }, { id: 'b', brokenToThem: 0, distance: 0.2 }]), 'a');
    assert.strictEqual(C.walkoutChoice([]), null);
  });
});
