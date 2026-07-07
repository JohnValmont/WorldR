import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

/**
 * Investments Service — player-to-player loans and private equity placements.
 *
 * Loans: lender posts an offer (open or targeted). Borrower accepts -> principal
 * moves lender -> borrower immediately. The world tick collects an amortized
 * monthly payment each game month. Insufficient funds = missed payment;
 * 2 missed payments = default (loan frozen, borrower blocked from new loans).
 *
 * Placements: shareholders of private/public companies offer share blocks at a
 * fixed price (open or targeted). Enforces the structure's max_shareholders cap.
 */

// Amortized monthly payment: P * r * (1+r)^n / ((1+r)^n - 1); falls back to principal/n at 0%
export function computeMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
  if (monthlyRate <= 0) return principal / termMonths;
  const f = Math.pow(1 + monthlyRate, termMonths);
  return (principal * monthlyRate * f) / (f - 1);
}

// ============ Loan offers ============

export async function createLoanOffer(params: {
  lenderCharacterId: string;
  maxAmount: number;
  monthlyInterestRate: number;
  termMonths: number;
  purpose?: string;
  targetCharacterId?: string | null;
}) {
  const { lenderCharacterId, maxAmount, monthlyInterestRate, termMonths, purpose, targetCharacterId } = params;

  if (!Number.isFinite(maxAmount) || maxAmount <= 0) throw new AppError('Invalid amount', 400, 'BAD_REQUEST');
  if (monthlyInterestRate < 0 || monthlyInterestRate > 0.25) throw new AppError('Interest rate must be 0-25% monthly', 400, 'BAD_REQUEST');
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 60) throw new AppError('Term must be 1-60 months', 400, 'BAD_REQUEST');

  const fin = await db('character_finances').where({ character_id: lenderCharacterId }).first();
  if (!fin || Number(fin.cash_in_hand) < maxAmount) {
    throw new AppError('You do not have enough cash to back this offer', 400, 'INSUFFICIENT_FUNDS');
  }

  const [offer] = await db('loan_offers')
    .insert({
      lender_character_id: lenderCharacterId,
      target_character_id: targetCharacterId || null,
      max_amount: maxAmount,
      monthly_interest_rate: monthlyInterestRate,
      term_months: termMonths,
      purpose: purpose || null,
    })
    .returning('*');
  return offer;
}

export async function cancelLoanOffer(offerId: string, lenderCharacterId: string) {
  const updated = await db('loan_offers')
    .where({ id: offerId, lender_character_id: lenderCharacterId, status: 'open' })
    .update({ status: 'cancelled', updated_at: db.fn.now() });
  if (!updated) throw new AppError('Offer not found or not open', 404, 'NOT_FOUND');
  return { cancelled: true };
}

export async function acceptLoanOffer(offerId: string, borrowerCharacterId: string, amount: number) {
  return db.transaction(async (trx) => {
    const offer = await trx('loan_offers').where({ id: offerId, status: 'open' }).forUpdate().first();
    if (!offer) throw new AppError('Offer not found or no longer open', 404, 'NOT_FOUND');
    if (offer.lender_character_id === borrowerCharacterId) throw new AppError('Cannot accept your own offer', 400, 'BAD_REQUEST');
    if (offer.target_character_id && offer.target_character_id !== borrowerCharacterId) {
      throw new AppError('This offer is reserved for another player', 403, 'FORBIDDEN');
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(offer.max_amount)) {
      throw new AppError('Invalid loan amount', 400, 'BAD_REQUEST');
    }

    // Borrowers with a defaulted loan cannot take new loans
    const defaulted = await trx('p2p_loans').where({ borrower_character_id: borrowerCharacterId, status: 'defaulted' }).first();
    if (defaulted) throw new AppError('You have a defaulted loan and cannot borrow', 403, 'CREDIT_FROZEN');

    const lenderFin = await trx('character_finances').where({ character_id: offer.lender_character_id }).forUpdate().first();
    if (!lenderFin || Number(lenderFin.cash_in_hand) < amount) {
      throw new AppError('Lender no longer has sufficient funds', 400, 'LENDER_INSUFFICIENT');
    }

    const clock = await trx('world_clock').first();
    const monthlyPayment = computeMonthlyPayment(amount, Number(offer.monthly_interest_rate), offer.term_months);

    // Move principal lender -> borrower
    await trx('character_finances').where({ character_id: offer.lender_character_id }).decrement('cash_in_hand', amount);
    await trx('character_finances').where({ character_id: borrowerCharacterId }).increment('cash_in_hand', amount);

    const [loan] = await trx('p2p_loans')
      .insert({
        offer_id: offer.id,
        lender_character_id: offer.lender_character_id,
        borrower_character_id: borrowerCharacterId,
        principal: amount,
        monthly_interest_rate: offer.monthly_interest_rate,
        term_months: offer.term_months,
        months_remaining: offer.term_months,
        monthly_payment: Math.round(monthlyPayment * 100) / 100,
        started_game_year: clock?.current_year || 1,
        started_game_month: clock?.current_month || 1,
      })
      .returning('*');

    await trx('loan_offers').where({ id: offer.id }).update({ status: 'accepted', updated_at: trx.fn.now() });
    return loan;
  });
}

