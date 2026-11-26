/**
 * DRX Bourse trading rules shown to players.
 *
 * The exchange screen's guide and price band read the same numbers from
 * frontend/src/lib/exchangeRules.ts; tests/exchangeRules.test.ts keeps the two in step.
 */

/** Player orders priced more than this share away from last month's close are refused. */
export const CIRCUIT_BREAKER_LIMIT = 0.20;

/** The market maker's quotes sit this far apart (half of it either side of its price). */
export const MM_SPREAD_PCT = 0.025;

/** Shares per market-maker quote, each side. */
export const MM_ORDER_SIZE = 5000;
