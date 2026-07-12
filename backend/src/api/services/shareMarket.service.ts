import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

/**
 * Share Market Service — realistic order-book exchange for PUBLIC player companies.
 *
 * Matching model (price-time priority, continuous):
 * - Incoming buy crosses against lowest-priced open sells with sell.price <= buy.price
 * - Incoming sell crosses against highest-priced open buys with buy.price >= sell.price
 * - Trades execute at the RESTING order's price (maker price)
 * - Partial fills supported; remainder rests on the book
 *
 * Escrow model (prevents double-spending):
 * - Buy orders lock cash (price * quantity) in escrow_amount, deducted from cash_in_hand up-front.
 *   On execution below the limit price, the surplus escrow is refunded.
 * - Sell orders lock shares: holder's cap-table shares are reduced up-front and restored on cancel.
 */

export const TOTAL_SHARES = 1_000_000;
export const CIRCUIT_BREAKER_LIMIT = 0.20; // ±20% from last month's close

async function assertListedCompany(trx: any, companyId: string) {
  const company = await trx('companies').where({ id: companyId }).first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  // Allow NPC companies if they are explicitly exchange-listed
  if (company.is_npc) {
    if (!company.is_exchange_listed) throw new AppError('This NPC company is not listed on the exchange', 400, 'NOT_LISTED');
    return company;
  }
  // For player companies, must be a Public Corporation
  if (company.legal_structure_id !== 'public-corporation') {
    throw new AppError('Company is not publicly listed', 400, 'NOT_LISTED');
  }
  return company;
}

/** Last monthly closing price from the OHLC history, or null before the first snapshot. */
export async function getLastClose(trx: any, companyId: string): Promise<number | null> {
  const row = await trx('share_price_history')
    .where({ company_id: companyId })
    .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
    .first();
  return row ? Number(row.close_price) : null;
}

