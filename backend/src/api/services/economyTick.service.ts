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
      await trx('character_finances')
        .where({ character_id: holder.holder_character_id })
        .increment('cash_in_hand', amount);
      await trx('dividend_payments').insert({
        company_id: policy.company_id,
        holder_character_id: holder.holder_character_id,
        game_year: year,
        game_month: month,
        shares_held: holder.shares,
        amount,
      });
      distributed += amount;
    }

    if (distributed > 0) {
      await trx('company_finances').where({ company_id: policy.company_id }).decrement('available_cash', distributed);
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
    await trx('company_finances').where({ company_id: co.id }).decrement('available_cash', cost);
    complianceCollected += cost;
  }

  logger.info(
    `[economy-tick] Y${year} M${month}: ${loanPaymentsCollected} loan payments, ${loansDefaulted} defaults, ` +
    `${dividendsPaid} companies paid dividends, §${complianceCollected.toFixed(0)} compliance collected`
  );

  return { loanPaymentsCollected, loansDefaulted, dividendsPaid, complianceCollected };
}
