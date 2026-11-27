import { refreshCompanyValue } from '../services/companyValue';
import { OWED_COMPANY_LOAN_STATUSES } from '../constants/companyAssets';
import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';
import {
  BANK_ID, COMPANY_LOAN_MAX_TERM, COMPANY_LOAN_MIN_TERM, PERSONAL_LOAN_MIN, PERSONAL_LOAN_REFUSED_RATINGS,
  PERSONAL_LOAN_SPREAD, PERSONAL_LOAN_TERM_MONTHS,
} from '../constants/banking';
import {
  companyBalanceSheet, facilityBaseRate, isCompanyFacility, monthlyPayment, parseAmortization, parseLoanAmount, parseTerm, personalLoanAllowed, personalLoanLimit,
} from '../services/banking.rules';

// ── Helper: resolve calling character from user session ─────────────────────
async function getActiveCharacter(userId: number) {
  const activeInstance = await db('world_instances').where({ status: 'active' }).first();
  if (!activeInstance) throw new Error('No active world instance');
  const character = await db('characters')
    .where({ user_id: userId, status: 'active', world_instance_id: activeInstance.id })
    .first();
  return character || null;
}

export class BankController {

  // ── GET /banks/institution/:bankId ─────────────────────────────────────────
  static async getInstitutionData(req: Request, res: Response, next: NextFunction) {
    try {
      const { bankId } = req.params;
      const bank = await db('banking_institutions').where({ id: bankId }).first();
      if (!bank) return res.status(404).json({ error: 'Bank not found' });

      const deposits = Number(bank.total_deposits);
      const treasury = Number(bank.base_treasury_injection);
      const rr = Number(bank.reserve_requirement_ratio);

      const totalAssets = deposits + treasury;
      const reserveRequired = totalAssets * rr;

      const loans = await db('banking_active_loans')
        .where({ bank_id: bankId, status: 'ACTIVE' })
        .sum('remaining_principal as total_lent');

      const totalLent = Number(loans[0]?.total_lent || 0);
      const maxLendable = totalAssets - reserveRequired;
      const availableLiquidity = maxLendable - totalLent;

      res.json({
        id: bank.id,
        name: bank.name,
        totalAssets,
        availableLiquidity,
        baseLendingRate: Number(bank.base_lending_rate),
      });
    } catch (error) {
      next(error);
    }
  }

