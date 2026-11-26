/**
 * DRX Bourse: reading the order book never writes, and the specialist's monthly
 * quotes never create shares. Pure rules in services/exchange.rules.ts; numbers in
 * constants/exchange.ts. getOrderBook is exercised against a recording fake
 * connection, so no database is needed.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOrderBook, TOTAL_SHARES } from '../src/api/services/shareMarket.service';
import {
  circuitBreakerBand, marketMakerQuotes, npcOwnerTargetShares, openingPrice, tripsCircuitBreaker,
} from '../src/api/services/exchange.rules';
import {
  CIRCUIT_BREAKER_LIMIT, MM_LADDER, MM_MIN_PRICE, OPENING_PRICE_FLOOR, SHARES_PER_COMPANY,
} from '../src/api/constants/exchange';
import { getExchangeRules } from '../src/api/services/shareMarket.service';
import fs from 'fs';
import path from 'path';

const WRITE_METHODS = new Set([
  'insert', 'update', 'del', 'delete', 'increment', 'decrement', 'upsert', 'merge', 'truncate', 'forUpdate',
]);

/** A knex-like connection that records every table and method used and answers reads with `rows[side]`. */
function recordingConn(rows: { buy: any[]; sell: any[] }) {
  const calls: Array<{ table: string; method: string; args: any[] }> = [];
  const conn: any = (table: string) => {
    let side: 'buy' | 'sell' | null = null;
    const builder: any = new Proxy({}, {
      get(_t, method: string) {
        if (method === 'then') {
          const result = side ? rows[side] : [];
          return (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
        }
        return (...args: any[]) => {
          calls.push({ table, method, args });
          if (method === 'where' && args[0] && typeof args[0] === 'object' && args[0].side) side = args[0].side;
          return builder;
        };
      },
    });
    return builder;
  };
  conn.raw = (sql: string) => ({ raw: sql });
  conn.transaction = () => { calls.push({ table: '-', method: 'transaction', args: [] }); };
  return { conn, calls };
}

describe('Reading the order book never writes', () => {
  it('an empty book comes back as two empty sides, with no writes', async () => {
    const { conn, calls } = recordingConn({ buy: [], sell: [] });
    const book = await getOrderBook('co-1', conn);
    assert.deepEqual(book, { bids: [], asks: [] });
    const writes = calls.filter((c) => WRITE_METHODS.has(c.method) || c.method === 'transaction');
    assert.deepEqual(writes, [], `no write calls, got ${JSON.stringify(writes)}`);
  });

  it('touches only share_orders: no cash, cap-table, user or order placement', async () => {
    const { conn, calls } = recordingConn({ buy: [], sell: [] });
    await getOrderBook('co-1', conn);
    const tables = new Set(calls.map((c) => c.table));
    assert.deepEqual([...tables], ['share_orders']);
  });

  it('returns the open orders it reads, best price first, as numbers', async () => {
    const { conn, calls } = recordingConn({
      buy: [{ price: '9.90', quantity: '300' }, { price: '9.50', quantity: '100' }],
      sell: [{ price: '10.10', quantity: '250' }],
    });
    const book = await getOrderBook('co-1', conn);
    assert.deepEqual(book.bids, [{ price: 9.9, quantity: 300 }, { price: 9.5, quantity: 100 }]);
    assert.deepEqual(book.asks, [{ price: 10.1, quantity: 250 }]);
    const orderBys = calls.filter((c) => c.method === 'orderBy').map((c) => c.args[1]);
    assert.deepEqual(orderBys.sort(), ['asc', 'desc']);
    for (const c of calls.filter((x) => x.method === 'where')) {
      assert.equal(c.args[0].status, 'open', 'only open orders are shown');
      assert.equal(c.args[0].company_id, 'co-1');
    }
  });
});

describe('The specialist quotes a ladder and never sells shares it does not hold', () => {
  const anchor = 12.5;

  it('the ladder is well formed: offsets strictly increase and stay below 1', () => {
    assert.ok(MM_LADDER.length >= 1);
    for (let i = 0; i < MM_LADDER.length; i++) {
      assert.ok(MM_LADDER[i].offset > 0 && MM_LADDER[i].offset < 1);
      assert.ok(Number.isInteger(MM_LADDER[i].shares) && MM_LADDER[i].shares > 0);
      if (i > 0) assert.ok(MM_LADDER[i].offset > MM_LADDER[i - 1].offset);
    }
    // A month of quotes on one side is a minority of the company.
    const perSide = MM_LADDER.reduce((s, t) => s + t.shares, 0);
    assert.ok(perSide / SHARES_PER_COMPANY < 0.10, `per-side depth ${perSide}`);
  });

  it('the first tier is the original quote: 2.5% spread around the anchor', () => {
    const q = marketMakerQuotes(anchor, SHARES_PER_COMPANY);
    const bestBid = Math.max(...q.filter((x) => x.side === 'buy').map((x) => x.price));
    const bestAsk = Math.min(...q.filter((x) => x.side === 'sell').map((x) => x.price));
    assert.ok(Math.abs((bestAsk - bestBid) / anchor - 0.025) < 1e-6);
  });

  it('prices scale with the anchor (ratios, not dollar amounts)', () => {
    const a = marketMakerQuotes(anchor, SHARES_PER_COMPANY);
    const b = marketMakerQuotes(anchor * 4, SHARES_PER_COMPANY);
    assert.equal(a.length, b.length);
    a.forEach((qa, i) => {
      assert.equal(qa.side, b[i].side);
      assert.equal(qa.quantity, b[i].quantity);
      assert.ok(Math.abs(b[i].price / qa.price - 4) < 1e-3);
    });
    for (const q of a) {
      const ratio = q.price / anchor;
      assert.ok(q.side === 'buy' ? ratio < 1 : ratio > 1, 'bids below, asks above the anchor');
    }
  });

  it('bids and asks never cross, and deeper tiers cost more', () => {
    const q = marketMakerQuotes(anchor, SHARES_PER_COMPANY);
    const bids = q.filter((x) => x.side === 'buy');
    const asks = q.filter((x) => x.side === 'sell');
    assert.ok(Math.max(...bids.map((x) => x.price)) < Math.min(...asks.map((x) => x.price)));
    for (let i = 1; i < asks.length; i++) assert.ok(asks[i].price > asks[i - 1].price);
    for (let i = 1; i < bids.length; i++) assert.ok(bids[i].price < bids[i - 1].price);
  });

  it('asks never offer more than the specialist holds', () => {
    const full = MM_LADDER.reduce((s, t) => s + t.shares, 0);
    for (const inventory of [0, 1, 4_999, 5_000, 12_345, full - 1, full, full * 3]) {
      const asks = marketMakerQuotes(anchor, inventory).filter((x) => x.side === 'sell');
      const offered = asks.reduce((s, x) => s + x.quantity, 0);
      assert.ok(offered <= inventory, `inventory ${inventory}, offered ${offered}`);
      assert.equal(offered, Math.min(inventory, full));
      for (const a of asks) assert.ok(a.quantity > 0);
    }
  });

  it('with no shares the specialist still bids (buying needs cash, not shares)', () => {
    const q = marketMakerQuotes(anchor, 0);
    assert.equal(q.filter((x) => x.side === 'sell').length, 0);
    assert.equal(q.filter((x) => x.side === 'buy').length, MM_LADDER.length);
  });

  it('no quotes for a missing or broken anchor; tiny anchors stay at the minimum price', () => {
    for (const bad of [0, -1, NaN, Infinity]) assert.deepEqual(marketMakerQuotes(bad, 1000), []);
    for (const q of marketMakerQuotes(0.005, 1000)) assert.ok(q.price >= MM_MIN_PRICE);
  });
});

describe('A listed computer company with no price opens at book value per share', () => {
  it('opening price is proportional to book value', () => {
    const p1 = openingPrice(1_500_000);
    const p2 = openingPrice(3_000_000);
    assert.ok(Math.abs(p2 / p1 - 2) < 1e-9);
    assert.ok(Math.abs(p1 / (1_500_000 / SHARES_PER_COMPANY) - 1) < 1e-9);
  });
  it('never opens below the floor, even with no or negative book value', () => {
    for (const bv of [0, -5_000_000, NaN]) assert.equal(openingPrice(bv), OPENING_PRICE_FLOOR);
    assert.equal(openingPrice(1_000_000, 0), OPENING_PRICE_FLOOR);
  });
  it('the exchange share count is the one constant', () => {
    assert.equal(TOTAL_SHARES, SHARES_PER_COMPANY);
  });
});

describe('The circuit breaker: one number, the same on the server and the screen', () => {
  const close = 8;

  it('refuses orders just beyond the limit and allows orders just inside it (ratios of last close)', () => {
    const L = CIRCUIT_BREAKER_LIMIT;
    assert.equal(tripsCircuitBreaker(close * (1 + L * 0.99), close), false);
    assert.equal(tripsCircuitBreaker(close * (1 - L * 0.99), close), false);
    assert.equal(tripsCircuitBreaker(close * (1 + L * 1.01), close), true);
    assert.equal(tripsCircuitBreaker(close * (1 - L * 1.01), close), true);
    // Same verdict at any price level.
    for (const k of [0.01, 1, 250]) {
      assert.equal(tripsCircuitBreaker(close * k * (1 + L * 1.01), close * k), true);
      assert.equal(tripsCircuitBreaker(close * k * (1 + L * 0.99), close * k), false);
    }
  });

  it('the band the screen draws is exactly the range the server allows', () => {
    const band = circuitBreakerBand(close)!;
    assert.ok(Math.abs(band.lo / close - (1 - CIRCUIT_BREAKER_LIMIT)) < 1e-12);
    assert.ok(Math.abs(band.hi / close - (1 + CIRCUIT_BREAKER_LIMIT)) < 1e-12);
    assert.equal(tripsCircuitBreaker(band.lo, close), false);
    assert.equal(tripsCircuitBreaker(band.hi, close), false);
  });

  it('no limit before the first monthly close', () => {
    assert.equal(circuitBreakerBand(null), null);
    assert.equal(tripsCircuitBreaker(1_000_000, null), false);
    assert.equal(tripsCircuitBreaker(1_000_000, 0), false);
  });

  it('GET /exchange/rules serves the constant', () => {
    assert.equal(getExchangeRules().circuit_breaker_limit, CIRCUIT_BREAKER_LIMIT);
  });

  it('the exchange screen hard-codes no breaker number', () => {
    const page = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/drennia/exchange/page.tsx'), 'utf8');
    const lines = page.split('\n').filter((l) => /circuit/i.test(l));
    assert.ok(lines.length > 0);
    for (const l of lines) assert.ok(!/\d+\s*%/.test(l), `hard-coded percentage: ${l.trim()}`);
    assert.ok(!/lastClose \* 0\.8|lastClose \* 1\.2/.test(page), 'band must come from the served limit');
  });
});

describe('Admin NPC share backfill counts shares locked in open sell orders', () => {
  it('owner + others + locked always add up to the total', () => {
    for (const [others, locked] of [[0, 0], [120_000, 0], [0, 75_000], [120_000, 75_000], [400_000, 90_000]]) {
      const { target, excess } = npcOwnerTargetShares(others, locked);
      assert.equal(excess, 0);
      assert.equal(target + others + locked, SHARES_PER_COMPANY);
    }
  });

  it('the owner never gets its own open asks twice (the old bug)', () => {
    // Owner holds 925,000 and has 75,000 locked in its own open asks: already exactly 1,000,000.
    const { target } = npcOwnerTargetShares(0, 75_000);
    assert.equal(target, 925_000);
    // The old rule (total - others) would have handed back the locked 75,000 a second time.
    assert.ok((target + 75_000) / SHARES_PER_COMPANY === 1);
  });

  it('scales with the total (ratios)', () => {
    const a = npcOwnerTargetShares(SHARES_PER_COMPANY * 0.2, SHARES_PER_COMPANY * 0.05);
    assert.ok(Math.abs(a.target / SHARES_PER_COMPANY - 0.75) < 1e-12);
    const b = npcOwnerTargetShares(2_000 * 0.2, 2_000 * 0.05, 2_000);
    assert.ok(Math.abs(b.target / 2_000 - 0.75) < 1e-12);
  });

  it('when others already hold more than the total, the owner gets 0 and the excess is reported', () => {
    const { target, excess } = npcOwnerTargetShares(SHARES_PER_COMPANY * 0.9, SHARES_PER_COMPANY * 0.3);
    assert.equal(target, 0);
    assert.ok(Math.abs(excess / SHARES_PER_COMPANY - 0.2) < 1e-9);
  });

  it('bad inputs never produce a negative or non-number holding', () => {
    for (const [o, l] of [[NaN, 0], [-5, 0], [0, -5], [undefined as any, null as any]]) {
      const { target, excess } = npcOwnerTargetShares(o, l);
      assert.ok(Number.isFinite(target) && target >= 0 && target <= SHARES_PER_COMPANY);
      assert.ok(Number.isFinite(excess) && excess >= 0);
    }
  });
});