export async function repayLoanEarly(loanId: string, borrowerCharacterId: string) {
  return db.transaction(async (trx) => {
    const loan = await trx('p2p_loans').where({ id: loanId, borrower_character_id: borrowerCharacterId, status: 'active' }).forUpdate().first();
    if (!loan) throw new AppError('Active loan not found', 404, 'NOT_FOUND');

    // Early payoff = remaining months * monthly payment (no discount — keeps it simple and favors lenders)
    const payoff = Number(loan.monthly_payment) * Number(loan.months_remaining);
    const fin = await trx('character_finances').where({ character_id: borrowerCharacterId }).forUpdate().first();
    if (!fin || Number(fin.cash_in_hand) < payoff) throw new AppError('Insufficient funds for payoff', 400, 'INSUFFICIENT_FUNDS');

    await trx('character_finances').where({ character_id: borrowerCharacterId }).decrement('cash_in_hand', payoff);
    await trx('character_finances').where({ character_id: loan.lender_character_id }).increment('cash_in_hand', payoff);
    await trx('p2p_loans').where({ id: loanId }).update({
      status: 'repaid',
      months_remaining: 0,
      total_paid: Number(loan.total_paid) + payoff,
      updated_at: trx.fn.now(),
    });
    return { repaid: true, payoff };
  });
}

export async function getOpenLoanOffers(characterId: string) {
  return db('loan_offers as o')
    .join('characters as ch', 'ch.id', 'o.lender_character_id')
    .where({ 'o.status': 'open' })
    .where(function () {
      this.whereNull('o.target_character_id').orWhere('o.target_character_id', characterId);
    })
    .orderBy('o.created_at', 'desc')
    .select('o.*', 'ch.name as lender_name');
}

export async function getMyLoans(characterId: string) {
  const [lent, borrowed, myOffers] = await Promise.all([
    db('p2p_loans as l')
      .join('characters as ch', 'ch.id', 'l.borrower_character_id')
      .where({ 'l.lender_character_id': characterId })
      .orderBy('l.created_at', 'desc')
      .select('l.*', 'ch.name as borrower_name'),
    db('p2p_loans as l')
      .join('characters as ch', 'ch.id', 'l.lender_character_id')
      .where({ 'l.borrower_character_id': characterId })
      .orderBy('l.created_at', 'desc')
      .select('l.*', 'ch.name as lender_name'),
    db('loan_offers').where({ lender_character_id: characterId, status: 'open' }).orderBy('created_at', 'desc'),
  ]);
  return { lent, borrowed, myOffers };
}

// ============ Private equity placements ============

export async function createPlacement(params: {
  companyId: string;
  sellerCharacterId: string;
  shares: number;
  pricePerShare: number;
  targetCharacterId?: string | null;
}) {
  const { companyId, sellerCharacterId, shares, pricePerShare, targetCharacterId } = params;
  if (!Number.isInteger(shares) || shares <= 0) throw new AppError('Invalid share count', 400, 'BAD_REQUEST');
  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) throw new AppError('Invalid price', 400, 'BAD_REQUEST');

  return db.transaction(async (trx) => {
    const company = await trx('companies').where({ id: companyId }).first();
    if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
    if (company.is_npc) throw new AppError('NPC company shares cannot be traded', 400, 'BAD_REQUEST');

    const structure = await trx('legal_structures').where({ id: company.legal_structure_id }).first();
    if (!structure?.can_sell_equity) {
      throw new AppError('Sole traders cannot sell equity. Convert to a private company first.', 400, 'STRUCTURE_FORBIDS');
    }

    const holding = await trx('company_shares')
      .where({ company_id: companyId, holder_character_id: sellerCharacterId })
      .forUpdate()
      .first();
    if (!holding || Number(holding.shares) < shares) throw new AppError('Insufficient shares', 400, 'INSUFFICIENT_SHARES');

    // Lock the shares (escrow) — split into two calls (same Bug A fix: knex can't chain .decrement().update())
    await trx('company_shares')
      .where({ company_id: companyId, holder_character_id: sellerCharacterId })
      .decrement('shares', shares);
    await trx('company_shares')
      .where({ company_id: companyId, holder_character_id: sellerCharacterId })
      .update({ updated_at: trx.fn.now() });

    const [placement] = await trx('equity_placements')
      .insert({
        company_id: companyId,
        seller_character_id: sellerCharacterId,
        target_character_id: targetCharacterId || null,
        shares,
        price_per_share: pricePerShare,
      })
      .returning('*');
    return placement;
  });
}