  // ── GET /banks/dossier/:companyId ──────────────────────────────────────────
  static async getCreditDossier(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;

      // Resolve to character first (the correct pattern used everywhere else)
      const character = await getActiveCharacter(req.user!.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const company = await db('companies').where({ id: companyId }).first();
      if (!company) return res.status(404).json({ error: 'Company not found' });

      // Correct ownership check: character UUID vs character UUID
      if (company.owner_character_id !== character.id) {
        return res.status(403).json({ error: 'Unauthorized: company does not belong to this character' });
      }

      // Financial details
      const finances = await db('company_finances').where({ company_id: companyId }).first();
      const cash = Number(finances?.available_cash || 0);
      const dbEquity = Number(finances?.company_value || 0);
      const dbDebt = Number(finances?.debt || 0);

      let reputationScore = Number(company.reputation || 0);
      let trustScore = 0;
      let engineeringRep = 0;

      // Every loan the company still owes (a defaulted loan is still owed).
      const owedLoans = await db('banking_active_loans')
        .where({ borrower_type: 'company', borrower_id: companyId })
        .whereIn('status', OWED_COMPANY_LOAN_STATUSES)
        .orderBy('created_at', 'asc');
      const activeLoans = owedLoans.filter((l: any) => l.status === 'ACTIVE');
      const bankingLiabilities = owedLoans.reduce((sum: number, l: any) => sum + Number(l.remaining_principal), 0);

      // company_value is the one book value (cash − debt − bank loans owed + assets).
      const { totalAssets, totalLiabilities, equity } = companyBalanceSheet(dbEquity, dbDebt, bankingLiabilities);

      // State Rescue Guarantee: The National Bank implicitly backs manufacturing firms with a minimum $25M collateral 
      // allowance so distressed players can borrow their way out of bankruptcy.
      const effectiveAssets = Math.max(totalAssets, 25_000_000);

      // Net income approximation for DSCR
      const mockNetIncome = Math.max(effectiveAssets * 0.15, 500_000);
      const annualDebtService = activeLoans.reduce((sum: number, l: any) => sum + (Number(l.monthly_payment) * 12), 0);
      const dscr = annualDebtService > 0 ? mockNetIncome / annualDebtService : mockNetIncome;
      const ltv = totalLiabilities / effectiveAssets;

      if (company.industry_id === 'manufacturing') {
        const brandStats = await db('manufacturing_brand_awareness').where({ company_id: companyId });
        trustScore = brandStats.reduce((sum: number, b: any) => sum + Number(b.trust), 0) / (brandStats.length || 1);

        const eng = await db('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
        if (eng) {
          engineeringRep = (Number(eng.reliability_rep) + Number(eng.mfg_efficiency_rep)) / 2;
        }
      }

      // Sovereign Score
      const ltvScore = ltv < 0.2 ? 95 : ltv < 0.5 ? 85 : ltv < 0.8 ? 70 : 40;
      const dscrScore = annualDebtService <= 1 ? 100 : (dscr > 2.0 ? 90 : dscr > 1.25 ? 75 : 50);
      const liqScore = cash > 1_000_000 ? 90 : cash > 100_000 ? 70 : cash > 0 ? 50 : 30;
      const marginScore = 80;
      const industryScore = 80;

      let riskScore = (ltvScore * 0.3) + (dscrScore * 0.25) + (liqScore * 0.2) + (marginScore * 0.15) + (industryScore * 0.10);
      riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

      let ratingTier = 'D';
      if (riskScore >= 80) ratingTier = 'AAA';
      else if (riskScore >= 60) ratingTier = 'BBB';
      else if (riskScore >= 40) ratingTier = 'B';
      else if (riskScore >= 20) ratingTier = 'CCC';

      // Save rating history (wrapped in try-catch — table may not exist on old prod DBs)
      try {
        const clock = await db('world_clock').first();
        if (clock) {
          await db('company_credit_ratings').insert({
            company_id: companyId,
            world_year: clock.current_year,
            world_month: clock.current_month,
            rating_tier: ratingTier,
            risk_score: riskScore,
          }).onConflict(['company_id', 'world_year', 'world_month']).merge();
        }
      } catch (_ratingErr) {
        // Non-fatal: rating history table may not yet be migrated on this environment
      }

      const bank = await db('banking_institutions').where({ id: BANK_ID }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      res.json({
        ratingTier,
        riskScore,
        metrics: {
          character: reputationScore,
          capacity: cash,
          capital: equity,
          collateral: totalAssets,
          conditions: company.industry_id,
          totalAssets,
          totalLiabilities,
          equity,
          mockNetIncome,
          dscr,
          ltv,
        },
        activeLoans: owedLoans,
        baseRate,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /banks/loan/:companyId/take ──────────────────────────────────────
  // Every check and both writes (cash, loan) happen in one transaction with the
  // company's balance locked, so a failed request never leaves money behind.
  // The economy tick collects the monthly payment (economyTick.service.ts).
  static async takeLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      const { facilityType, purpose } = req.body ?? {};
      const principalAmount = parseLoanAmount(req.body?.principalAmount);
      const term = parseTerm(req.body?.term);
      const amortizationType = parseAmortization(req.body?.amortizationType);
      if (!isCompanyFacility(facilityType)) return res.status(400).json({ error: 'Invalid facility type.' });
      if (principalAmount === null) return res.status(400).json({ error: 'Enter a loan amount in whole dollars above zero.' });
      if (term === null) return res.status(400).json({ error: `The term must be ${COMPANY_LOAN_MIN_TERM} to ${COMPANY_LOAN_MAX_TERM} months.` });
      if (amortizationType === null) return res.status(400).json({ error: 'Repayment must be amortizing or balloon.' });

      const character = await getActiveCharacter(req.user!.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const outcome = await db.transaction(async (trx) => {
        const company = await trx('companies').where({ id: companyId }).first();
        if (!company) return { status: 404, body: { error: 'Company not found' } };
        if (company.owner_character_id !== character.id) return { status: 403, body: { error: 'Unauthorized' } };

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (!finances) return { status: 404, body: { error: 'Company finances not found' } };

        const defaulted = await trx('banking_active_loans').where({ borrower_id: companyId, status: 'DEFAULTED' }).first();
        if (defaulted) return { status: 400, body: { error: 'The bank will not lend to a company that has defaulted on a loan.' } };
        const existingLoan = await trx('banking_active_loans')
          .where({ borrower_id: companyId, facility_type: facilityType, status: 'ACTIVE' })
          .first();
        if (existingLoan) return { status: 400, body: { error: 'You already have an active facility of this type.' } };

        const clock = await trx('world_clock').first();
        const bank = await trx('banking_institutions').where({ id: BANK_ID }).first();
        if (!bank) return { status: 503, body: { error: 'The bank is closed.' } };
        const baseRate = Number(bank.base_lending_rate);

        const totalAssetsBank = Number(bank.total_deposits) + Number(bank.base_treasury_injection);
        const reserveRequired = totalAssetsBank * Number(bank.reserve_requirement_ratio);
        const loans = await trx('banking_active_loans').where({ bank_id: BANK_ID, status: 'ACTIVE' }).sum('remaining_principal as total_lent');
        const totalLent = Number(loans[0]?.total_lent || 0);
        const availableLiquidity = totalAssetsBank - reserveRequired - totalLent;
        if (principalAmount > availableLiquidity) {
          return { status: 400, body: { error: 'The bank does not have enough liquidity to fund this loan.' } };
        }

        const activeCompanyLoans = await trx('banking_active_loans').where({ borrower_id: companyId, status: 'ACTIVE' });
        const bankingLiabilities = activeCompanyLoans.reduce((sum: number, l: any) => sum + Number(l.remaining_principal), 0);
        const currentCash = Number(finances.available_cash || 0);
        const dbEquity = Number(finances.company_value || 0);
        const dbDebt = Number(finances.debt || 0);

        // company_value is the one book value (cash − debt − bank loans owed + assets).
        const { totalAssets, totalLiabilities: currentLiabilities } = companyBalanceSheet(dbEquity, dbDebt, bankingLiabilities);
        // State Rescue Guarantee: the bank counts at least $25M of collateral for any company.
        const effectiveAssets = Math.max(totalAssets, 25_000_000);
        const ltv = (currentLiabilities + principalAmount) / effectiveAssets;
        if (ltv > 1.0) return { status: 400, body: { error: 'Loan denied: Post-deal LTV exceeds 100%. Collateral insufficient.' } };

        const mockNetIncome = Math.max(effectiveAssets * 0.15, 500_000);
        const annualDebtService = activeCompanyLoans.reduce((sum: number, l: any) => sum + (Number(l.monthly_payment) * 12), 0) + (principalAmount * 0.10);
        const dscr = mockNetIncome / annualDebtService;
        if (dscr < 1.0) return { status: 400, body: { error: 'Loan denied: DSCR below 1.0x. Cash flow insufficient.' } };

        const portfolioEquity = effectiveAssets - currentLiabilities;
        const maxPrincipal = Math.min(availableLiquidity, (portfolioEquity * 0.6) + (effectiveAssets * 0.8));
        if (principalAmount > maxPrincipal) {
          return { status: 400, body: { error: `Invalid principal amount. Max for your portfolio is $${Math.floor(Math.max(0, maxPrincipal)).toLocaleString('en-US')}` } };
        }

        const ltvScore = ltv < 0.5 ? 95 : ltv < 0.85 ? 85 : ltv < 1.0 ? 70 : 40;
        const dscrScore = dscr > 2.0 ? 90 : dscr > 1.25 ? 75 : 50;
        const liqScore = currentCash > principalAmount ? 90 : 60;
        const overallScore = (ltvScore * 0.3) + (dscrScore * 0.25) + (liqScore * 0.2) + (88 * 0.15) + (80 * 0.10);
        const riskPremium = overallScore > 85 ? 0.005 : overallScore > 70 ? 0.015 : 0.03;

        let interestRate = facilityBaseRate(facilityType, baseRate) + riskPremium;
        if (availableLiquidity / totalAssetsBank < 0.30) interestRate += 0.02; // liquidity squeeze
        if (company.industry_id === 'manufacturing') interestRate -= 0.01;     // state mandate discount

        const pmt = monthlyPayment(principalAmount, interestRate, term, amortizationType);

        await trx('company_finances').where({ company_id: companyId }).increment('available_cash', principalAmount);
        await trx('banking_active_loans').insert({
          bank_id: BANK_ID,
          borrower_type: 'company',
          borrower_id: companyId,
          facility_type: facilityType,
          principal_amount: principalAmount,
          remaining_principal: principalAmount,
          interest_rate: interestRate,
          monthly_payment: pmt,
          next_payment_arc: (clock?.current_month || 0) + 1,
          amortization_type: amortizationType,
          purpose: typeof purpose === 'string' ? purpose.slice(0, 200) : 'general',
          term_months: term,
          months_remaining: term,
          missed_payments: 0,
        });
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: clock?.current_year || 0,
          game_month: clock?.current_month || 0,
          game_day: clock?.current_day || 1,
          entry_type: 'loan_drawdown', // borrowed money, not revenue
          amount: principalAmount,
          balance_after: currentCash + principalAmount,
          description: `Loan Disbursement (${facilityType.toUpperCase()})`,
        });
        await refreshCompanyValue(trx, companyId);
        return { status: 200, body: { message: 'Loan secured successfully.', monthlyPayment: pmt } };
      });
      return res.status(outcome.status).json(outcome.body);
    } catch (error) {
      next(error);
    }
  }

  // ── GET /banks/dossier/personal ───────────────────────────────────────────
  static async getPersonalCreditDossier(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await getActiveCharacter(req.user!.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const finances = await db('character_finances').where({ character_id: character.id }).first();
      const cash = Number(finances?.cash_in_hand || 0);
      const netWorth = Number(finances?.net_worth || 0);

      let riskScore = 50;
      if (cash > 100_000) riskScore += 10;
      if (cash < 0) riskScore -= 20;
      if (netWorth > 500_000) riskScore += 15;
      riskScore = Math.max(0, Math.min(100, riskScore));

      let ratingTier = 'D';
      if (riskScore >= 80) ratingTier = 'AAA';
      else if (riskScore >= 60) ratingTier = 'BBB';
      else if (riskScore >= 40) ratingTier = 'B';
      else if (riskScore >= 20) ratingTier = 'CCC';

      // Save rating history (wrapped — table may not exist)
      try {
        const clock = await db('world_clock').first();
        if (clock) {
          await db('character_credit_ratings').insert({
            character_id: character.id,
            world_year: clock.current_year,
            world_month: clock.current_month,
            rating_tier: ratingTier,
            risk_score: riskScore,
          }).onConflict(['character_id', 'world_year', 'world_month']).merge();
        }
      } catch (_ratingErr) {
        // Non-fatal
      }

      const bank = await db('banking_institutions').where({ id: BANK_ID }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      res.json({
        ratingTier,
        riskScore,
        metrics: {
          character: 70,
          capacity: cash,
          capital: netWorth,
          collateral: netWorth * 0.3,
          conditions: 'Stable',
        },
        baseRate,
        // What the bank will lend you personally, and what you owe it.
        personalLoanLimit: personalLoanLimit(netWorth),
        activeLoans: await db('character_debt_facilities').where({ character_id: character.id }).whereIn('status', ['active', 'defaulted']),
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /banks/loan/personal/take ────────────────────────────────────────
  // One personal loan at a time, capped by net worth (constants/banking.ts).
  // Cash and loan are written together; the economy tick collects repayments.
  static async takePersonalLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const facilityType = req.body?.facilityType ?? 'personal';
      if (facilityType !== 'personal') return res.status(400).json({ error: 'Unknown facility type.' });
      const principalAmount = parseLoanAmount(req.body?.principalAmount);
      if (principalAmount === null) return res.status(400).json({ error: 'Enter a loan amount in whole dollars above zero.' });

      const character = await getActiveCharacter(req.user!.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const outcome = await db.transaction(async (trx) => {
        const finances = await trx('character_finances').where({ character_id: character.id }).forUpdate().first();
        if (!finances) return { status: 404, body: { error: 'Character finances not found' } };

        const latestRating = await trx('character_credit_ratings')
          .where({ character_id: character.id })
          .orderBy('world_year', 'desc')
          .orderBy('world_month', 'desc')
          .first();
        if (PERSONAL_LOAN_REFUSED_RATINGS.includes(latestRating?.rating_tier || 'D')) {
          return { status: 400, body: { error: 'Credit rating too low for personal loan.' } };
        }

        const loans = await trx('character_debt_facilities').where({ character_id: character.id }).whereIn('status', ['active', 'defaulted']);
        if (loans.some((l: any) => l.status === 'defaulted')) return { status: 400, body: { error: 'The bank will not lend to you after a default.' } };
        if (loans.length) return { status: 400, body: { error: 'You already have a personal loan. Repay it first.' } };

        const { ok, limit } = personalLoanAllowed(principalAmount, Number(finances.net_worth || 0));
        if (!ok) {
          return { status: 400, body: { error: limit < PERSONAL_LOAN_MIN
            ? 'Your net worth is too low for a personal loan.'
            : `You can borrow $${PERSONAL_LOAN_MIN.toLocaleString('en-US')} to $${limit.toLocaleString('en-US')}.` } };
        }

        const bank = await trx('banking_institutions').where({ id: BANK_ID }).first();
        const interestRate = Number(bank?.base_lending_rate ?? 0.05) + PERSONAL_LOAN_SPREAD;
        const pmt = monthlyPayment(principalAmount, interestRate, PERSONAL_LOAN_TERM_MONTHS);

        await trx('character_finances').where({ character_id: character.id }).increment('cash_in_hand', principalAmount);
        await trx('character_debt_facilities').insert({
          id: randomUUID(),
          character_id: character.id,
          bank_id: BANK_ID,
          facility_type: 'personal',
          principal_amount: principalAmount,
          remaining_principal: principalAmount,
          interest_rate: interestRate,
          term_months: PERSONAL_LOAN_TERM_MONTHS,
          months_remaining: PERSONAL_LOAN_TERM_MONTHS,
          monthly_payment: pmt,
          missed_payments: 0,
          status: 'active',
        });
        return { status: 200, body: { message: 'Personal loan secured successfully.', monthlyPayment: pmt } };
      });
      return res.status(outcome.status).json(outcome.body);
    } catch (error) {
      next(error);
    }
  }
}
