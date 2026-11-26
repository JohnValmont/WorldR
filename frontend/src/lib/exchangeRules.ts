/**
 * DRX Bourse trading rules shown on the exchange screen (guide text, price band).
 * Mirror of backend/src/api/constants/exchange.ts, which the server enforces;
 * backend/tests/exchangeRules.test.ts fails if the two differ.
 */

/** Player orders priced more than this share away from last month's close are refused. */
export const CIRCUIT_BREAKER_LIMIT = 0.20;

/** A share of 1 as a percentage for text, e.g. 0.0125 -> "1.25%", 0.2 -> "20%". */
export function pctText(share: number): string {
  return `${Number((share * 100).toFixed(2))}%`;
}
