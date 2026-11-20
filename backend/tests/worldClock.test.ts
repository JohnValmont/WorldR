/**
 * World clock: the business and politics months turn together (worldClock.rules.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { alignedNextClose, clockMs } from '../src/api/services/worldClock.rules';
import { DEFAULT_REAL_SECONDS_PER_MONTH } from '../src/api/constants/world';

const MONTH = DEFAULT_REAL_SECONDS_PER_MONTH * 1000;
const T = Date.UTC(2026, 10, 20, 4, 52);
const H = 60 * 60 * 1000;

describe('Both clocks turn together', () => {
  it('a scheduled turn: the first clock to tick keeps its own schedule (the other is due now)', () => {
    assert.strictEqual(alignedNextClose({ ownNext: T + MONTH, otherNext: T, now: T + 1000, intervalMs: MONTH }), T + MONTH);
  });

  it('the second clock in the same pass lands on exactly the same moment', () => {
    const bizNext = T + MONTH;
    assert.strictEqual(alignedNextClose({ ownNext: T + MONTH, otherNext: bizNext, now: T + 2000, intervalMs: MONTH }), bizNext);
  });

  it('an admin force-tick mid-month ends the month when the other clock\'s month ends', () => {
    const now = T + 5 * H;            // forced 5 hours into the month
    const otherNext = T + MONTH;      // the other clock still turns at its time
    const forced = alignedNextClose({ ownNext: now + MONTH, otherNext, now, intervalMs: MONTH });
    assert.strictEqual(forced, otherNext);
    assert.ok(forced - now < MONTH, 'the forced month is shorter, never longer, than a normal one');
  });

  it('a clock catching up after downtime keeps catching up month by month', () => {
    // Politics is three months behind; business already caught up and turns 2 hours from now.
    const now = T;
    const ownNext = T - 2 * MONTH;
    assert.strictEqual(alignedNextClose({ ownNext, otherNext: T + 2 * H, now, intervalMs: MONTH }), ownNext);
    // On the last catch-up month it joins the other clock.
    assert.strictEqual(alignedNextClose({ ownNext: T - 1 * H, otherNext: T + 2 * H, now, intervalMs: MONTH }), T + 2 * H);
  });

  it('never moves onto a time that has already passed, or a missing one', () => {
    assert.strictEqual(alignedNextClose({ ownNext: T + MONTH, otherNext: T - H, now: T, intervalMs: MONTH }), T + MONTH);
    assert.strictEqual(alignedNextClose({ ownNext: T + MONTH, otherNext: null, now: T, intervalMs: MONTH }), T + MONTH);
    assert.strictEqual(alignedNextClose({ ownNext: T + MONTH, otherNext: NaN, now: T, intervalMs: MONTH }), T + MONTH);
  });

  it('reads timestamp columns', () => {
    assert.strictEqual(clockMs('2026-11-20T04:52:00.000Z'), T);
    assert.strictEqual(clockMs(new Date(T)), T);
    assert.strictEqual(clockMs(null), null);
    assert.strictEqual(clockMs('not a date'), null);
  });
});
