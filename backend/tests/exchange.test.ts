/**
 * DRX Bourse: reading the order book never writes, and the specialist's monthly
 * quotes never create shares. Pure rules in services/exchange.rules.ts; numbers in
 * constants/exchange.ts. getOrderBook is exercised against a recording fake
 * connection, so no database is needed.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOrderBook, TOTAL_SHARES } from '../src/api/services/shareMarket.service';
import { marketMakerQuotes, openingPrice } from '../src/api/services/exchange.rules';
import { MM_LADDER, MM_MIN_PRICE, OPENING_PRICE_FLOOR, SHARES_PER_COMPANY } from '../src/api/constants/exchange';

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
