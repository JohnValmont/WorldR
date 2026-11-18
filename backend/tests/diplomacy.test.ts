/**
 * Diplomacy (docs/NATIONS_SIMULATION.md, layer 5): relations, treaties, and
 * what treaties do to trade and the rating. Pure rules only, ratio-based.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as D from '../src/api/services/diplomacy.rules';
import * as R from '../src/api/services/nationSim.rules';
import { billTitle, changeDesirability } from '../src/api/services/statecraft.service';
import {
  NPC_EMBARGO_MAX_RELATIONS, PACT_MIN_RELATIONS, RELATIONS_MAX, RELATIONS_MIN, RELATIONS_START, TREATY_CATEGORY,
  TREATY_KINDS, TREATY_SPECS,
} from '../src/api/constants/diplomacy';
import { NPC_BILL_MIN_GAIN, STARTER_NATIONS } from '../src/api/constants/nations';
import { NATIONAL_STATS } from '../src/api/constants/macroEconomy';

const FREE_TRADER = { taxation: 85, labour: 30, investment: 65, trade: 90, stability: 55 };
const PROTECTIONIST = { taxation: 30, labour: 86, investment: 75, trade: 38, stability: 50 };
const ORDER_PARTY = { taxation: 55, labour: 55, investment: 55, trade: 45, stability: 82 };

describe('Treaty bills use the ordinary bill machinery', () => {
  it('a treaty option round-trips', () => {
    assert.deepStrictEqual(D.parseTreatyOption(D.treatyOption('trade_pact', 'westmark')), { kind: 'trade_pact', partner: 'westmark' });
    assert.strictEqual(D.parseTreatyOption('nonsense'), null);
    assert.strictEqual(D.parseTreatyOption('alliance:westmark'), null);
  });
  it('the bill title names the treaty and the partner', () => {
    assert.strictEqual(billTitle(TREATY_CATEGORY, D.treatyOption('trade_pact', 'westmark')), 'Trade pact with Westmark');
  });
  it('parties judge a treaty bill by their platform, on the same scale as laws', () => {
    const opt = D.treatyOption('trade_pact', 'westmark');
    assert.strictEqual(changeDesirability(FREE_TRADER as any, TREATY_CATEGORY, 'none', opt), D.treatyLiking(FREE_TRADER, 'trade_pact'));
    assert.ok(D.treatyLiking(FREE_TRADER, 'trade_pact') > NPC_BILL_MIN_GAIN, 'free traders back trade pacts clearly');
  });
});

describe('Who likes what', () => {
  it('free traders like trade pacts more than protectionists do', () => {
    assert.ok(D.treatyLiking(FREE_TRADER, 'trade_pact') > D.treatyLiking(PROTECTIONIST, 'trade_pact'));
  });
  it('parties of order like defence pacts most', () => {
    assert.ok(D.treatyLiking(ORDER_PARTY, 'defence_pact') > D.treatyLiking(FREE_TRADER, 'defence_pact'));
  });
  it('nobody likes an embargo much, free traders least', () => {
    for (const p of [FREE_TRADER, PROTECTIONIST, ORDER_PARTY]) assert.ok(D.treatyLiking(p, 'embargo') < 0.1);
    assert.ok(D.treatyLiking(FREE_TRADER, 'embargo') < D.treatyLiking(PROTECTIONIST, 'embargo'));
  });
  it('every treaty kind has a spec', () => {
    for (const k of TREATY_KINDS) assert.ok(TREATY_SPECS[k]);
  });
});

describe('Relations', () => {
  it('drift back toward neutral when nothing happens', () => {
    assert.ok(D.stepRelations({ score: 80, active: [], tariffA: 0.1, tariffB: 0.1 }) < 80);
    assert.ok(D.stepRelations({ score: 20, active: [], tariffA: 0.1, tariffB: 0.1 }) > 20);
  });
  it('pacts warm them, embargoes freeze them, high tariffs sour them', () => {
    const base = D.stepRelations({ score: 50, active: [], tariffA: 0.1, tariffB: 0.1 });
    assert.ok(D.stepRelations({ score: 50, active: ['trade_pact'], tariffA: 0.1, tariffB: 0.1 }) > base);
    assert.ok(D.stepRelations({ score: 50, active: ['embargo'], tariffA: 0.1, tariffB: 0.1 }) < base);
    assert.ok(D.stepRelations({ score: 50, active: [], tariffA: 0.25, tariffB: 0.1 }) < base);
  });
  it('stay between 0 and 100', () => {
    assert.strictEqual(D.bumpRelations(RELATIONS_MAX - 1, 50), RELATIONS_MAX);
    assert.strictEqual(D.bumpRelations(RELATIONS_MIN + 1, -50), RELATIONS_MIN);
  });
  it('a pair has one key whichever way round', () => {
    assert.deepStrictEqual(D.pairKey('westmark', 'eryndor'), D.pairKey('eryndor', 'westmark'));
  });
});

describe('What may be proposed', () => {
  const ok = { kind: 'trade_pact' as const, activeOrPending: [], relations: 50, monthsSinceRejected: null, rejectCooldown: 6, ratifierHasGovernment: true };
  it('a normal pact is fine', () => assert.strictEqual(D.proposalProblem(ok), null));
  it('no duplicates', () => assert.ok(D.proposalProblem({ ...ok, activeOrPending: ['trade_pact'] })));
  it('no pact with a nation under embargo', () => assert.ok(D.proposalProblem({ ...ok, activeOrPending: ['embargo'] })));
  it('no pact when relations are poor, but an embargo is allowed', () => {
    assert.ok(D.proposalProblem({ ...ok, relations: PACT_MIN_RELATIONS - 1 }));
    assert.strictEqual(D.proposalProblem({ ...ok, kind: 'embargo', relations: 5 }), null);
  });
  it('wait after a rejection', () => {
    assert.ok(D.proposalProblem({ ...ok, monthsSinceRejected: 2 }));
    assert.strictEqual(D.proposalProblem({ ...ok, monthsSinceRejected: 6 }), null);
  });
  it('somebody must be able to bring the bill', () => assert.ok(D.proposalProblem({ ...ok, ratifierHasGovernment: false })));
});

describe('Computer-led governments', () => {
  const friend = { partner: 'westmark', relations: 60, activeOrPending: [], coolingDown: [], partnerHasGovernment: true };
  it('a free-trade government offers a friend a trade pact', () => {
    assert.strictEqual(D.npcTreatyChoice(FREE_TRADER, [friend])?.kind, 'trade_pact');
  });
  it('never embargoes a friend, and does not repeat what is pending or cooling down', () => {
    assert.notStrictEqual(D.npcTreatyChoice(PROTECTIONIST, [friend])?.kind, 'embargo');
    assert.strictEqual(D.npcTreatyChoice(FREE_TRADER, [{ ...friend, activeOrPending: ['trade_pact'], coolingDown: ['defence_pact'] }]), null);
  });
  it('makes no pact with a nation it barely tolerates', () => {
    assert.strictEqual(D.npcTreatyChoice(FREE_TRADER, [{ ...friend, relations: NPC_EMBARGO_MAX_RELATIONS + 5 }]), null);
  });
});

// ─── Treaties in the world simulation ───────────────────────────────────────

function ctxOf(n: (typeof STARTER_NATIONS)[number], laws: Record<string, string> = {}): R.NationSimContext {
  const stats: Record<string, number> = {};
  for (const k of NATIONAL_STATS) stats[k] = n.baseStats?.[k] ?? 50;
  return { spec: R.economySpecFor(n.polStateCode), stats, laws: { ...R.foundingLaws(n.polStateCode), ...laws }, playerFactoryCapacity: 0 };
}
function tradeWith(links: Record<string, Record<string, R.TradeLink>>, laws: Record<string, Record<string, string>> = {}) {
  return R.computeTrade(STARTER_NATIONS.map(n => {
    const c = ctxOf(n, laws[n.polStateCode]);
    return { code: n.polStateCode, structural: R.structuralOutput(c, c.spec.population), tariffs: R.tariffRates(c.laws), foundingTariffs: R.tariffRates(R.foundingLaws(n.polStateCode)), links: links[n.polStateCode] };
  }));
}

describe('Treaties change trade', () => {
  const none = tradeWith({});
  it('an embargo stops trade between the two: the buyer pays, the seller loses sales', () => {
    const e = tradeWith({ westmark: { eryndor: 'embargo' }, eryndor: { westmark: 'embargo' } });
    assert.ok(Math.abs(e.westmark.balance) < Math.abs(none.westmark.balance), 'Westmark buys less');
    assert.ok(e.eryndor.balance < none.eryndor.balance, 'Eryndor sells less');
    assert.ok(e.westmark.efficiency < 1, 'Westmark makes at home, less efficiently');
    assert.ok((e.eryndor.mult.manufacturing ?? 1) < 1, 'Eryndor loses factory jobs');
  });
  it('world trade still adds up under an embargo', () => {
    const e = tradeWith({ westmark: { eryndor: 'embargo' }, eryndor: { westmark: 'embargo' } });
    const net = Object.values(e).reduce((a, t) => a + t.balance, 0);
    assert.ok(Math.abs(net) < 10, `net ${net}`);
  });
  it('a trade pact removes the tariff between the two: less tariff money, more sales for the partner', () => {
    // Drennia at moderate tariffs (its founding law) buys from Eryndor.
    const p = tradeWith({ national: { eryndor: 'pact' }, eryndor: { national: 'pact' } });
    assert.ok(p.national.tariffRevenue < none.national.tariffRevenue);
    assert.ok(p.eryndor.balance >= none.eryndor.balance);
  });
});

describe('Treaties change the rating', () => {
  const n = STARTER_NATIONS[0];
  const c = ctxOf(n);
  const s = R.initialState(c);
  const plain = R.describe(s, c);
  it('neutral relations and no treaties change nothing', () => {
    const same = R.describe(s, { ...c, diplomacy: { avgRelations: RELATIONS_START, diplomacyBonus: 0, militaryBonus: 0 } });
    assert.strictEqual(same.rating.score, plain.rating.score);
  });
  it('a defence pact lifts military and diplomacy', () => {
    const b = D.treatyRatingBonus(['defence_pact']);
    const m = R.describe(s, { ...c, diplomacy: { avgRelations: RELATIONS_START, diplomacyBonus: b.diplomacy, militaryBonus: b.military } });
    assert.ok(m.rating.pillars.military > plain.rating.pillars.military);
    assert.ok(m.rating.pillars.diplomacy > plain.rating.pillars.diplomacy);
  });
  it('good relations lift diplomacy; being embargoed lowers it', () => {
    const good = R.describe(s, { ...c, diplomacy: { avgRelations: 80, diplomacyBonus: 0, militaryBonus: 0 } });
    const bad = R.describe(s, { ...c, diplomacy: { avgRelations: 20, diplomacyBonus: D.treatyRatingBonus(['embargo']).diplomacy, militaryBonus: 0 } });
    assert.ok(good.rating.pillars.diplomacy > plain.rating.pillars.diplomacy);
    assert.ok(bad.rating.pillars.diplomacy < plain.rating.pillars.diplomacy);
  });
});