export async function cancelPlacement(placementId: string, sellerCharacterId: string) {
  return db.transaction(async (trx) => {
    const placement = await trx('equity_placements')
      .where({ id: placementId, seller_character_id: sellerCharacterId, status: 'open' })
      .forUpdate()
      .first();
    if (!placement) throw new AppError('Placement not found or not open', 404, 'NOT_FOUND');

    // Return escrowed shares
    await trx('company_shares')
      .where({ company_id: placement.company_id, holder_character_id: sellerCharacterId })
      .increment('shares', Number(placement.shares));
    await trx('equity_placements').where({ id: placementId }).update({ status: 'cancelled', updated_at: trx.fn.now() });
    return { cancelled: true };
  });
}

export async function acceptPlacement(placementId: string, buyerCharacterId: string) {
  return db.transaction(async (trx) => {
    const placement = await trx('equity_placements').where({ id: placementId, status: 'open' }).forUpdate().first();
    if (!placement) throw new AppError('Placement not found or no longer open', 404, 'NOT_FOUND');
    if (placement.seller_character_id === buyerCharacterId) throw new AppError('Cannot buy your own placement', 400, 'BAD_REQUEST');
    if (placement.target_character_id && placement.target_character_id !== buyerCharacterId) {
      throw new AppError('This placement is reserved for another player', 403, 'FORBIDDEN');
    }

    const company = await trx('companies').where({ id: placement.company_id }).first();
    const structure = await trx('legal_structures').where({ id: company.legal_structure_id }).first();

    // Shareholder cap check (only counts holders with shares > 0, buyer may already hold)
    if (structure?.max_shareholders != null) {
      const holders = await trx('company_shares')
        .where({ company_id: placement.company_id })
        .where('shares', '>', 0)
        .select('holder_character_id');
      const holderIds = new Set(holders.map((h: any) => h.holder_character_id));
      if (!holderIds.has(buyerCharacterId) && holderIds.size >= structure.max_shareholders) {
        throw new AppError(`This company has reached its ${structure.max_shareholders}-shareholder limit`, 400, 'SHAREHOLDER_CAP');
      }
    }

    const total = Number(placement.shares) * Number(placement.price_per_share);
    const buyerFin = await trx('character_finances').where({ character_id: buyerCharacterId }).forUpdate().first();
    if (!buyerFin || Number(buyerFin.cash_in_hand) < total) throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');

    // Cash buyer -> seller
    await trx('character_finances').where({ character_id: buyerCharacterId }).decrement('cash_in_hand', total);
    await trx('character_finances').where({ character_id: placement.seller_character_id }).increment('cash_in_hand', total);

    // Shares (already escrowed from seller) -> buyer with weighted avg cost basis
    const existing = await trx('company_shares')
      .where({ company_id: placement.company_id, holder_character_id: buyerCharacterId })
      .forUpdate()
      .first();
    if (existing) {
      const oldShares = Number(existing.shares);
      const qty = Number(placement.shares);
      const newAvg = (oldShares * Number(existing.avg_cost_basis) + total) / (oldShares + qty);
      await trx('company_shares')
        .where({ company_id: placement.company_id, holder_character_id: buyerCharacterId })
        .update({ shares: oldShares + qty, avg_cost_basis: newAvg, updated_at: trx.fn.now() });
    } else {
      await trx('company_shares').insert({
        company_id: placement.company_id,
        holder_character_id: buyerCharacterId,
        shares: placement.shares,
        avg_cost_basis: placement.price_per_share,
      });
    }

    await trx('equity_placements').where({ id: placementId }).update({ status: 'accepted', updated_at: trx.fn.now() });
    return { accepted: true, total };
  });
}

export async function getOpenPlacements(characterId: string) {
  return db('equity_placements as p')
    .join('companies as c', 'c.id', 'p.company_id')
    .join('characters as ch', 'ch.id', 'p.seller_character_id')
    .where({ 'p.status': 'open' })
    .where(function () {
      this.whereNull('p.target_character_id').orWhere('p.target_character_id', characterId);
    })
    .orderBy('p.created_at', 'desc')
    .select('p.*', 'c.name as company_name', 'c.legal_structure_id', 'ch.name as seller_name');
}
