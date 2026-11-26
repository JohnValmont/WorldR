/**
 * DRX Bourse: market-maker (the "DRX Specialist") numbers.
 *
 * The specialist quotes ONLY in the monthly exchange step (processExchangeMonth
 * Step F, ipoExchange.service.ts), inside the world-tick transaction. Reading the
 * order book (GET /exchange/:companyId/book) never places orders or moves money.
 * Rules that use these numbers are pure functions in services/exchange.rules.ts
 * (tests/exchange.test.ts).
 */

/**
 * Every company has exactly this many shares. A share is either held
 * (company_shares.shares) or locked in an open sell order (quantity -
 * filled_quantity), so held + locked always equals this number.
 */
export const SHARES_PER_COMPANY = 1_000_000;

/**
 * The specialist's monthly quote ladder. Each tier is posted on BOTH sides:
 * a bid at anchor x (1 - offset) and an ask at anchor x (1 + offset).
 * The first tier is the original single quote (2.5% spread, 5,000 shares).
 * The deeper tiers cost a buyer more the more they take in one month.
 * Total per side: 75,000 shares (7.5% of a company) per month.
 * Offsets must be strictly increasing and below 1 (a test enforces it).
 */
export const MM_LADDER: ReadonlyArray<{ offset: number; shares: number }> = [
  { offset: 0.0125, shares: 5_000 },
  { offset: 0.03, shares: 10_000 },
  { offset: 0.06, shares: 20_000 },
  { offset: 0.10, shares: 40_000 },
];

/** Lowest price the specialist will ever quote. */
export const MM_MIN_PRICE = 0.01;

/** Specialist quote prices are rounded to this many decimals. */
export const MM_PRICE_DECIMALS = 4;

/**
 * A listed computer-run company with no price history yet (rival car makers
 * listed by seed 0007 on a fresh world) opens at its book value per share,
 * never below this price.
 */
export const OPENING_PRICE_FLOOR = 0.10;

/** At an IPO listing (clearAndList) the specialist posts one opening quote pair of this size. */
export const MM_IPO_ORDER_SIZE = 5_000;
/** Spread of the opening bid under the IPO clearing price. */
export const MM_IPO_SPREAD_PCT = 0.025;
