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

  // Holdings: all shares held by owner character (excluding their own companies)
  const holdings = await db('company_shares as cs')
    .join('companies as co', 'co.id', 'cs.company_id')
    .join('company_finances as cf', 'cf.company_id', 'cs.company_id')
    .leftJoin('share_price_history as sph', function () {
      this.on('sph.company_id', '=', 'cs.company_id')
        .andOn('sph.game_year', '=',
          db.raw(`(SELECT MAX(h2.game_year) FROM share_price_history h2 WHERE h2.company_id = cs.company_id)`))
        .andOn('sph.game_month', '=',
          db.raw(`(SELECT MAX(h3.game_month) FROM share_price_history h3 WHERE h3.company_id = cs.company_id AND h3.game_year = (SELECT MAX(h4.game_year) FROM share_price_history h4 WHERE h4.company_id = cs.company_id))`));
    })
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
      'sph.close_price as current_price',
      db.raw(`(SELECT SUM(s2.shares) FROM company_shares s2 WHERE s2.company_id = cs.company_id AND s2.shares > 0) as total_shares`),
      'cf.last_arc_profit'
    );

  const enriched = holdings.map((h: any) => {
    const currentPrice = Number(h.current_price || h.avg_cost_basis || 0);
    const shares = Number(h.shares);
    const totalShares = Number(h.total_shares || shares);
    const marketValue = shares * currentPrice;
    const costBasis = shares * Number(h.avg_cost_basis || 0);
    const unrealizedPnl = marketValue - costBasis;
    const ownershipPct = totalShares > 0 ? (shares / totalShares) * 100 : 0;

    return {
      company_id: h.company_id,
      company_name: h.company_name,
      industry_id: h.industry_id,
      is_npc: h.is_npc,
      shares,
      avg_cost_basis: Number(h.avg_cost_basis || 0),
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
      available_cash: Number(company.available_cash || 0),
      company_value: Number(company.company_value || 0),
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

/**
 * Recomputes company_value for all active Capital Partners firms.
 * Called at the end of each arc tick by processExchangeMonth.
 */
export async function recalcPortfolioValues(trx: any): Promise<void> {
  const financeFirms = await trx('companies as c')
    .where({ 'c.industry_id': 'finance', 'c.status': 'active', 'c.is_npc': false })
    .select('c.id', 'c.owner_character_id');

  for (const firm of financeFirms) {
    // Sum: shares × latest close_price for each holding the owner-character has
    const holdings = await trx('company_shares as cs')
      .join('companies as co', 'co.id', 'cs.company_id')
      .leftJoin(
        trx.raw(`(
          SELECT DISTINCT ON (company_id) company_id, close_price
          FROM share_price_history
          ORDER BY company_id, game_year DESC, game_month DESC
        ) as latest_price`),
        'latest_price.company_id', 'cs.company_id'
      )
      .where({ 'cs.holder_character_id': firm.owner_character_id })
      .where('cs.shares', '>', 0)
      .select(
        trx.raw('COALESCE(SUM(cs.shares * COALESCE(latest_price.close_price, 0)), 0) as portfolio_value')
      )
      .first();

    const portfolioValue = Number(holdings?.portfolio_value || 0);

    const finRow = await trx('company_finances')
      .where({ company_id: firm.id })
      .first('available_cash');

    const totalValue = portfolioValue + Number(finRow?.available_cash || 0);

    await trx('company_finances')
      .where({ company_id: firm.id })
      .update({ company_value: totalValue });
  }
}