export async function placeOrder(params: {
  companyId: string;
  characterId: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  isNpc?: boolean;            // system market-maker / earnings-impulse orders
  skipCircuitBreaker?: boolean;
  existingTrx?: any;          // run inside a caller's transaction (e.g. the world tick) instead of a new one
}) {
  const { companyId, characterId, side, price, quantity, isNpc = false, skipCircuitBreaker = false, existingTrx } = params;

  if (!Number.isFinite(price) || price <= 0) throw new AppError('Invalid price', 400, 'BAD_REQUEST');
  if (!Number.isInteger(quantity) || quantity <= 0) throw new AppError('Invalid quantity', 400, 'BAD_REQUEST');

  const run = async (trx: any) => {
    await assertListedCompany(trx, companyId);

    const clock = await trx('world_clock').first();
    const gameYear = clock?.current_year || 1;
    const gameMonth = clock?.current_month || 1;

    // Validate price is positive and finite
    if (!Number.isFinite(price) || price <= 0) {
      throw new AppError('Order price must be a positive number', 400, 'INVALID_PRICE');
    }

    // ---- Circuit breaker (players only; NPC specialist is exempt) ----
    if (!isNpc && !skipCircuitBreaker) {
      const lastClose = await getLastClose(trx, companyId);
      if (lastClose != null && lastClose > 0) {
        const move = Math.abs(price - lastClose) / lastClose;
        if (move > CIRCUIT_BREAKER_LIMIT) {
          await trx('share_orders').insert({
            company_id: companyId,
            character_id: characterId,
            side,
            price,
            quantity,
            escrow_amount: 0,
            status: 'cancelled',
            rejected_circuit_breaker: true,
          });
          throw new AppError(
            `Order price $${price.toFixed(2)} exceeds the ±${Math.round(CIRCUIT_BREAKER_LIMIT * 100)}% circuit breaker (last close $${lastClose.toFixed(2)})`,
            400,
            'CIRCUIT_BREAKER'
          );
        }
      }
    }

    // ---- Escrow ----
    if (side === 'buy') {
      const cost = price * quantity;
      const fin = await trx('character_finances').where({ character_id: characterId }).forUpdate().first();
      if (!fin || Number(fin.cash_in_hand) < cost) {
        throw new AppError('Insufficient cash to cover this buy order', 400, 'INSUFFICIENT_FUNDS');
      }
      await trx('character_finances').where({ character_id: characterId }).decrement('cash_in_hand', cost);
    } else {
      const holding = await trx('company_shares')
        .where({ company_id: companyId, holder_character_id: characterId })
        .forUpdate()
        .first();
      if (!holding || Number(holding.shares) < quantity) {
        throw new AppError('Insufficient shares to cover this sell order', 400, 'INSUFFICIENT_SHARES');
      }
      // Bug A fix: knex does not support chaining .decrement().update() — split into two calls
      await trx('company_shares')
        .where({ company_id: companyId, holder_character_id: characterId })
        .decrement('shares', quantity);
      await trx('company_shares')
        .where({ company_id: companyId, holder_character_id: characterId })
        .update({ updated_at: trx.fn.now() });
    }

    const [order] = await trx('share_orders')
      .insert({
        company_id: companyId,
        character_id: characterId,
        side,
        price,
        quantity,
        escrow_amount: side === 'buy' ? price * quantity : 0,
        is_npc: isNpc,
      })
      .returning('*');

    // ---- Continuous matching ----
    let remaining = quantity;
    const trades: any[] = [];

    while (remaining > 0) {
      const oppositeQuery = trx('share_orders')
        .where({ company_id: companyId, status: 'open' })
        .whereNot({ character_id: characterId }) // no self-trading
        .forUpdate();

      const counter =
        side === 'buy'
          ? await oppositeQuery.andWhere({ side: 'sell' }).andWhere('price', '<=', price).orderBy([{ column: 'price', order: 'asc' }, { column: 'created_at', order: 'asc' }]).first()
          : await oppositeQuery.andWhere({ side: 'buy' }).andWhere('price', '>=', price).orderBy([{ column: 'price', order: 'desc' }, { column: 'created_at', order: 'asc' }]).first();

      if (!counter) break;

      const counterRemaining = Number(counter.quantity) - Number(counter.filled_quantity);
      const fillQty = Math.min(remaining, counterRemaining);
      const execPrice = Number(counter.price); // maker price
      const notional = execPrice * fillQty;

      const buyerId = side === 'buy' ? characterId : counter.character_id;
      const sellerId = side === 'sell' ? characterId : counter.character_id;
      const buyOrderId = side === 'buy' ? order.id : counter.id;
      const sellOrderId = side === 'sell' ? order.id : counter.id;

      // Seller receives cash (buyer's escrow is the source)
      await trx('character_finances').where({ character_id: sellerId }).increment('cash_in_hand', notional);

      // Bug B fix: BOTH the aggressor-buy and a resting-buy order must get their per-fill
      // escrow surplus refunded when execution happens below their limit price.
      // Case 1: incoming order is buy, it executes against a resting sell at a lower price
      if (side === 'buy' && execPrice < price) {
        const refund = (price - execPrice) * fillQty;
        await trx('character_finances').where({ character_id: characterId }).increment('cash_in_hand', refund);
        // Bug C fix: decrement escrow_amount so cancel later refunds the correct remaining cash
        await trx('share_orders').where({ id: order.id }).decrement('escrow_amount', refund);
      }
      // Case 2: incoming order is a sell, it executes against a resting buy at a higher price
      if (side === 'sell' && execPrice > price) {
        const surplus = (execPrice - price) * fillQty;
        await trx('character_finances').where({ character_id: buyerId }).increment('cash_in_hand', surplus);
        // Bug C fix: decrement escrow on the resting buy order so its cancel refund is correct
        await trx('share_orders').where({ id: counter.id }).decrement('escrow_amount', surplus);
      }

      // Buyer receives shares (update cap table with weighted avg cost basis)
      const existing = await trx('company_shares')
        .where({ company_id: companyId, holder_character_id: buyerId })
        .forUpdate()
        .first();
      if (existing) {
        const oldShares = Number(existing.shares);
        const totalShares = oldShares + fillQty;
        // Guard against NaN: ensure total shares > 0 and result is finite
        let newAvg = execPrice; // Default to execution price
        if (totalShares > 0 && Number.isFinite(oldShares * Number(existing.avg_cost_basis)) && Number.isFinite(notional)) {
          newAvg = (oldShares * Number(existing.avg_cost_basis) + notional) / totalShares;
          if (!Number.isFinite(newAvg)) newAvg = execPrice; // Fallback if calculation fails
        }
        await trx('company_shares')
          .where({ company_id: companyId, holder_character_id: buyerId })
          .update({ shares: totalShares, avg_cost_basis: newAvg, updated_at: trx.fn.now() });
      } else {
        await trx('company_shares').insert({
          company_id: companyId,
          holder_character_id: buyerId,
          shares: fillQty,
          avg_cost_basis: execPrice,
        });
      }

      // Update both orders
      const counterFilled = Number(counter.filled_quantity) + fillQty;
      await trx('share_orders')
        .where({ id: counter.id })
        .update({
          filled_quantity: counterFilled,
          status: counterFilled >= Number(counter.quantity) ? 'filled' : 'open',
          updated_at: trx.fn.now(),
        });

      remaining -= fillQty;
      const myFilled = quantity - remaining;
      await trx('share_orders')
        .where({ id: order.id })
        .update({
          filled_quantity: myFilled,
          status: remaining === 0 ? 'filled' : 'open',
          updated_at: trx.fn.now(),
        });

      const [trade] = await trx('share_trades')
        .insert({
          company_id: companyId,
          buy_order_id: buyOrderId,
          sell_order_id: sellOrderId,
          buyer_character_id: buyerId,
          seller_character_id: sellerId,
          price: execPrice,
          quantity: fillQty,
          game_year: gameYear,
          game_month: gameMonth,
        })
        .returning('*');
      trades.push(trade);
    }

    const finalOrder = await trx('share_orders').where({ id: order.id }).first();
    return { order: finalOrder, trades };
  };

  return existingTrx ? run(existingTrx) : db.transaction(run);
}

