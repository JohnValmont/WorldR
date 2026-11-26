/**
 * DRX Bourse: what a listed company's share is worth ("fair value") and how fast
 * the monthly price moves toward it.
 *
 * Fair value, in plain words: a company is worth what it owns (book value,
 * company_finances.company_value) plus EXCESS_PROFIT_YEARS years of the profit it
 * makes ABOVE a SHARE_HURDLE_RATE_YEARLY return on what it owns. A firm that earns
 * exactly the hurdle trades at book; better earners trade above it, weaker ones
 * below, never under FAIR_VALUE_BOOK_FLOOR x book.
 *
 * Pure rules in services/shareValuation.rules.ts, tests in tests/shareValuation.test.ts.
 * Used by the monthly price bar, the market maker's quotes and the order-book ladder
 * (ipoExchange.service.ts, shareMarket.service.ts): one number everywhere.
 */

/** Yearly return a shareholder expects on book value (above the bank's 7.25% term rate). */
export const SHARE_HURDLE_RATE_YEARLY = 0.12;

/** Years of above-hurdle profit counted into fair value. */
export const EXCESS_PROFIT_YEARS = 5;

/** Months of profit averaged (this month + earlier bars) so one odd month doesn't swing the price. */
export const FAIR_VALUE_PROFIT_MONTHS = 6;

/** Fair value never falls below this share of book value (what the company owns still counts). */
export const FAIR_VALUE_BOOK_FLOOR = 0.5;

/** Lowest share price the exchange will show. */
export const MIN_SHARE_PRICE = 0.01;

/**
 * Share of the gap to fair value the price closes each month. The price catches up
 * faster when it sits far BELOW fair value (same steps the exchange used before).
 */
export const FAIR_VALUE_PULL_BASE = 0.20;
export const FAIR_VALUE_PULL_FAR = 0.30;   // fair value > FAR_GAP x price
export const FAIR_VALUE_PULL_VERY_FAR = 0.50; // fair value > VERY_FAR_GAP x price
export const FAIR_VALUE_FAR_GAP = 1.5;
export const FAIR_VALUE_VERY_FAR_GAP = 3;

/**
 * The NPC treasury's share sales and buybacks are priced this far below the market
 * maker's anchor (ipoExchange processNpcEquityDecisions).
 */
export const NPC_TREASURY_ORDER_DISCOUNT = 0.02;
