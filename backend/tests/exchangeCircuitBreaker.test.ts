/**
 * A player order refused by the circuit breaker leaves a record
 * (share_orders: status 'cancelled', rejected_circuit_breaker true) and moves
 * nothing: no cash escrowed, no shares locked, no trade.
 *
 * The record used to be inserted and then the error thrown INSIDE the order's
 * transaction, which rolled the insert back, so no refusal was ever saved. Only
 * a real database shows whether a row survives a transaction, so this test builds
 * its own throwaway database (helpers/throwawayDb.ts) and skips when no local
 * Postgres is available (CI).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openThrowawayDb } from './helpers/throwawayDb';

test('a circuit-breaker refusal is recorded and moves no cash or shares', async (t) => {
  const tmp = await openThrowawayDb('circuit_breaker');
  if ('skip' in tmp) { t.skip(tmp.skip); return; }
  process.env.DATABASE_URL = tmp.url; // before importing src/config/*

  const { db, runMigrationsAndSeeds } = await import('../src/config/database');
  try {
    await runMigrationsAndSeeds();
    const { placeOrder } = await import('../src/api/services/shareMarket.service');
    const { processExchangeMonth } = await import('../src/api/services/ipoExchange.service');
    const { CIRCUIT_BREAKER_LIMIT } = await import('../src/api/constants/exchange');

    // One month end gives every listed rival a first close and market-maker quotes.
    const clock = await db('world_clock').first();
    await db.transaction((trx) => processExchangeMonth(trx, clock.current_year, clock.current_month));
    const company = await db('companies').where({ is_npc: true, is_exchange_listed: true }).orderBy('name').first();
    assert.ok(company, 'a listed rival exists');
    const bar = await db('share_price_history').where({ company_id: company.id })
      .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }]).first();
    const lastClose = Number(bar.close_price);
    assert.ok(lastClose > 0);

    // A player with cash.
    const [user] = await db('users').insert({ email: `cb_${Date.now()}@example.invalid`, password_hash: 'x' }).returning('*');
    const [ch] = await db('characters').insert({
      user_id: user.id, world_instance_id: clock.world_instance_id || 'pre-alpha-world-1', motherland_country_id: 'drennia',
      name: 'Breaker Tester', age: 30, created_at_world_year: 0, created_at_world_month: 0, created_at_world_day: 0,
    }).returning('*');
    const startCash = 1_000_000;
    await db('character_finances').insert({ character_id: ch.id, currency_id: 'dollar', cash_in_hand: startCash, net_worth: startCash });

    const ordersOf = () => db('share_orders').where({ character_id: ch.id, company_id: company.id });
    const cashOf = async () => Number((await db('character_finances').where({ character_id: ch.id }).first()).cash_in_hand);
    const sharesOutstanding = async () => {
      const h = await db('company_shares').where({ company_id: company.id }).sum('shares as n').first();
      const l = await db('share_orders').where({ company_id: company.id, side: 'sell', status: 'open' })
        .sum({ n: db.raw('quantity - filled_quantity') }).first();
      return Number(h?.n || 0) + Number(l?.n || 0);
    };
    const sharesBefore = await sharesOutstanding();

    // 1. Just beyond the limit: refused, and the refusal is saved.
    const tooHigh = lastClose * (1 + CIRCUIT_BREAKER_LIMIT * 1.5);
    await assert.rejects(
      placeOrder({ companyId: company.id, characterId: ch.id, side: 'buy', price: tooHigh, quantity: 100 }),
      (err: any) => err?.errorCode === 'CIRCUIT_BREAKER' && err?.statusCode === 400,
    );
    const afterRefusal = await ordersOf();
    assert.equal(afterRefusal.length, 1, 'the refused order is recorded');
    const rec = afterRefusal[0];
    assert.equal(rec.rejected_circuit_breaker, true);
    assert.equal(rec.status, 'cancelled');
    assert.equal(Number(rec.escrow_amount), 0);
    assert.equal(Number(rec.filled_quantity), 0);
    assert.ok(Math.abs(Number(rec.price) / tooHigh - 1) < 1e-6);
    assert.equal(await cashOf() / startCash, 1, 'no cash moved');
    assert.equal(await sharesOutstanding() / sharesBefore, 1, 'no shares created or locked');
    assert.equal((await db('share_trades').where({ buyer_character_id: ch.id })).length, 0, 'no trade');

    // 2. Inside the limit: a normal order, not marked as refused.
    const inside = lastClose * (1 + CIRCUIT_BREAKER_LIMIT * 0.5);
    const placed: any = await placeOrder({ companyId: company.id, characterId: ch.id, side: 'buy', price: inside, quantity: 100 });
    assert.equal(placed.order.rejected_circuit_breaker, false);
    assert.equal((await ordersOf()).filter((o: any) => o.rejected_circuit_breaker).length, 1, 'still exactly one refusal on record');
  } finally {
    await db.destroy();
    await tmp.drop();
  }
});
