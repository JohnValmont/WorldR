/**
 * The Floor (politics redesign): support, individual votes, pacts, situations.
 * Pure functions only (no database). Assertions are ratio-based (AGENTS.md).
 */
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  adGain, cardEligible, dealHand, DealContext, driftSupport, fundraiseTake, lawSupportDeltas, leadershipDecision,
  outcomeChances, pactDecision, pickOutcome, rallyGain, renderText, sumShocks, supportEffort, supportTarget, tallyBill,
} from '../src/api/services/floor.rules';
import { apportionSeats } from '../src/api/services/electionEngine';
import { projectElection } from '../src/api/services/statecraft.service';
import { SITUATIONS } from '../src/api/constants/situations';
import { DRENNIA, DEFAULT_LAWS, NPC_MACHINE_EFFORT } from '../src/api/constants/nations';
import { Platform, SEGMENTS } from '../src/api/constants/politics';
import {
  HAND_SIZE, LAW_SUPPORT_CAP, LEADERSHIP_MIN_CLOUT, PACT_MAX_OWED_TO_ONE_PARTY, RALLY_GAIN, SHOCK_TOTAL_CAP, SUPPORT_REVERT_RATE,
} from '../src/api/constants/floor';

const PLATFORMS: Record<string, Platform> = {
  labour:   { taxation: 30, labour: 90, investment: 70, trade: 50, stability: 50 },
  progress: { taxation: 85, labour: 35, investment: 75, trade: 80, stability: 60 },
  civic:    { taxation: 55, labour: 55, investment: 60, trade: 60, stability: 80 },
  indep:    { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
};
const seatsFor = apportionSeats(DRENNIA.districts.map(d => d.registeredVoters), DRENNIA.legislature.seats, 1);
const districts = DRENNIA.districts.map((d, i) => ({
  id: `d${i}`, registered_voters: d.registeredVoters, seats: seatsFor[i], segment_weights: d.segmentWeights,
}));
/** Effort the election engine sees for a party: machine + support in each group. */
const effortFor = (platform: Platform, bonus: Record<string, number> = {}) =>
  Object.fromEntries(SEGMENTS.map(s => [s.key, NPC_MACHINE_EFFORT + supportEffort(supportTarget(platform, s.key) + (bonus[s.key] ?? 0))]));
const partiesWith = (bonus: Record<string, Record<string, number>> = {}) =>
  Object.entries(PLATFORMS).map(([id, platform]) => ({ id, platform, credibility: 50, effortBySegment: effortFor(platform, bonus[id]) }));

describe('Support', () => {
  it('a party is naturally stronger with the voter group its platform fits', () => {
    assert.ok(supportTarget(PLATFORMS.labour, 'industrial_workers') > supportTarget(PLATFORMS.progress, 'industrial_workers'));
    assert.ok(supportTarget(PLATFORMS.progress, 'factory_business_owners') > supportTarget(PLATFORMS.labour, 'factory_business_owners'));
  });
  it('fades back toward its natural level, never past it', () => {
    const target = 50;
    let high = 80, low = 20;
    for (let m = 0; m < 6; m++) { high = driftSupport(high, target); low = driftSupport(low, target); }
    assert.ok(high < 80 && high > target);
    assert.ok(low > 20 && low < target);
    const afterOne = driftSupport(80, target);
    assert.ok(Math.abs((80 - afterOne) / 30 - SUPPORT_REVERT_RATE) < 1e-9, 'one month closes REVERT_RATE of the gap');
  });
  it('a steady rally habit settles at a bounded lead (gain / revert rate), it does not snowball', () => {
    let s = 50;
    for (let m = 0; m < 200; m++) s = driftSupport(s + RALLY_GAIN, 50);
    const lead = s - 50;
    const expected = RALLY_GAIN / SUPPORT_REVERT_RATE;
    assert.ok(lead > expected * 0.8 && lead < expected * 1.05, `lead ${lead} vs ${expected}`);
  });
  it('more support means more votes, with diminishing returns', () => {
    const base = projectElection(partiesWith(), districts, null, new Set(), 50);
    const plus20 = projectElection(partiesWith({ indep: Object.fromEntries(SEGMENTS.map(s => [s.key, 20])) }), districts, null, new Set(), 50);
    const plus40 = projectElection(partiesWith({ indep: Object.fromEntries(SEGMENTS.map(s => [s.key, 40])) }), districts, null, new Set(), 50);
    const g1 = plus20.shares.indep / base.shares.indep;
    const g2 = plus40.shares.indep / plus20.shares.indep;
    assert.ok(g1 > 1.05 && g1 < 1.35, `+20 support should be a real but bounded gain (x${g1.toFixed(3)})`);
    assert.ok(g2 > 1 && g2 < g1, 'the second +20 is worth less than the first');
  });
  it('support alone cannot hand anyone a landslide', () => {
    const maxed = projectElection(partiesWith({ indep: Object.fromEntries(SEGMENTS.map(s => [s.key, 60])) }), districts, null, new Set(), 50);
    assert.ok(maxed.seats.indep < DRENNIA.legislature.majority, `even at the cap a centrist party stays short of a majority (${maxed.seats.indep})`);
  });
});

describe('Desk actions', () => {
  it('repeat rallies in the same group are worth less each time', () => {
    const first = rallyGain(50, 0, 'governing');
    const second = rallyGain(50, 1, 'governing');
    const third = rallyGain(50, 2, 'governing');
    assert.ok(second / first < 0.75 && third / second < 0.75);
  });
  it('charisma and the campaign season both make rallies stronger', () => {
    assert.ok(rallyGain(100, 0, 'governing') / rallyGain(0, 0, 'governing') > 1.5);
    assert.ok(rallyGain(50, 0, 'campaign') / rallyGain(50, 0, 'governing') > 1.3);
  });
  it('ads and fundraisers also tire', () => {
    assert.ok(adGain(1) < adGain(0));
    assert.ok(fundraiseTake(50, 50, 2, 0.5) < fundraiseTake(50, 50, 0, 0.5));
  });
  it('popular parties raise more, and luck matters but is bounded', () => {
    assert.ok(fundraiseTake(80, 50, 0, 0.5) / fundraiseTake(30, 50, 0, 0.5) > 1.4);
    const ratio = fundraiseTake(50, 50, 0, 1) / fundraiseTake(50, 50, 0, 0);
    assert.ok(ratio > 2 && ratio < 5);
  });
});

describe('Counting a vote', () => {
  const seatsByParty = { gov: 80, opp: 60, small: 11 };
  it('with no individual votes, parties vote as blocs', () => {
    const t = tallyBill({ seatsByParty, partyLine: { gov: 'yea', opp: 'nay', small: 'nay' }, personalVotes: [] });
    assert.deepStrictEqual([t.yea, t.nay, t.rebels], [80, 71, 0]);
  });
  it('an MP voting against their own party moves exactly two votes of margin', () => {
    const before = tallyBill({ seatsByParty, partyLine: { gov: 'yea', opp: 'nay', small: 'nay' }, personalVotes: [] });
    const after = tallyBill({ seatsByParty, partyLine: { gov: 'yea', opp: 'nay', small: 'nay' }, personalVotes: [{ partyId: 'gov', vote: 'nay' }] });
    assert.strictEqual((before.yea - before.nay) - (after.yea - after.nay), 2);
    assert.strictEqual(after.rebels, 1);
    assert.strictEqual(after.yea + after.nay, 151, 'no seat is counted twice or lost');
  });
  it('enough rebels defeat a government bill', () => {
    const rebels = Array.from({ length: 5 }, () => ({ partyId: 'gov', vote: 'nay' as const }));
    const t = tallyBill({ seatsByParty, partyLine: { gov: 'yea', opp: 'nay', small: 'nay' }, personalVotes: rebels });
    assert.ok(t.nay > t.yea);
  });
  it('a loyal personal vote changes nothing, and a party with no line abstains', () => {
    const loyal = tallyBill({ seatsByParty, partyLine: { gov: 'yea', opp: 'nay' }, personalVotes: [{ partyId: 'gov', vote: 'yea' }] });
    assert.deepStrictEqual([loyal.yea, loyal.nay, loyal.rebels], [80, 60, 0]);
  });
  it('a party cannot cast more personal votes than it has seats', () => {
    const t = tallyBill({ seatsByParty: { tiny: 1 }, partyLine: { tiny: 'yea' }, personalVotes: [{ partyId: 'tiny', vote: 'nay' }, { partyId: 'tiny', vote: 'nay' }] });
    assert.strictEqual(t.yea + t.nay, 1);
  });
});

describe('Pacts', () => {
  const base = {
    desirability: -0.15, askedVote: 'yea' as const, targetProposedBill: false, targetInGovernment: false,
    billFromGovernment: false, cash: 0, askerTrust: 50, alreadyOwed: 0, askerWordBroken: false,
  };
  it('a favour buys a party that only mildly dislikes the bill', () => {
    assert.strictEqual(pactDecision(base).accept, true);
  });
  it('no favour buys a party that hates it, but a donation narrows the gap', () => {
    const hates = pactDecision({ ...base, desirability: -0.9 });
    const withCash = pactDecision({ ...base, desirability: -0.9, cash: 100_000 });
    assert.strictEqual(hates.accept, false);
    assert.ok(withCash.score > hates.score);
  });
  it('a reputation for keeping your word is worth votes; a poor one costs them', () => {
    const trusted = pactDecision({ ...base, desirability: -0.4, askerTrust: 95 });
    const shady = pactDecision({ ...base, desirability: -0.4, askerTrust: 10 });
    assert.ok(trusted.score > shady.score);
    assert.strictEqual(trusted.accept, true);
    assert.strictEqual(shady.accept, false);
  });
  it('each favour already owed makes the next harder, up to a hard limit', () => {
    const one = pactDecision({ ...base, alreadyOwed: 1 });
    const two = pactDecision({ ...base, alreadyOwed: 2 });
    assert.ok(two.score < one.score);
    assert.strictEqual(pactDecision({ ...base, alreadyOwed: PACT_MAX_OWED_TO_ONE_PARTY }).accept, false);
  });
  it('word-breakers are refused, and nobody votes down their own bill', () => {
    assert.strictEqual(pactDecision({ ...base, desirability: 0.5, askerWordBroken: true }).accept, false);
    assert.strictEqual(pactDecision({ ...base, askedVote: 'nay', targetProposedBill: true }).accept, false);
  });
  it('a governing party is much harder to turn against its own government', () => {
    const opp = pactDecision({ ...base, askedVote: 'nay', desirability: 0.1, billFromGovernment: true, targetInGovernment: false });
    const gov = pactDecision({ ...base, askedVote: 'nay', desirability: 0.1, billFromGovernment: true, targetInGovernment: true });
    assert.ok(opp.score - gov.score > 0.5);
  });
});

describe('Laws move voters', () => {
  it('workers and owners pull opposite ways on the minimum wage', () => {
    const d = lawSupportDeltas('min_wage', DEFAULT_LAWS.min_wage, 'very_high');
    assert.ok(d.industrial_workers > 0, 'workers want it');
    assert.ok(d.factory_business_owners < 0, 'owners do not');
    for (const v of Object.values(d)) assert.ok(Math.abs(v) <= LAW_SUPPORT_CAP);
  });
  it('re-enacting the law already in force moves nobody', () => {
    const d = lawSupportDeltas('income_tax', DEFAULT_LAWS.income_tax, DEFAULT_LAWS.income_tax);
    for (const v of Object.values(d)) assert.strictEqual(v, 0);
  });
});

describe('Situations', () => {
  const ctx = (over: Partial<DealContext> = {}): DealContext => ({
    roles: ['member'], inGovernment: false, inOpposition: true, phase: 'governing', stats: {}, approval: 50,
    hasOpenBill: false, monthsToElection: 30, ...over,
  });
  it('every card is well formed', () => {
    const keys = new Set<string>();
    for (const c of SITUATIONS) {
      assert.ok(!keys.has(c.key), `duplicate key ${c.key}`);
      keys.add(c.key);
      assert.ok(c.options.length >= 2 && c.options.length <= 3, `${c.key} needs 2-3 options`);
      for (const o of c.options) {
        assert.ok(o.outcomes.length >= 1, `${c.key}: option without outcome`);
        const total = outcomeChances(o).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(total - 1) < 1e-9);
        for (const oc of o.outcomes) {
          assert.ok(oc.weight > 0);
          for (const seg of Object.keys(oc.effects.support ?? {})) {
            assert.ok(seg === 'all' || SEGMENTS.some(s => s.key === seg), `${c.key}: unknown voter group ${seg}`);
          }
          if (oc.effects.stat) {
            const roles = c.when.roles ?? [];
            assert.ok(roles.length > 0 && roles.every(r => r === 'minister' || r === 'premier'), `${c.key}: only ministers and the Premier may move national stats`);
          }
        }
      }
    }
  });
  it('everyone gets a full hand, whatever their role', () => {
    const cases: Partial<DealContext>[] = [
      { roles: ['citizen'], inOpposition: false },
      { roles: ['member'] },
      { roles: ['member', 'mp'] },
      { roles: ['member', 'mp', 'leader'] },
      { roles: ['member', 'mp', 'minister'], inGovernment: true, inOpposition: false },
      { roles: ['member', 'mp', 'leader', 'premier'], inGovernment: true, inOpposition: false },
    ];
    for (const c of cases) {
      const hand = dealHand(ctx(c), 'seed-a');
      assert.strictEqual(hand.length, HAND_SIZE, `roles ${c.roles}`);
      assert.strictEqual(new Set(hand.map(h => h.key)).size, HAND_SIZE, 'no duplicate cards in a hand');
    }
  });
  it('the same player in the same month always gets the same hand', () => {
    const a = dealHand(ctx(), 'char-1|500').map(c => c.key);
    const b = dealHand(ctx(), 'char-1|500').map(c => c.key);
    assert.deepStrictEqual(a, b);
  });
  it('hands differ from month to month', () => {
    const seen = new Set<string>();
    for (let m = 0; m < 24; m++) for (const c of dealHand(ctx({ roles: ['member', 'mp'] }), `char-1|${m}`)) seen.add(c.key);
    assert.ok(seen.size >= 12, `two years should show at least 12 different cards, saw ${seen.size}`);
  });
  it('cards seen recently are not dealt again', () => {
    const first = dealHand(ctx(), 's1');
    const recent = new Set(first.map(c => c.key));
    const next = dealHand(ctx(), 's1', recent);
    for (const c of next) assert.ok(!recent.has(c.key));
  });
  it('citizens never get party cards and members never get citizen cards', () => {
    for (let i = 0; i < 20; i++) {
      for (const c of dealHand(ctx({ roles: ['citizen'], inOpposition: false }), `c${i}`)) assert.deepStrictEqual(c.when.roles, ['citizen']);
      for (const c of dealHand(ctx(), `m${i}`)) assert.ok(!(c.when.roles ?? []).includes('citizen'));
    }
  });
  it('office holders see cards written for their office more often than backbenchers do', () => {
    const count = (roles: any) => {
      let n = 0;
      for (let i = 0; i < 60; i++) for (const c of dealHand(ctx({ roles, inGovernment: true, inOpposition: false }), `p${i}`)) if ((c.when.roles ?? []).includes('premier') && !(c.when.roles ?? []).includes('member') && !(c.when.roles ?? []).includes('mp')) n++;
      return n;
    };
    assert.strictEqual(count(['member', 'mp']), 0);
    assert.ok(count(['member', 'mp', 'leader', 'premier']) > 60, 'a Premier should see more than one office card a month on average');
  });
  it('conditions gate cards: election cards only near an election, price cards only when prices bite', () => {
    const debate = SITUATIONS.find(c => c.key === 'tv_debate')!;
    assert.strictEqual(cardEligible(debate.when, ctx({ monthsToElection: 30 })), false);
    assert.strictEqual(cardEligible(debate.when, ctx({ monthsToElection: 4 })), true);
    const rent = SITUATIONS.find(c => c.key === 'rent_protest')!;
    assert.strictEqual(cardEligible(rent.when, ctx({ stats: { cost_of_living: 40 } })), false);
    assert.strictEqual(cardEligible(rent.when, ctx({ stats: { cost_of_living: 60 } })), true);
  });
  it('outcomes are fixed per decision and follow the stated odds', () => {
    const card = SITUATIONS.find(c => c.key === 'tv_debate')!;
    const option = card.options[0];
    assert.strictEqual(pickOutcome(option, 'x|0'), pickOutcome(option, 'x|0'));
    let good = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (pickOutcome(option, `roll-${i}`) === 0) good++;
    const expected = outcomeChances(option)[0];
    assert.ok(Math.abs(good / N - expected) < 0.04, `observed ${(good / N).toFixed(3)} vs stated ${expected}`);
  });
  it('fills in names', () => {
    assert.strictEqual(renderText('{party} v {rival} in {district}', { party: 'A', rival: 'B', district: 'C' }), 'A v B in C');
  });
});

