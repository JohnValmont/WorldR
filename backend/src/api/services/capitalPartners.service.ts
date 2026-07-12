import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

/**
 * Capital Partners Service
 *
 * A Capital Partners firm (industry_id = 'finance') is a player's financial
 * holding entity. Its "assets" are the shares the owner-character holds on the
 * DRX Bourse. Revenue comes from:
 *   • Dividends paid by companies the character holds shares in
 *   • Capital gains when shares are sold above avg_cost_basis
 *
 * company_value is recomputed each arc tick as the market-price portfolio value.
 */

export const CAPITAL_PARTNERS_PAYOUT_RATE = 0.30; // 30% of arc profit paid as dividend

/** Returns the full portfolio for a Capital Partners firm's owner. */
export async function getPortfolio(companyId: string, requestingUserId: string) {
  const company = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.id': companyId })
    .first('c.*', 'f.available_cash', 'f.company_value', 'f.last_arc_profit');

  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  if (company.industry_id !== 'finance') throw new AppError('Not a Capital Partners firm', 400, 'BAD_REQUEST');

  // Verify ownership
  const character = await db('characters')
    .join('users', 'users.id', 'characters.user_id')
    .where({ 'users.id': requestingUserId, 'characters.id': company.owner_character_id })
    .first('characters.id');
  if (!character) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

  // Holdings: all shares held by owner character EXCLUDING their own companies
  // Use a subquery for latest price to avoid complex knex leftJoin+andOn issues with db.raw()
  const holdings = await db('company_shares as cs')
    .join('companies as co', 'co.id', 'cs.company_id')
    .join('company_finances as cf', 'cf.company_id', 'cs.company_id')
    .where({ 'cs.holder_character_id': company.owner_character_id })
    .where('cs.shares', '>', 0)
    .whereNot({ 'co.owner_character_id': company.owner_character_id }) // exclude own companies
    .select(
      'co.id as company_id',
      'co.name as company_name',
      'co.industry_id',
      'co.is_npc',
      'cs.shares',
      'cs.avg_cost_basis',
      // Latest close price via correlated subquery — reliable across all knex versions
      db.raw(`(
        SELECT h.close_price
        FROM share_price_history h
        WHERE h.company_id = cs.company_id
        ORDER BY h.game_year DESC, h.game_month DESC
        LIMIT 1
      ) as current_price`),
      db.raw(`(
        SELECT SUM(s2.shares) FROM company_shares s2
        WHERE s2.company_id = cs.company_id AND s2.shares > 0
      ) as total_shares`),
      'cf.last_arc_profit'
    );

  const enriched = holdings.map((h: any) => {
    const currentPrice = Number(h.current_price ?? h.avg_cost_basis ?? 0);
    const shares = Number(h.shares);
    const totalShares = Number(h.total_shares || shares);
    const marketValue = shares * currentPrice;
    const costBasis = shares * Number(h.avg_cost_basis ?? 0);
    const unrealizedPnl = marketValue - costBasis;
    const ownershipPct = totalShares > 0 ? (shares / totalShares) * 100 : 0;

    return {
      company_id: h.company_id,
      company_name: h.company_name,
      industry_id: h.industry_id,
      is_npc: h.is_npc,
      shares,
      avg_cost_basis: Number(h.avg_cost_basis ?? 0),
      current_price: currentPrice,
      market_value: marketValue,
      unrealized_pnl: unrealizedPnl,
      ownership_pct: ownershipPct,
      total_shares: totalShares,
    };
  });

  const totalPortfolioValue = enriched.reduce((s: number, h: any) => s + h.market_value, 0);

  return {
    firm: {
      id: company.id,
      name: company.name,
      available_cash: Number(company.available_cash ?? 0),
      company_value: Number(company.company_value ?? 0),
      portfolio_value: totalPortfolioValue,
    },
    holdings: enriched,
  };
}