export async function cancelOrder(orderId: string, characterId: string) {
  return db.transaction(async (trx) => {
    const order = await trx('share_orders').where({ id: orderId, character_id: characterId }).forUpdate().first();
    if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
    if (order.status !== 'open') throw new AppError('Order is not open', 400, 'NOT_OPEN');

    const unfilled = Number(order.quantity) - Number(order.filled_quantity);
    
    // Validate there's something to cancel
    if (unfilled <= 0) {
      throw new AppError('Order is already fully filled or cancelled', 400, 'NOTHING_TO_CANCEL');
    }

    if (order.side === 'buy') {
      // Bug C fix: use the live escrow_amount column (already decremented on each fill)
      // instead of recalculating price * unfilled, which ignores any already-refunded surplus.
      const escrowRemaining = Number(order.escrow_amount);
      await trx('character_finances')
        .where({ character_id: characterId })
        .increment('cash_in_hand', escrowRemaining);
    } else {
      // Return locked shares
      const existing = await trx('company_shares')
        .where({ company_id: order.company_id, holder_character_id: characterId })
        .first();
      if (existing) {
        // Bug D fix: also touch updated_at when restoring locked shares on cancel
        await trx('company_shares')
          .where({ company_id: order.company_id, holder_character_id: characterId })
          .increment('shares', unfilled);
        await trx('company_shares')
          .where({ company_id: order.company_id, holder_character_id: characterId })
          .update({ updated_at: trx.fn.now() });
      } else {
        await trx('company_shares').insert({
          company_id: order.company_id,
          holder_character_id: characterId,
          shares: unfilled,
          avg_cost_basis: 0,
        });
      }
    }

    await trx('share_orders').where({ id: orderId }).update({ status: 'cancelled', updated_at: trx.fn.now() });
    return { cancelled: true, refunded_quantity: unfilled };
  });
}

