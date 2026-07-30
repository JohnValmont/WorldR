import { logger } from '../../utils/logger';

/**
 * Economy tick processor — runs inside the world tick transaction each game month,
 * AFTER country month processing (so arc profits are fresh) and BEFORE the clock advances.
 *
 * 1. P2P loan payments — amortized monthly payment borrower -> lender.
 *    Insufficient cash = missed payment; 2 missed payments = default.
 * 2. Dividends — companies with a payout policy distribute payout% of this
 *    month's positive profit pro-rata across the cap table into character cash.
 * 3. Compliance costs — each company pays its legal structure's monthly cost.
 */
export async function processEconomyMonth(trx: any, year: number, month: number): Promise<{
  loanPaymentsCollected: number;
  loansDefaulted: number;
  dividendsPaid: number;
  complianceCollected: number;
}> {
  let loanPaymentsCollected = 0;
  let loansDefaulted = 0;
  let dividendsPaid = 0;
  let complianceCollected = 0;

  // ============ 1. Loan payments ============
  const activeLoans = await trx('p2p_loans').where({ status: 'active' }).forUpdate();
  for (const loan of activeLoans) {
    const payment = Number(loan.monthly_payment);
    const borrowerFin = await trx('character_finances')
      .where({ character_id: loan.borrower_character_id })
      .forUpdate()
      .first();

    if (borrowerFin && Number(borrowerFin.cash_in_hand) >= payment) {
      await trx('character_finances').where({ character_id: loan.borrower_character_id }).decrement('cash_in_hand', payment);
      await trx('character_finances').where({ character_id: loan.lender_character_id }).increment('cash_in_hand', payment);

      const monthsRemaining = Number(loan.months_remaining) - 1;
      await trx('p2p_loans').where({ id: loan.id }).update({
        months_remaining: monthsRemaining,
        total_paid: Number(loan.total_paid) + payment,
        missed_payments: 0, // catching up resets the streak
        status: monthsRemaining <= 0 ? 'repaid' : 'active',
        updated_at: trx.fn.now(),
      });
      loanPaymentsCollected++;
    } else {
      const missed = Number(loan.missed_payments) + 1;
      const defaulted = missed >= 2;
      await trx('p2p_loans').where({ id: loan.id }).update({
        missed_payments: missed,
        status: defaulted ? 'defaulted' : 'active',
        updated_at: trx.fn.now(),
      });
      if (defaulted) loansDefaulted++;
    }
  }

  // ============ 2. Dividends ============
  const policies = await trx('dividend_policies as dp')
    .join('company_finances as f', 'f.company_id', 'dp.company_id')
    .join('companies as c', 'c.id', 'dp.company_id')
    .where('dp.payout_percent', '>', 0)
    .where({ 'c.status': 'active' })
    .select('dp.company_id', 'dp.payout_percent', 'f.last_arc_profit', 'f.available_cash');

  for (const policy of policies) {
    const profit = Number(policy.last_arc_profit);
    if (profit <= 0) continue;

    const pool = Math.min(profit * (Number(policy.payout_percent) / 100), Number(policy.available_cash));
    if (pool <= 0) continue;

    const holders = await trx('company_shares')
      .where({ company_id: policy.company_id })
      .where('shares', '>', 0);
    const totalShares = holders.reduce((s: number, h: any) => s + Number(h.shares), 0);
    if (totalShares === 0) continue;

    let distributed = 0;
    for (const holder of holders) {
      const amount = Math.floor((pool * Number(holder.shares)) / totalShares * 100) / 100;
      if (amount <= 0) continue;

      // If the shares are held by a firm directly, or if the holder has a Capital Partners firm
      // we credit the FIRM instead of personal cash.
      let firmIdToCredit = holder.holder_company_id;
      
      if (!firmIdToCredit && holder.holder_character_id) {
        const capitalFirm = await trx('companies')
          .where({ owner_character_id: holder.holder_character_id, industry_id: 'finance', status: 'active', is_npc: false })
          .whereNot({ id: policy.company_id }) // Prevent a capital firm from intercepting its own dividends
          .first('id');
        if (capitalFirm) {
          firmIdToCredit = capitalFirm.id;
        }
      }

      if (firmIdToCredit) {
        // Credit the firm's treasury
        await trx('company_finances')
          .where({ company_id: firmIdToCredit })
          .increment('available_cash', amount)
          .increment('company_value', amount);
      } else if (holder.holder_character_id) {
        // Normal path: credit personal wallet
        await trx('character_finances')
          .where({ character_id: holder.holder_character_id })
          .increment('cash_in_hand', amount);
      }

      await trx('dividend_payments').insert({
        company_id: policy.company_id,
        holder_character_id: firmIdToCredit ? null : holder.holder_character_id,
        holder_company_id: firmIdToCredit || null,
        game_year: year,
        game_month: month,
        shares_held: holder.shares,
        amount,
      });
      distributed += amount;
    }

    if (distributed > 0) {
      await trx('company_finances')
        .where({ company_id: policy.company_id })
        .decrement('available_cash', distributed)
        .decrement('company_value', distributed);
      dividendsPaid++;
    }
  }

  // ============ 3. Structure compliance costs (player companies only) ============
  const companies = await trx('companies as c')
    .join('legal_structures as ls', 'ls.id', 'c.legal_structure_id')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.status': 'active', 'c.is_npc': false })
    .where('ls.monthly_compliance_cost', '>', 0)
    .select('c.id', 'ls.monthly_compliance_cost', 'f.available_cash');

  for (const co of companies) {
    const cost = Math.min(Number(co.monthly_compliance_cost), Math.max(0, Number(co.available_cash)));
    if (cost <= 0) continue;
    await trx('company_finances')
      .where({ company_id: co.id })
      .decrement('available_cash', cost)
      .decrement('company_value', cost);
    complianceCollected += cost;
  }

  // ============ 4. Character Net Worth History Snapshots ============
  const activeChars = await trx('characters').where({ status: 'active' });
  const hasTable = await trx.schema.hasTable('character_net_worth_history');
  let snapshotsInserted = 0;
  for (const char of activeChars) {
    const fin = await trx('character_finances').where({ character_id: char.id }).first();
    const buyEscrow = await trx('share_orders')
      .where({ character_id: char.id, status: 'open', side: 'buy' })
      .sum('escrow_amount as total_escrow')
      .first();
    const cash = Number(fin?.cash_in_hand || 0) + Number(buyEscrow?.total_escrow || 0);
    let equity = 0;

    const shares = await trx('company_shares as cs')
      .join('companies as c', 'c.id', 'cs.company_id')
      .join('company_finances as cf', 'cf.company_id', 'c.id')
      .where({ 'cs.holder_character_id': char.id, 'c.status': 'active' })
      .select(
        'cs.shares',
        'c.is_exchange_listed',
        'cs.company_id',
        'cf.company_value',
        'cf.available_cash',
        'cf.debt',
        trx.raw(`COALESCE((SELECT SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit) FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id WHERE mi.company_id = c.id), 0) as inventory_value`),
        trx.raw(`(SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id) + COALESCE((SELECT SUM(quantity) FROM share_orders WHERE company_id = cs.company_id AND side = 'sell' AND status = 'open'), 0) as total_shares`),
        trx.raw(`COALESCE((SELECT SUM(quantity) FROM share_orders WHERE company_id = cs.company_id AND character_id = cs.holder_character_id AND side = 'sell' AND status = 'open'), 0) as escrowed_shares`)
      );

    for (const s of shares) {
      const tot = Number(s.total_shares || 0);
      const myShares = Number(s.shares) + Number(s.escrowed_shares || 0);
      if (tot <= 0 || myShares <= 0) continue;

      if (s.is_exchange_listed) {
        // Listed: market cap basis (last close price × shares owned)
        const latestPriceRow = await trx('share_price_history')
          .where({ company_id: s.company_id })
          .orderBy('game_year', 'desc')
          .orderBy('game_month', 'desc')
          .first('close_price');
        const lastTrade = latestPriceRow ? null : await trx('share_trades')
          .where({ company_id: s.company_id })
          .orderBy('executed_at', 'desc')
          .first('price');
        const lastPrice = latestPriceRow
          ? Number(latestPriceRow.close_price)
          : lastTrade ? Number(lastTrade.price) : null;
        if (lastPrice != null && lastPrice > 0) {
          equity += myShares * lastPrice;
        } else {
          // No price yet: fall back to book value
          const bookValue = Math.max(0, Number(s.available_cash) - Number(s.debt || 0) + Number(s.inventory_value || 0));
          equity += (myShares / tot) * bookValue;
        }
      } else {
        // Private: book value
        const bookValue = Math.max(0, Number(s.available_cash) - Number(s.debt || 0) + Number(s.inventory_value || 0));
        equity += (myShares / tot) * bookValue;
      }
    }

    if (hasTable) {
      try {
        await trx('character_net_worth_history').insert({
          character_id: char.id,
          world_instance_id: char.world_instance_id,
          world_year: year,
          world_month: month,
          cash_in_hand: cash,
          equity_value: equity,
          total_net_worth: cash + equity
        });
        snapshotsInserted++;
      } catch (err) {
        logger.error(`Failed to insert net worth history for ${char.id}`, err);
      }
    }
  }

  logger.info(
    `[economy-tick] Y${year} M${month}: ${loanPaymentsCollected} loan payments, ${loansDefaulted} defaults, ` +
    `${dividendsPaid} companies paid dividends, $${complianceCollected.toFixed(0)} compliance collected, ` +
    `${snapshotsInserted} net worth snapshots saved`
  );

  return { loanPaymentsCollected, loansDefaulted, dividendsPaid, complianceCollected };
}
