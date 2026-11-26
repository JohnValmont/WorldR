/**
 * Pure rules for a listed share's fair value and the monthly move toward it.
 * Numbers in constants/shareValuation.ts; tests in tests/shareValuation.test.ts.
 * No database access here.
 */
import {
  EXCESS_PROFIT_YEARS, FAIR_VALUE_BOOK_FLOOR, FAIR_VALUE_FAR_GAP, FAIR_VALUE_PROFIT_MONTHS, FAIR_VALUE_PULL_BASE,
  FAIR_VALUE_PULL_FAR, FAIR_VALUE_PULL_VERY_FAR, FAIR_VALUE_VERY_FAR_GAP, MIN_SHARE_PRICE, SHARE_HURDLE_RATE_YEARLY,
} from '../constants/shareValuation';

export interface FairValueInput {
  /** company_finances.company_value (book value, whole company). */
  bookValue: number;
  /** Monthly profits for the whole company, newest first (this month, then earlier months). */
  monthlyProfits: number[];
  /** Shares on the cap table. */
  shares: number;
}

/**
 * A price bar that reports a real month of earnings. Opening bars written at a
 * listing (spawnNpc seed price, IPO clearing) carry eps 0 as a placeholder and no
 * analyst estimate; every monthly bar sets the estimate.
 */
export function isEarningsBar(bar: { analyst_estimate?: unknown }): boolean {
  return bar.analyst_estimate !== null && bar.analyst_estimate !== undefined;
}

/** Whole-company monthly profits from price bars (newest first), skipping placeholder bars. */
export function profitsFromBars(bars: Array<{ eps?: unknown; analyst_estimate?: unknown }>, shares: number): number[] {
  return bars.filter(isEarningsBar).map((b) => (Number(b.eps) || 0) * shares);
}

/** Average monthly profit over the newest FAIR_VALUE_PROFIT_MONTHS entries (0 when none). */
export function averageMonthlyProfit(monthlyProfits: number[]): number {
  const recent = monthlyProfits.filter((p) => Number.isFinite(p)).slice(0, FAIR_VALUE_PROFIT_MONTHS);
  if (recent.length === 0) return 0;
  return recent.reduce((s, p) => s + p, 0) / recent.length;
}

/**
 * Fair value per share: book value + EXCESS_PROFIT_YEARS x (yearly profit − hurdle
 * return on book), floored at FAIR_VALUE_BOOK_FLOOR x book and MIN_SHARE_PRICE.
 */
export function fairValuePerShare({ bookValue, monthlyProfits, shares }: FairValueInput): number {
  const book = Number.isFinite(bookValue) ? bookValue : 0;
  const owned = Math.max(0, book);
  const yearlyProfit = 12 * averageMonthlyProfit(monthlyProfits);
  const excessProfit = yearlyProfit - SHARE_HURDLE_RATE_YEARLY * owned;
  const total = Math.max(book + EXCESS_PROFIT_YEARS * excessProfit, FAIR_VALUE_BOOK_FLOOR * owned);
  const perShare = shares > 0 ? total / shares : 0;
  return Math.max(MIN_SHARE_PRICE, Number.isFinite(perShare) ? perShare : MIN_SHARE_PRICE);
}

/** Share of the gap to fair value the price closes this month. */
export function fairValuePull(fairValue: number, price: number): number {
  if (fairValue > price * FAIR_VALUE_VERY_FAR_GAP) return FAIR_VALUE_PULL_VERY_FAR;
  if (fairValue > price * FAIR_VALUE_FAR_GAP) return FAIR_VALUE_PULL_FAR;
  return FAIR_VALUE_PULL_BASE;
}

/** One month's step from `price` toward `fairValue` (never below MIN_SHARE_PRICE). */
export function stepTowardFairValue(price: number, fairValue: number): number {
  if (!(price > 0)) return Math.max(MIN_SHARE_PRICE, fairValue);
  return Math.max(MIN_SHARE_PRICE, price + (fairValue - price) * fairValuePull(fairValue, price));
}

/**
 * Where the market maker centres its quotes: one month's step from the last close
 * toward fair value, or fair value itself for a share that was never priced.
 * Used by the monthly quotes (ipoExchange Step F) and the order-book ladder.
 */
export function marketMakerAnchor(lastClose: number | null | undefined, fairValue: number): number {
  return lastClose != null && lastClose > 0 ? stepTowardFairValue(lastClose, fairValue) : Math.max(MIN_SHARE_PRICE, fairValue);
}