/** Returns dividend receipt history for the Capital Partners firm's owner. */
export async function getDividendHistory(companyId: string, requestingUserId: string) {
  const company = await db('companies').where({ id: companyId }).first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  if (company.industry_id !== 'finance') throw new AppError('Not a Capital Partners firm', 400, 'BAD_REQUEST');

  const character = await db('characters')
    .join('users', 'users.id', 'characters.user_id')
    .where({ 'users.id': requestingUserId, 'characters.id': company.owner_character_id })
    .first('characters.id');
  if (!character) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

  const history = await db('dividend_payments as dp')
    .join('companies as co', 'co.id', 'dp.company_id')
    .where({ 'dp.holder_character_id': company.owner_character_id })
    .orderBy([{ column: 'dp.game_year', order: 'desc' }, { column: 'dp.game_month', order: 'desc' }])
    .limit(100)
    .select(
      'dp.company_id',
      'co.name as company_name',
      'dp.game_year',
      'dp.game_month',
      'dp.shares_held',
      'dp.amount',
    );

  return history;
}

/** Returns performance metrics for a Capital Partners firm. */
export async function getPerformance(companyId: string, requestingUserId: string) {
  const company = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.id': companyId })
    .first('c.owner_character_id', 'c.industry_id', 'f.company_value');

  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  if (company.industry_id !== 'finance') throw new AppError('Not a Capital Partners firm', 400, 'BAD_REQUEST');

  const character = await db('characters')
    .join('users', 'users.id', 'characters.user_id')
    .where({ 'users.id': requestingUserId, 'characters.id': company.owner_character_id })
    .first('characters.id');
  if (!character) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

  const ledger = await db('company_ledger').where({ company_id: companyId });
  let netDeposits = 0;
  for (const entry of ledger) {
    if (entry.entry_type === 'capital_injection') netDeposits += Number(entry.amount);
    if (entry.entry_type === 'capital_withdrawal') netDeposits -= Math.abs(Number(entry.amount));
  }

  const dividends = await db('dividend_payments')
    .where({ holder_character_id: company.owner_character_id })
    .sum('amount as total')
    .first();
  const totalDividends = Number(dividends?.total || 0);

  const totalReturnPct = netDeposits > 0 
    ? ((Number(company.company_value) - netDeposits) / netDeposits) * 100 
    : 0;

  return {
    total_return_pct: totalReturnPct,
    net_deposits: netDeposits,
    current_value: Number(company.company_value),
    total_dividends: totalDividends,
  };
}

/**
 * Recomputes company_value for all active Capital Partners firms.
 * Called at the end of each arc tick by processExchangeMonth.
 *
 * portfolio_value = SUM(shares_held × latest_close_price) for all holdings
 *                  EXCLUDING own companies (to avoid circular valuation)
 * company_value   = portfolio_value + firm's available_cash
 */
export async function recalcPortfolioValues(trx: any): Promise<void> {
  const financeFirms = await trx('companies as c')
    .where({ 'c.industry_id': 'finance', 'c.status': 'active', 'c.is_npc': false })
    .select('c.id', 'c.owner_character_id');

  for (const firm of financeFirms) {
    // Correlated subquery for latest close price — identical pattern to getPortfolio above
    const row = await trx('company_shares as cs')
      .join('companies as co', 'co.id', 'cs.company_id')
      .where({ 'cs.holder_character_id': firm.owner_character_id })
      .where('cs.shares', '>', 0)
      // Exclude the firm's OWN companies (their own manufacturing co / the finance firm itself)
      .whereNot({ 'co.owner_character_id': firm.owner_character_id })
      .select(
        trx.raw(`
          COALESCE(SUM(
            cs.shares * COALESCE((
              SELECT h.close_price
              FROM share_price_history h
              WHERE h.company_id = cs.company_id
              ORDER BY h.game_year DESC, h.game_month DESC
              LIMIT 1
            ), 0)
          ), 0) as portfolio_value
        `)
      )
      .first();

    const portfolioValue = Number(row?.portfolio_value ?? 0);

    const finRow = await trx('company_finances')
      .where({ company_id: firm.id })
      .first('available_cash');

    const totalValue = portfolioValue + Number(finRow?.available_cash ?? 0);

    await trx('company_finances')
      .where({ company_id: firm.id })
      .update({ company_value: totalValue });
  }
}
