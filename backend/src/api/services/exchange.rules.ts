/**
 * DRX Bourse pure rules: the specialist's monthly quotes, the circuit breaker and the NPC owner's correct holding.
 * Numbers live in constants/exchange.ts; tests in tests/exchange.test.ts.
 * No database access here.
 */
import {
  CIRCUIT_BREAKER_LIMIT, MM_LADDER, MM_MIN_PRICE, MM_PRICE_DECIMALS, SHARES_PER_COMPANY,
} from '../constants/exchange';

export interface MarketMakerQuote {
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
}

function roundPrice(p: number): number {
  const f = 10 ** MM_PRICE_DECIMALS;
  return Math.round(p * f) / f;
}

/**
 * The specialist's quotes for one company for one month, around `anchor`.
 * Asks never offer more shares than the specialist holds (`askInventory`):
 * it sells only shares it owns and never creates new ones. Bids are limited
 * later by its cash (an order it cannot afford is skipped by the caller).
 */
export function marketMakerQuotes(
  anchor: number,
  askInventory: number,
  ladder: ReadonlyArray<{ offset: number; shares: number }> = MM_LADDER,
): MarketMakerQuote[] {
  if (!Number.isFinite(anchor) || anchor <= 0) return [];
  const quotes: MarketMakerQuote[] = [];

  for (const tier of ladder) {
    quotes.push({
      side: 'buy',
      price: roundPrice(Math.max(MM_MIN_PRICE, anchor * (1 - tier.offset))),
      quantity: tier.shares,
    });
  }

  let left = Math.max(0, Math.floor(Number.isFinite(askInventory) ? askInventory : 0));
  for (const tier of ladder) {
    const qty = Math.min(tier.shares, left);
    if (qty <= 0) break;
    quotes.push({
      side: 'sell',
      price: roundPrice(Math.max(MM_MIN_PRICE, anchor * (1 + tier.offset))),
      quantity: qty,
    });
    left -= qty;
  }
  return quotes;
}


/**
 * The prices a player order may use: within CIRCUIT_BREAKER_LIMIT of the last
 * monthly close. null = no limit (no close yet).
 */
export function circuitBreakerBand(
  lastClose: number | null,
  limit: number = CIRCUIT_BREAKER_LIMIT,
): { lo: number; hi: number } | null {
  if (lastClose == null || !Number.isFinite(lastClose) || lastClose <= 0) return null;
  return { lo: lastClose * (1 - limit), hi: lastClose * (1 + limit) };
}

/** True when a player order at `price` is refused by the circuit breaker. */
export function tripsCircuitBreaker(price: number, lastClose: number | null, limit: number = CIRCUIT_BREAKER_LIMIT): boolean {
  if (lastClose == null || !Number.isFinite(lastClose) || lastClose <= 0) return false;
  return Math.abs(price - lastClose) / lastClose > limit;
}

/**
 * How many shares an NPC company's owner should hold so the company has exactly
 * SHARES_PER_COMPANY. Every share is either held or locked in an open sell order
 * (the seller's holding drops when the order is placed), so:
 *   owner held = total - shares held by everyone else - shares locked in ALL open sells.
 * `excess` > 0 means others already hold or offer more than the total: the owner
 * gets 0 and those extra shares cannot be fixed by changing the owner's row.
 */
export function npcOwnerTargetShares(
  heldByOthers: number,
  lockedInOpenSells: number,
  total: number = SHARES_PER_COMPANY,
): { target: number; excess: number } {
  const others = Math.max(0, Number(heldByOthers) || 0) + Math.max(0, Number(lockedInOpenSells) || 0);
  return { target: Math.max(0, total - others), excess: Math.max(0, others - total) };
}