describe('Leadership and shocks', () => {
  it('unseating a human leader takes clearly more clout than they have', () => {
    assert.strictEqual(leadershipDecision(50, true, 45).win, false);
    assert.strictEqual(leadershipDecision(60, true, 45).win, true);
    assert.strictEqual(leadershipDecision(LEADERSHIP_MIN_CLOUT - 1, false, 0).win, false);
    assert.strictEqual(leadershipDecision(LEADERSHIP_MIN_CLOUT, false, 0).win, true);
  });
  it('stat nudges are capped in total', () => {
    const s = sumShocks([{ stat: 'prosperity', delta: 6 }, { stat: 'prosperity', delta: 6 }, { stat: 'equity', delta: -2 }]);
    assert.strictEqual(s.prosperity, SHOCK_TOTAL_CAP);
    assert.strictEqual(s.equity, -2);
  });
});

// ─────────────────────────── Three equal nations ───────────────────────────
import { STARTER_NATIONS, NATION_PLAYER_CAP, NATIONS_BY_POL_STATE } from '../src/api/constants/nations';
import { JURISDICTIONS } from '../src/api/constants/politics';
import { chooseNation, nationPower } from '../src/api/services/nations.service';
import { DECREES } from '../src/api/constants/decrees';
import { CABINET_POSTS } from '../src/api/constants/nations';