export async function getListings() {
  // All listed companies: public player corps + NPC companies marked as exchange-listed.
  const companies = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.status': 'active' })
    .where(function () {
      this.where({ 'c.legal_structure_id': 'public-corporation', 'c.is_npc': false })
          .orWhere({ 'c.is_exchange_listed': true, 'c.is_npc': true });
    })
    .select('c.id', 'c.name', 'c.country_id', 'c.industry_id', 'c.subsector_id', 'c.owner_character_id', 'c.is_npc', 'c.is_exchange_listed', 'f.company_value', 'f.last_arc_profit');

  const result = [];
  for (const co of companies) {
    // For NPC companies, total shares comes from the actual cap table (varies: 10M or 20M).
    // For player companies it is always the fixed TOTAL_SHARES constant (1M).
    let companyTotalShares = TOTAL_SHARES;
    if (co.is_npc) {
      const sumRow = await db('company_shares').where({ company_id: co.id }).sum('shares as total').first();
      companyTotalShares = Number(sumRow?.total ?? TOTAL_SHARES);
    }

    const priceHistory = await db('share_price_history')
      .where({ company_id: co.id })
      .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
      .limit(2);
    const latest = priceHistory[0] || null;
    const prev = priceHistory[1] || null;

    // Fall back to the raw last trade if no monthly snapshot exists yet (freshly listed).
    const lastTrade = latest ? null : await db('share_trades').where({ company_id: co.id }).orderBy('executed_at', 'desc').first();

    const bestBid = await db('share_orders').where({ company_id: co.id, side: 'buy', status: 'open' }).max('price as p').first();
    const bestAsk = await db('share_orders').where({ company_id: co.id, side: 'sell', status: 'open' }).min('price as p').first();

    const lastPrice = latest ? Number(latest.close_price) : lastTrade ? Number(lastTrade.price) : null;
    const prevPrice = latest && prev ? Number(prev.close_price) : null;

    result.push({
      ...co,
      last_price: lastPrice,
      prev_price: prevPrice,
      best_bid: bestBid?.p ? Number(bestBid.p) : null,
      best_ask: bestAsk?.p ? Number(bestAsk.p) : null,
      market_cap: latest ? Number(latest.market_cap) : lastPrice != null ? lastPrice * companyTotalShares : null,
      pe_ratio: latest?.pe_ratio != null ? Number(latest.pe_ratio) : null,
      eps: latest ? Number(latest.eps) : null,
      volume: latest ? Number(latest.volume_shares) : 0,
      total_shares: companyTotalShares,
    });
  }
  return result;
}

export async function getOrderBook(companyId: string) {
  const [bids, asks] = await Promise.all([
    db('share_orders')
      .where({ company_id: companyId, side: 'buy', status: 'open' })
      .select('price')
      .sum({ quantity: db.raw('quantity - filled_quantity') })
      .groupBy('price')
      .orderBy('price', 'desc')
      .limit(15),
    db('share_orders')
      .where({ company_id: companyId, side: 'sell', status: 'open' })
      .select('price')
      .sum({ quantity: db.raw('quantity - filled_quantity') })
      .groupBy('price')
      .orderBy('price', 'asc')
      .limit(15),
  ]);
  return { bids, asks };
}

export async function getTradeHistory(companyId: string, limit = 50) {
  // Validate company exists before querying trades
  const company = await db('companies').where({ id: companyId }).select('id').first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  
  return db('share_trades')
    .where({ company_id: companyId })
    .orderBy('executed_at', 'desc')
    .limit(limit)
    .select('price', 'quantity', 'game_year', 'game_month', 'executed_at');
}

export async function getPriceHistory(companyId: string) {
  // Validate company exists before querying trades
  const company = await db('companies').where({ id: companyId }).select('id').first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  
  // Return pre-aggregated OHLC from share_price_history instead of dynamic aggregation
  return db('share_price_history')
    .where({ company_id: companyId })
    .select(
      'game_year',
      'game_month',
      'low_price as low',
      'high_price as high',
      'close_price as avg', // Using close_price as a stand-in for avg to match frontend format
      'volume_shares as volume'
    )
    .orderBy([{ column: 'game_year', order: 'asc' }, { column: 'game_month', order: 'asc' }]);
}

