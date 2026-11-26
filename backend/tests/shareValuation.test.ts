/**
 * DRX Bourse fair value: listed shares are priced on what a company owns AND what
 * it earns, so a highly profitable NPC rival is not an easy win for Capital Partners.
 * Pure rules in services/shareValuation.rules.ts; numbers in constants/shareValuation.ts.
 * Assertions are ratios (P/E, price / book, returns), not exact prices.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  averageMonthlyProfit, fairValuePerShare, fairValuePull, isEarningsBar, marketMakerAnchor, profitsFromBars,
  stepTowardFairValue,
} from '../src/api/services/shareValuation.rules';
import {
  EXCESS_PROFIT_YEARS, FAIR_VALUE_BOOK_FLOOR, FAIR_VALUE_PROFIT_MONTHS, FAIR_VALUE_PULL_BASE, FAIR_VALUE_PULL_VERY_FAR,
  MIN_SHARE_PRICE, NPC_TREASURY_ORDER_DISCOUNT, SHARE_HURDLE_RATE_YEARLY,
} from '../src/api/constants/shareValuation';

const SHARES = 1_000_000;
const months = (n: number, profit: number) => Array.from({ length: n }, () => profit);
const fv = (book: number, profit: number, history = FAIR_VALUE_PROFIT_MONTHS) =>
  fairValuePerShare({ bookValue: book, monthlyProfits: months(history, profit), shares: SHARES });
const peRatio = (price: number, monthlyProfit: number) => price / ((12 * monthlyProfit) / SHARES);

// The local playthrough that found the bug: Valuecorp, book ~$29M, ~$3.7M a month.
const VALUECORP_BOOK = 29_000_000;
const VALUECORP_PROFIT = 3_700_000;

describe('Fair value prices earnings, not just book value', () => {
  it('Valuecorp trades at a believable P/E (old price ~$14 was a P/E of 0.3)', () => {
    const price = fv(VALUECORP_BOOK, VALUECORP_PROFIT);
    const pe = peRatio(price, VALUECORP_PROFIT);
    assert.ok(pe >= 4 && pe <= 9, `P/E ${pe.toFixed(2)} should be 4-9`);
    assert.ok(price / (VALUECORP_BOOK / SHARES) > 3, 'a 150%-a-year earner is worth far more than book');
  });

  it('still a believable P/E after the NPC rebalance cuts profits 3x or 7x', () => {
    for (const cut of [3, 7]) {
      const profit = VALUECORP_PROFIT / cut;
      const pe = peRatio(fv(VALUECORP_BOOK, profit), profit);
      assert.ok(pe >= 4 && pe <= 9, `cut ${cut}x: P/E ${pe.toFixed(2)} should be 4-9`);
    }
  });

  it('more profit is worth more, and lower profit less, at the same book value', () => {
    const base = fv(VALUECORP_BOOK, VALUECORP_PROFIT / 7);
    assert.ok(fv(VALUECORP_BOOK, VALUECORP_PROFIT / 3) > base);
    assert.ok(fv(VALUECORP_BOOK, VALUECORP_PROFIT) > fv(VALUECORP_BOOK, VALUECORP_PROFIT / 3));
  });

  it('a firm earning exactly the hurdle rate is worth exactly its book value', () => {
    const book = 5_000_000;
    const hurdleProfit = (SHARE_HURDLE_RATE_YEARLY * book) / 12;
    const ratio = fv(book, hurdleProfit) / (book / SHARES);
    assert.ok(Math.abs(ratio - 1) < 1e-9, `price / book ${ratio}`);
  });

  it('a firm earning below the hurdle trades below book, but not below the floor', () => {
    const book = 5_000_000;
    const ratio = fv(book, (0.06 * book) / 12) / (book / SHARES);
    assert.ok(ratio < 1 && ratio >= FAIR_VALUE_BOOK_FLOOR, `price / book ${ratio}`);
  });

  it('any loss-maker sits on the floor (half of what it owns), never below', () => {
    // With a 12% hurdle over 5 years, anything earning under ~2% a year on book reaches the floor.
    const book = 5_000_000;
    for (const loss of [-5_000, -100_000, -1_000_000]) {
      const ratio = fv(book, loss) / (book / SHARES);
      assert.ok(Math.abs(ratio - FAIR_VALUE_BOOK_FLOOR) < 1e-9, `loss ${loss}: price / book ${ratio}`);
    }
  });

  it('an insolvent loss-maker is priced at the minimum, never zero or negative', () => {
    assert.equal(fairValuePerShare({ bookValue: -2_000_000, monthlyProfits: [-100_000], shares: SHARES }), MIN_SHARE_PRICE);
    assert.equal(fairValuePerShare({ bookValue: 1_000_000, monthlyProfits: [50_000], shares: 0 }), MIN_SHARE_PRICE);
    assert.equal(fairValuePerShare({ bookValue: NaN, monthlyProfits: [NaN], shares: SHARES }), MIN_SHARE_PRICE);
  });

  it('extra profit years scale the above-hurdle part, not book value', () => {
    const book = 10_000_000;
    const profit = 500_000;
    const excessPerShare = fv(book, profit) - book / SHARES;
    const expected = (EXCESS_PROFIT_YEARS * (12 * profit - SHARE_HURDLE_RATE_YEARLY * book)) / SHARES;
    assert.ok(Math.abs(excessPerShare / expected - 1) < 1e-9);
  });
});

describe('Profit is averaged so one odd month does not swing the price', () => {
  it('one spike month moves fair value by 1/N of a lasting change', () => {
    const book = 20_000_000;
    const base = fv(book, 400_000);
    const lasting = fv(book, 800_000);
    const spike = fairValuePerShare({
      bookValue: book, monthlyProfits: [800_000, ...months(FAIR_VALUE_PROFIT_MONTHS - 1, 400_000)], shares: SHARES,
    });
    const ratio = (spike - base) / (lasting - base);
    assert.ok(Math.abs(ratio - 1 / FAIR_VALUE_PROFIT_MONTHS) < 1e-9, `spike share ${ratio}`);
  });

  it('only the newest N months count', () => {
    const recent = months(FAIR_VALUE_PROFIT_MONTHS, 100);
    assert.equal(averageMonthlyProfit([...recent, 1_000_000, 1_000_000]), 100);
    assert.equal(averageMonthlyProfit([]), 0);
  });

  it('opening bars with a placeholder eps of 0 are not read as a month of zero profit', () => {
    const bars = [
      { eps: 2, analyst_estimate: 1_900_000 },   // monthly bar
      { eps: 0, analyst_estimate: null },        // IPO / spawn opening bar
      { eps: 1, analyst_estimate: '900000.00' }, // monthly bar (numeric comes back as text)
    ];
    assert.equal(bars.filter(isEarningsBar).length, 2);
    assert.deepEqual(profitsFromBars(bars, SHARES), [2 * SHARES, 1 * SHARES]);
  });
});

describe('The monthly price moves toward fair value', () => {
  it('converges from far below and from far above without overshooting', () => {
    for (const start of [1, 1_000]) {
      const target = 100;
      let price = start;
      for (let m = 0; m < 36; m++) {
        const next = stepTowardFairValue(price, target);
        if (start < target) assert.ok(next <= target && next >= price);
        else assert.ok(next >= target && next <= price);
        price = next;
      }
      assert.ok(Math.abs(price / target - 1) < 0.01, `from ${start}: ended at ${price}`);
    }
  });

  it('catches up faster when the price is far below fair value', () => {
    assert.ok(fairValuePull(400, 100) > fairValuePull(120, 100));
    assert.equal(fairValuePull(400, 100), FAIR_VALUE_PULL_VERY_FAR);
    assert.equal(fairValuePull(50, 100), FAIR_VALUE_PULL_BASE);
  });

  it('a never-priced share is quoted at fair value; a priced one takes one step', () => {
    assert.equal(marketMakerAnchor(null, 235), 235);
    assert.equal(marketMakerAnchor(0, 235), 235);
    assert.equal(marketMakerAnchor(100, 235), stepTowardFairValue(100, 235));
  });
});

describe('Holding an NPC share is no longer an easy win', () => {
  // 24 months of steady profit, all retained (book grows by the profit), no trades:
  // the price takes one step toward its target each month, as the monthly bar does.
  function monthlyReturn(target: (book: number) => number): number {
    let book = VALUECORP_BOOK;
    book += VALUECORP_PROFIT;
    let price = target(book); // starts at its target, so only the steady drift counts
    const first = price;
    for (let m = 2; m <= 24; m++) {
      book += VALUECORP_PROFIT;
      price = stepTowardFairValue(price, target(book));
    }
    return (price / first) ** (1 / 23) - 1;
  }

  it('steady monthly return stays below the shareholder hurdle, and far below the old book-only anchor', () => {
    const proposed = monthlyReturn((book) => fv(book, VALUECORP_PROFIT));
    const bookOnly = monthlyReturn((book) => book / SHARES);
    assert.ok(proposed < SHARE_HURDLE_RATE_YEARLY / 12, `proposed ${(proposed * 100).toFixed(2)}%/month`);
    assert.ok(proposed / bookOnly < 0.25, `proposed ${(proposed * 100).toFixed(2)}% vs book-only ${(bookOnly * 100).toFixed(2)}% a month`);
  });
});

describe('Trades at NPC treasury offers cannot drag the price away from fair value', () => {
  // The month's close is the last trade. If someone buys the treasury's discounted
  // share sale every month, that sale's price becomes the close.
  it('offers priced off the anchor stay close to fair value; offers off last close slid without limit', () => {
    const fair = 100;
    let anchored = fair;
    let oldWay = fair;
    for (let m = 0; m < 60; m++) {
      anchored = marketMakerAnchor(anchored, fair) * (1 - NPC_TREASURY_ORDER_DISCOUNT);
      oldWay = oldWay * (1 - NPC_TREASURY_ORDER_DISCOUNT);
    }
    assert.ok(anchored / fair > 0.85, `anchored offers settle at ${(anchored / fair).toFixed(3)} x fair value`);
    assert.ok(oldWay / fair < 0.35, `last-close offers slid to ${(oldWay / fair).toFixed(3)} x fair value`);
  });
});
