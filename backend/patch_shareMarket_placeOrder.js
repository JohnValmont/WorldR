const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/api/services/shareMarket.service.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Update placeOrder signature
content = content.replace(
  `  characterId: string;
  side: 'buy' | 'sell';`,
  `  characterId: string;
  purchaserCompanyId?: string;
  side: 'buy' | 'sell';`
);

content = content.replace(
  `const { companyId, characterId, side, price, quantity, isNpc = false, skipCircuitBreaker = false, existingTrx } = params;`,
  `const { companyId, characterId, purchaserCompanyId, side, price, quantity, isNpc = false, skipCircuitBreaker = false, existingTrx } = params;`
);

// 2. Escrow logic
const oldEscrow = `    // ---- Escrow ----
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
    }`;

const newEscrow = `    // ---- Escrow ----
    if (side === 'buy') {
      const cost = price * quantity;
      if (purchaserCompanyId) {
        const fin = await trx('company_finances').where({ company_id: purchaserCompanyId }).forUpdate().first();
        if (!fin || Number(fin.available_cash) < cost) {
          throw new AppError('Insufficient cash to cover this buy order', 400, 'INSUFFICIENT_FUNDS');
        }
        await trx('company_finances').where({ company_id: purchaserCompanyId }).decrement('available_cash', cost);
      } else {
        const fin = await trx('character_finances').where({ character_id: characterId }).forUpdate().first();
        if (!fin || Number(fin.cash_in_hand) < cost) {
          throw new AppError('Insufficient cash to cover this buy order', 400, 'INSUFFICIENT_FUNDS');
        }
        await trx('character_finances').where({ character_id: characterId }).decrement('cash_in_hand', cost);
      }
    } else {
      const holdingCond = purchaserCompanyId 
        ? { company_id: companyId, holder_company_id: purchaserCompanyId }
        : { company_id: companyId, holder_character_id: characterId };
      const holding = await trx('company_shares')
        .where(holdingCond)
        .forUpdate()
        .first();
      if (!holding || Number(holding.shares) < quantity) {
        throw new AppError('Insufficient shares to cover this sell order', 400, 'INSUFFICIENT_SHARES');
      }
      await trx('company_shares')
        .where(holdingCond)
        .decrement('shares', quantity);
      await trx('company_shares')
        .where(holdingCond)
        .update({ updated_at: trx.fn.now() });
    }`;

content = content.replace(oldEscrow, newEscrow);

// 3. Order Insert
const oldOrderInsert = `    const [order] = await trx('share_orders')
      .insert({
        company_id: companyId,
        character_id: characterId,
        side,
        price,
        quantity,
        escrow_amount: side === 'buy' ? price * quantity : 0,
        is_npc: isNpc,
      })
      .returning('*');`;

const newOrderInsert = `    const [order] = await trx('share_orders')
      .insert({
        company_id: companyId,
        character_id: characterId,
        purchaser_company_id: purchaserCompanyId || null,
        side,
        price,
        quantity,
        escrow_amount: side === 'buy' ? price * quantity : 0,
        is_npc: isNpc,
      })
      .returning('*');`;

content = content.replace(oldOrderInsert, newOrderInsert);

// 4. Execution logic - buyer/seller setup
const oldSetup = `      const buyerId = side === 'buy' ? characterId : counter.character_id;
      const sellerId = side === 'sell' ? characterId : counter.character_id;
      const buyOrderId = side === 'buy' ? order.id : counter.id;
      const sellOrderId = side === 'sell' ? order.id : counter.id;

      // Seller receives cash (buyer's escrow is the source)
      await trx('character_finances').where({ character_id: sellerId }).increment('cash_in_hand', notional);`;

