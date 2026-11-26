/**
 * DRX Bourse pure rules: the specialist's monthly quotes and an opening price.
 * Numbers live in constants/exchange.ts; tests in tests/exchange.test.ts.
 * No database access here.
 */
import {
  MM_LADDER, MM_MIN_PRICE, MM_PRICE_DECIMALS, OPENING_PRICE_FLOOR, SHARES_PER_COMPANY,
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

/** Opening price for a listed company with no price history: book value per share, floored. */
export function openingPrice(bookValue: number, totalShares: number = SHARES_PER_COMPANY): number {
  const bvps = totalShares > 0 && Number.isFinite(bookValue) ? bookValue / totalShares : 0;
  return Math.max(OPENING_PRICE_FLOOR, Math.round(bvps * 100) / 100);
}
