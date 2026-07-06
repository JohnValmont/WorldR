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

async function assertPublicPlayerCompany(trx: any, companyId: string) {
  const company = await trx('companies').where({ id: companyId }).first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
  if (company.is_npc) throw new AppError('NPC companies are not listed on the exchange', 400, 'NOT_LISTED');
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
    await assertPublicPlayerCompany(trx, companyId);

    const clock = await trx('world_clock').first();
    const gameYear = clock?.current_year || 1;
    const gameMonth = clock?.current_month || 1;

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
            `Order price §${price.toFixed(2)} exceeds the ±${Math.round(CIRCUIT_BREAKER_LIMIT * 100)}% circuit breaker (last close §${lastClose.toFixed(2)})`,
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
      await trx('company_shares')
        .where({ company_id: companyId, holder_character_id: characterId })
        .decrement('shares', quantity)
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

      // Seller receives cash (buyer's cash is already in escrow)
      await trx('character_finances').where({ character_id: sellerId }).increment('cash_in_hand', notional);

      // If the aggressor is a buyer executing below their limit, refund escrow surplus
      if (side === 'buy' && execPrice < price) {
        const refund = (price - execPrice) * fillQty;
        await trx('character_finances').where({ character_id: characterId }).increment('cash_in_hand', refund);
      }

      // Buyer receives shares (update cap table with weighted avg cost basis)
      const existing = await trx('company_shares')
        .where({ company_id: companyId, holder_character_id: buyerId })
        .forUpdate()
        .first();
      if (existing) {
        const oldShares = Number(existing.shares);
        const newAvg = oldShares + fillQty > 0
          ? (oldShares * Number(existing.avg_cost_basis) + notional) / (oldShares + fillQty)
          : execPrice;
        await trx('company_shares')
          .where({ company_id: companyId, holder_character_id: buyerId })
          .update({ shares: oldShares + fillQty, avg_cost_basis: newAvg, updated_at: trx.fn.now() });
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

    if (order.side === 'buy') {
      // Refund escrowed cash for the unfilled portion
      await trx('character_finances')
        .where({ character_id: characterId })
        .increment('cash_in_hand', Number(order.price) * unfilled);
    } else {
      // Return locked shares
      const existing = await trx('company_shares')
        .where({ company_id: order.company_id, holder_character_id: characterId })
        .first();
      if (existing) {
        await trx('company_shares')
          .where({ company_id: order.company_id, holder_character_id: characterId })
          .increment('shares', unfilled);
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
  // Public player companies with monthly OHLC-derived stats + live book top.
  const companies = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.legal_structure_id': 'public-corporation', 'c.is_npc': false, 'c.status': 'active' })
    .select('c.id', 'c.name', 'c.country_id', 'c.industry_id', 'c.subsector_id', 'f.company_value', 'f.last_arc_profit');

  const result = [];
  for (const co of companies) {
    const [latest, prev] = await db('share_price_history')
      .where({ company_id: co.id })
      .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
      .limit(2);

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
      market_cap: latest ? Number(latest.market_cap) : lastPrice != null ? lastPrice * TOTAL_SHARES : null,
      pe_ratio: latest?.pe_ratio != null ? Number(latest.pe_ratio) : null,
      eps: latest ? Number(latest.eps) : null,
      volume: latest ? Number(latest.volume_shares) : 0,
      total_shares: TOTAL_SHARES,
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
  return db('share_trades')
    .where({ company_id: companyId })
    .orderBy('executed_at', 'desc')
    .limit(limit)
    .select('price', 'quantity', 'game_year', 'game_month', 'executed_at');
}

export async function getPriceHistory(companyId: string) {
  // Monthly OHLC-style summary from trades
  return db('share_trades')
    .where({ company_id: companyId })
    .select('game_year', 'game_month')
    .min('price as low')
    .max('price as high')
    .avg('price as avg')
    .sum('quantity as volume')
    .groupBy('game_year', 'game_month')
    .orderBy([{ column: 'game_year', order: 'asc' }, { column: 'game_month', order: 'asc' }]);
}

export async function getPortfolio(characterId: string) {
  const holdings = await db('company_shares as s')
    .join('companies as c', 'c.id', 's.company_id')
    .where({ 's.holder_character_id': characterId })
    .where('s.shares', '>', 0)
    .select('s.company_id', 'c.name', 'c.legal_structure_id', 's.shares', 's.avg_cost_basis', 'c.owner_character_id', 'c.is_npc');

  const result = [];
  for (const h of holdings) {
    const lastTrade = await db('share_trades').where({ company_id: h.company_id }).orderBy('executed_at', 'desc').first();
    result.push({
      ...h,
      last_price: lastTrade ? Number(lastTrade.price) : null,
      ownership_percent: (Number(h.shares) / TOTAL_SHARES) * 100,
    });
  }
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