const newSetup = `      const buyerId = side === 'buy' ? characterId : counter.character_id;
      const sellerId = side === 'sell' ? characterId : counter.character_id;
      const buyOrderId = side === 'buy' ? order.id : counter.id;
      const sellOrderId = side === 'sell' ? order.id : counter.id;
      const buyerCompanyId = side === 'buy' ? purchaserCompanyId : counter.purchaser_company_id;
      const sellerCompanyId = side === 'sell' ? purchaserCompanyId : counter.purchaser_company_id;

      // Seller receives cash (buyer's escrow is the source)
      if (sellerCompanyId) {
        await trx('company_finances').where({ company_id: sellerCompanyId }).increment('available_cash', notional);
      } else {
        await trx('character_finances').where({ character_id: sellerId }).increment('cash_in_hand', notional);
      }`;

content = content.replace(oldSetup, newSetup);

// 5. Refund logic
const oldRefundBuy = `      if (side === 'buy' && execPrice < price) {
        const refund = (price - execPrice) * fillQty;
        await trx('character_finances').where({ character_id: characterId }).increment('cash_in_hand', refund);
        // Bug C fix: decrement escrow_amount so cancel later refunds the correct remaining cash
        await trx('share_orders').where({ id: order.id }).decrement('escrow_amount', refund);
      }`;
const newRefundBuy = `      if (side === 'buy' && execPrice < price) {
        const refund = (price - execPrice) * fillQty;
        if (purchaserCompanyId) {
          await trx('company_finances').where({ company_id: purchaserCompanyId }).increment('available_cash', refund);
        } else {
          await trx('character_finances').where({ character_id: characterId }).increment('cash_in_hand', refund);
        }
        await trx('share_orders').where({ id: order.id }).decrement('escrow_amount', refund);
      }`;
content = content.replace(oldRefundBuy, newRefundBuy);

const oldRefundSell = `      if (side === 'sell' && execPrice > price) {
        const surplus = (execPrice - price) * fillQty;
        await trx('character_finances').where({ character_id: buyerId }).increment('cash_in_hand', surplus);
        // Bug C fix: decrement escrow on the resting buy order so its cancel refund is correct
        await trx('share_orders').where({ id: counter.id }).decrement('escrow_amount', surplus);
      }`;
const newRefundSell = `      if (side === 'sell' && execPrice > price) {
        const surplus = (execPrice - price) * fillQty;
        if (counter.purchaser_company_id) {
          await trx('company_finances').where({ company_id: counter.purchaser_company_id }).increment('available_cash', surplus);
        } else {
          await trx('character_finances').where({ character_id: buyerId }).increment('cash_in_hand', surplus);
        }
        await trx('share_orders').where({ id: counter.id }).decrement('escrow_amount', surplus);
      }`;
content = content.replace(oldRefundSell, newRefundSell);

// 6. Share receipt
const oldShareReceipt = `      // Buyer receives shares (update cap table with weighted avg cost basis)
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
      }`;
const newShareReceipt = `      // Buyer receives shares (update cap table with weighted avg cost basis)
      const buyerHoldingCond = buyerCompanyId 
        ? { company_id: companyId, holder_company_id: buyerCompanyId }
        : { company_id: companyId, holder_character_id: buyerId };
      const existing = await trx('company_shares')
        .where(buyerHoldingCond)
        .forUpdate()
        .first();
      if (existing) {
        const oldShares = Number(existing.shares);
        const totalShares = oldShares + fillQty;
        let newAvg = execPrice; // Default to execution price
        if (totalShares > 0 && Number.isFinite(oldShares * Number(existing.avg_cost_basis)) && Number.isFinite(notional)) {
          newAvg = (oldShares * Number(existing.avg_cost_basis) + notional) / totalShares;
          if (!Number.isFinite(newAvg)) newAvg = execPrice; 
        }
        await trx('company_shares')
          .where(buyerHoldingCond)
          .update({ shares: totalShares, avg_cost_basis: newAvg, updated_at: trx.fn.now() });
      } else {
        await trx('company_shares').insert({
          company_id: companyId,
          holder_character_id: buyerCompanyId ? null : buyerId,
          holder_company_id: buyerCompanyId || null,
          shares: fillQty,
          avg_cost_basis: execPrice,
        });
      }`;
content = content.replace(oldShareReceipt, newShareReceipt);

fs.writeFileSync(file, content);
console.log('Successfully patched shareMarket.service.ts for placeOrder');