describe('Starter nations are equal', () => {
  it('there are three, each with its own parliament code', () => {
    assert.strictEqual(STARTER_NATIONS.length, 3);
    assert.strictEqual(new Set(STARTER_NATIONS.map(n => n.polStateCode)).size, 3);
    for (const n of STARTER_NATIONS) assert.ok(NATIONS_BY_POL_STATE[n.polStateCode] && JURISDICTIONS[n.polStateCode], `${n.shortName} needs a jurisdiction entry`);
  });
  it('same seats, same majority, same term, same number of voters', () => {
    const voters = (n: typeof DRENNIA) => n.districts.reduce((a, d) => a + d.registeredVoters, 0);
    for (const n of STARTER_NATIONS) {
      assert.strictEqual(n.legislature.seats, DRENNIA.legislature.seats);
      assert.strictEqual(JURISDICTIONS[n.polStateCode].seats, DRENNIA.legislature.seats);
      assert.strictEqual(JURISDICTIONS[n.polStateCode].majority, DRENNIA.legislature.majority);
      assert.strictEqual(JURISDICTIONS[n.polStateCode].termMonths, JURISDICTIONS.national.termMonths);
      assert.strictEqual(n.districts.length, DRENNIA.districts.length);
      assert.strictEqual(voters(n), voters(DRENNIA));
      assert.strictEqual(new Set(n.districts.map(d => d.name)).size, n.districts.length, `${n.shortName}: district names must be unique`);
      for (const d of n.districts) assert.ok(n.regions.some(r => r.code === d.region), `${n.shortName}: ${d.name} has an unknown region`);
    }
  });
  it('equal statistics and laws give equal power scores', () => {
    const a = nationPower({ prosperity: 50, fiscal_health: 50, global_standing: 50 }, 'moderate');
    assert.deepStrictEqual([a.economy, a.military, a.influence], [50, 50, 50]);
    assert.ok(nationPower({ prosperity: 50, fiscal_health: 50, global_standing: 50 }, 'high').military > a.military, 'defence spending is the lever for military strength');
  });
  it('their first elections after founding fall at different times', () => {
    const cuts = STARTER_NATIONS.map(n => JURISDICTIONS[n.polStateCode].electionOffsetMonths);
    assert.strictEqual(new Set(cuts).size, 3);
    for (const c of cuts) assert.ok(c < JURISDICTIONS.national.termMonths);
  });
});