export async function getPortfolio(characterId: string) {
  const holdings = await db('company_shares as s')
    .join('companies as c', 'c.id', 's.company_id')
    .where({ 's.holder_character_id': characterId })
    .where('s.shares', '>', 0)
    .select('s.company_id', 'c.name', 'c.legal_structure_id', 's.shares', 's.avg_cost_basis', 'c.owner_character_id', 'c.is_npc');

  // Batch fetch the latest trade for all companies in the portfolio to avoid N+1 queries
  const companyIds = holdings.map(h => h.company_id);
  const latestTrades = new Map<string, any>();
  if (companyIds.length > 0) {
    const trades = await db.with('RankedTrades', (qb) => {
      qb.select('company_id', 'price', db.raw('ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY executed_at DESC) as rn'))
        .from('share_trades')
        .whereIn('company_id', companyIds);
    })
    .select('*')
    .from('RankedTrades')
    .where('rn', 1);
    trades.forEach((trade: any) => latestTrades.set(trade.company_id, trade));
  }

  // Fetch real total shares per company (NPC may have 10M or 20M; players always 1M)
  const totalSharesMap = new Map<string, number>();
  for (const id of companyIds) {
    const co = await db('companies').where({ id }).first();
    if (co?.is_npc) {
      const sumRow = await db('company_shares').where({ company_id: id }).sum('shares as total').first();
      totalSharesMap.set(id, Number(sumRow?.total ?? TOTAL_SHARES));
    } else {
      totalSharesMap.set(id, TOTAL_SHARES);
    }
  }

  const result = holdings.map(h => ({
    ...h,
    last_price: latestTrades.get(h.company_id) ? Number(latestTrades.get(h.company_id).price) : null,
    ownership_percent: (Number(h.shares) / (totalSharesMap.get(h.company_id) ?? TOTAL_SHARES)) * 100,
    total_shares: totalSharesMap.get(h.company_id) ?? TOTAL_SHARES,
  }));
  return result;
}

export async function getMyOrders(characterId: string) {
  return db('share_orders as o')
    .join('companies as c', 'c.id', 'o.company_id')
    .where({ 'o.character_id': characterId })
    .orderBy('o.created_at', 'desc')
    .limit(50)
    .select('o.*', 'c.name as company_name');
}

/**
 * IPO Launch — convenience endpoint for a newly-public founder to post their
 * first batch of sell orders at a chosen price without needing the full order
 * ticket. Internally calls placeOrder so the same escrow / matching logic
 * applies: if buyers are already in the book the shares fill immediately.
 *
 * Validation:
 *  - Company must be a public-corporation owned by characterId
 *  - quantity must be > 0 and <= character's current share holding
 *  - pricePerShare must be > 0
 */
export async function ipoLaunch(params: {
  companyId: string;
  characterId: string;
  pricePerShare: number;
  quantity: number;
}) {
  const { companyId, characterId, pricePerShare, quantity } = params;

  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0)
    throw new AppError('Invalid IPO price', 400, 'BAD_REQUEST');
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new AppError('Invalid quantity', 400, 'BAD_REQUEST');

  // Verify ownership
  const company = await db('companies').where({ id: companyId }).first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  if (company.is_npc) throw new AppError('NPC companies cannot IPO', 400, 'BAD_REQUEST');
  if (company.legal_structure_id !== 'public-corporation')
    throw new AppError('Only Public Corporations can launch an IPO', 400, 'NOT_PUBLIC');
  if (company.owner_character_id !== characterId)
    throw new AppError('Only the company owner can launch an IPO', 403, 'FORBIDDEN');

  // Prevent re-launching IPO if company already has a public share price history
  const existingPriceHistory = await db('share_price_history').where({ company_id: companyId }).first();
  if (existingPriceHistory) {
    throw new AppError('This company has already completed an IPO', 400, 'ALREADY_PUBLIC');
  }

  // Delegate entirely to placeOrder — handles escrow, matching, cap-table updates
  return placeOrder({ companyId, characterId, side: 'sell', price: pricePerShare, quantity });
}
