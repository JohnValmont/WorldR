/**
 * DRX Bourse trading rules shown on the exchange screen (guide text, price band).
 * Mirror of backend/src/api/constants/exchange.ts, which the server enforces;
 * backend/tests/exchangeRules.test.ts fails if the two differ.
 */

/** Player orders priced more than this share away from last month's close are refused. */
export const CIRCUIT_BREAKER_LIMIT = 0.20;

/** The market maker's quotes sit this far apart (half of it either side of its price). */
export const MM_SPREAD_PCT = 0.025;

/** Shares per market-maker quote, each side. */
export const MM_ORDER_SIZE = 5000;

/** A share of 1 as a percentage for text, e.g. 0.0125 -> "1.25%", 0.2 -> "20%". */
export function pctText(share: number): string {
  return `${Number((share * 100).toFixed(2))}%`;
}