describe('Six players per nation', () => {
  const cap = NATION_PLAYER_CAP;
  it('a player gets the nation they ask for while it has room', () => {
    assert.deepStrictEqual(chooseNation('westmark', { drennia: cap, westmark: cap - 1, eryndor: 0 }, cap, true), { countryId: 'westmark' });
  });
  it('a full nation is refused, naming the ones with room', () => {
    const r = chooseNation('drennia', { drennia: cap, westmark: 2, eryndor: 0 }, cap, true) as any;
    assert.ok(r.error && r.error.includes('Westmark') && r.error.includes('Eryndor'));
  });
  it('with no preference, nations fill one at a time', () => {
    assert.deepStrictEqual(chooseNation(null, { drennia: 4, westmark: 1, eryndor: 0 }, cap, true), { countryId: 'drennia' });
    assert.deepStrictEqual(chooseNation(null, { drennia: cap, westmark: 1, eryndor: 0 }, cap, true), { countryId: 'westmark' });
  });
  it('when every nation is full the least crowded takes the overflow, unless overflow is off', () => {
    assert.deepStrictEqual(chooseNation('drennia', { drennia: cap + 2, westmark: cap, eryndor: cap + 1 }, cap, true), { countryId: 'westmark' });
    assert.ok('error' in chooseNation('drennia', { drennia: cap, westmark: cap, eryndor: cap }, cap, false));
  });
  it('nations that are not open cannot be chosen', () => {
    assert.ok('error' in chooseNation('novara', { drennia: 0, westmark: 0, eryndor: 0 }, cap, true));
  });
});

describe('Decrees', () => {
  it('every decree belongs to the Premier or a real cabinet post, and costs something', () => {
    const posts = new Set(['premier', ...CABINET_POSTS.map(p => p.key)]);
    const keys = new Set<string>();
    for (const d of DECREES) {
      assert.ok(posts.has(d.office), `${d.key}: unknown office ${d.office}`);
      assert.ok(!keys.has(d.key)); keys.add(d.key);
      const moves = Object.values(d.stat).filter(Boolean) as number[];
      assert.ok(moves.length >= 2, `${d.key} must move at least two statistics`);
      const better = Object.entries(d.stat).some(([k, v]) => (k === 'cost_of_living' ? (v as number) < 0 : (v as number) > 0));
      const worse = Object.entries(d.stat).some(([k, v]) => (k === 'cost_of_living' ? (v as number) > 0 : (v as number) < 0));
      assert.ok(better && worse, `${d.key} must be a trade-off, not a free gain`);
      for (const v of moves) assert.ok(Math.abs(v) <= 3, `${d.key}: a single decree may move a statistic by at most 3`);
    }
    for (const p of CABINET_POSTS) assert.ok(DECREES.some(d => d.office === p.key), `the ${p.short} minister has no decree`);
  });
});
