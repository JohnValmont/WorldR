import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';

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

      const activeLoans = await db('banking_active_loans').where({ borrower_id: companyId, status: 'ACTIVE' });
      const bankingLiabilities = activeLoans.reduce((sum: number, l: any) => sum + Number(l.remaining_principal), 0);
      
      const totalLiabilities = dbDebt + bankingLiabilities;

      // company_value in DB is Equity from manufacturing perspective: Cash + HardAssets(Land/Factories) - dbDebt.
      // Therefore, Gross Assets (Collateral) = dbEquity + dbDebt
      const totalAssets = dbEquity + dbDebt;
      const equity = totalAssets - totalLiabilities;

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

      const bank = await db('banking_institutions').where({ id: 'drennia-national' }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      res.json({
        ratingTier,
        riskScore,
        metrics: {
          character: reputationScore,
          capacity: cash,
          capital: bookValue,
          collateral: totalAssets,
          conditions: company.industry_id,
          totalAssets,
          totalLiabilities,
          equity,
          mockNetIncome,
          dscr,
          ltv,
        },
        activeLoans,
        baseRate,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /banks/loan/:companyId/take ──────────────────────────────────────
  static async takeLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      const { facilityType, principalAmount, term = 36, amortizationType = 'amortizing', purpose = 'general' } = req.body;

      // Correct ownership check via character
      const character = await getActiveCharacter(req.user!.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });

      const company = await db('companies').where({ id: companyId }).first();
      if (!company) return res.status(404).json({ error: 'Company not found' });

      if (company.owner_character_id !== character.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const existingLoan = await db('banking_active_loans')
        .where({ borrower_id: companyId, facility_type: facilityType, status: 'ACTIVE' })
        .first();
      if (existingLoan) {
        return res.status(400).json({ error: 'You already have an active facility of this type.' });
      }

      const clock = await db('world_clock').first();

      const bank = await db('banking_institutions').where({ id: 'drennia-national' }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      const totalAssetsBank = Number(bank.total_deposits) + Number(bank.base_treasury_injection);
      const reserveRequired = totalAssetsBank * Number(bank.reserve_requirement_ratio);
      const loans = await db('banking_active_loans').where({ bank_id: 'drennia-national', status: 'ACTIVE' }).sum('remaining_principal as total_lent');
      const totalLent = Number(loans[0]?.total_lent || 0);
      const availableLiquidity = totalAssetsBank - reserveRequired - totalLent;

      if (principalAmount > availableLiquidity) {
        return res.status(400).json({ error: 'The bank does not have enough liquidity to fund this loan.' });
      }

      const activeCompanyLoans = await db('banking_active_loans').where({ borrower_id: companyId, status: 'ACTIVE' });
      const bankingLiabilities = activeCompanyLoans.reduce((sum: number, l: any) => sum + Number(l.remaining_principal), 0);

      const finances = await db('company_finances').where({ company_id: companyId }).first();
      const currentCash = Number(finances?.available_cash || 0);
      const dbEquity = Number(finances?.company_value || 0);
      const dbDebt = Number(finances?.debt || 0);

      const currentLiabilities = dbDebt + bankingLiabilities;
      // company_value in DB is Equity from manufacturing perspective: Cash + HardAssets(Land/Factories) - dbDebt.
      // Therefore, Gross Assets (Collateral) = dbEquity + dbDebt
      const totalAssets = dbEquity + dbDebt;

      const effectiveAssets = Math.max(totalAssets, 25_000_000);
      const newTotalLiabilities = currentLiabilities + principalAmount;
      const ltv = newTotalLiabilities / effectiveAssets;

      if (ltv > 1.0) {
        return res.status(400).json({ error: 'Loan denied: Post-deal LTV exceeds 100%. Collateral insufficient.' });
      }

      const mockNetIncome = Math.max(effectiveAssets * 0.15, 500_000);
      const annualDebtService = activeCompanyLoans.reduce((sum: number, l: any) => sum + (Number(l.monthly_payment) * 12), 0) + (principalAmount * 0.10);
      const dscr = mockNetIncome / annualDebtService;

      if (dscr < 1.0) {
        return res.status(400).json({ error: 'Loan denied: DSCR below 1.0x. Cash flow insufficient.' });
      }

      const ltvScore = ltv < 0.5 ? 95 : ltv < 0.85 ? 85 : ltv < 1.0 ? 70 : 40;
      const dscrScore = dscr > 2.0 ? 90 : dscr > 1.25 ? 75 : 50;
      const liqScore = currentCash > principalAmount ? 90 : 60;
      const overallScore = (ltvScore * 0.3) + (dscrScore * 0.25) + (liqScore * 0.2) + (88 * 0.15) + (80 * 0.10);

      let riskPremium = overallScore > 85 ? 0.005 : overallScore > 70 ? 0.015 : 0.03;

      let facilityRate = baseRate;
      if (facilityType === 'revolver') {
        facilityRate = baseRate + 0.035;
      } else if (facilityType === 'term') {
        facilityRate = 0.0725;
      } else if (facilityType === 'trade') {
        facilityRate = baseRate + 0.02;
      } else {
        return res.status(400).json({ error: 'Invalid facility type.' });
      }

      let interestRate = facilityRate + riskPremium;

      const portfolioEquity = effectiveAssets - currentLiabilities;
      const maxFacilityByAssets = (portfolioEquity * 0.6) + (effectiveAssets * 0.8);
      const maxPrincipal = Math.min(availableLiquidity, maxFacilityByAssets);

      if (Number(principalAmount) > maxPrincipal || Number(principalAmount) <= 0) {
        return res.status(400).json({ error: `Invalid principal amount. Max for your portfolio is $${Math.floor(maxPrincipal).toLocaleString()}` });
      }

      // Liquidity squeeze penalty
      const liquidityRatio = availableLiquidity / totalAssetsBank;
      if (liquidityRatio < 0.30) {
        interestRate += 0.02;
      }

      // State mandate discount
      if (company.industry_id === 'manufacturing') {
        interestRate -= 0.01;
      }

      await db('company_finances').where({ company_id: companyId }).update({
        available_cash: currentCash + principalAmount,
        debt: currentDebt + principalAmount,
      });

      let pmt = 0;
      if (amortizationType === 'balloon') {
        pmt = principalAmount * (interestRate / 12);
      } else {
        const r = interestRate / 12;
        const n = term;
        pmt = (principalAmount * r) / (1 - Math.pow(1 + r, -n));
      }

      await db('banking_active_loans').insert({
        bank_id: 'drennia-national',
        borrower_type: 'company',
        borrower_id: companyId,
        facility_type: facilityType,
        principal_amount: principalAmount,
        remaining_principal: principalAmount,
        interest_rate: interestRate,
        monthly_payment: Math.round(pmt),
        next_payment_arc: (clock?.current_month || 0) + 1,
        amortization_type: amortizationType,
        purpose: purpose,
      });

      // Ledger entry
      try {
        await db('company_ledger').insert({
          company_id: companyId,
          game_year: clock?.current_year || 0,
          game_month: clock?.current_month || 0,
          game_day: clock?.current_day || 1,
          entry_type: 'revenue',
          amount: principalAmount,
          description: `Loan Disbursement (${facilityType.toUpperCase()})`,
        });
      } catch (_ledgerErr) {
        // Non-fatal: ledger may have different column names
      }

      res.json({ message: 'Loan secured successfully.', monthlyPayment: Math.round(pmt) });

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

      const bank = await db('banking_institutions').where({ id: 'drennia-national' }).first();
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
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /banks/loan/personal/take ────────────────────────────────────────
  static async takePersonalLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityType, principalAmount } = req.body;
      const character = await getActiveCharacter(req.user!.id);
      if (!character) return res.status(404).json({ error: 'Character not found' });

      let interestRate = 0;
      const term = 60;
      const bank = await db('banking_institutions').where({ id: 'drennia-national' }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      if (facilityType === 'personal') {
        interestRate = baseRate + 0.06;
      } else {
        return res.status(400).json({ error: 'Unknown facility type.' });
      }

      const clock = await db('world_clock').first();

      // Check credit rating
      try {
        const latestRating = await db('character_credit_ratings')
          .where({ character_id: character.id })
          .orderBy('world_year', 'desc')
          .orderBy('world_month', 'desc')
          .first();
        const ratingTier = latestRating?.rating_tier || 'D';
        if (ratingTier === 'D' || ratingTier === 'CCC') {
          return res.status(400).json({ error: 'Credit rating too low for personal loan.' });
        }
      } catch (_ratingErr) {
        // Non-fatal: if table doesn't exist, skip the rating check
      }

      const finances = await db('character_finances').where({ character_id: character.id }).first();
      const currentCash = Number(finances?.cash_in_hand || 0);

      await db('character_finances').where({ character_id: character.id }).update({
        cash_in_hand: currentCash + principalAmount,
      });

      const r = interestRate / 12;
      const n = term;
      const pmt = (principalAmount * r) / (1 - Math.pow(1 + r, -n));

      await db('character_debt_facilities').insert({
        id: randomUUID(),
        character_id: character.id,
        bank_id: 'drennia_national',
        facility_type: facilityType,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        term_months: term,
        months_remaining: term,
        monthly_payment: Math.round(pmt),
        status: 'active',
      });

      res.json({ message: 'Personal loan secured successfully.', monthlyPayment: Math.round(pmt) });
    } catch (error) {
      next(error);
    }
  }
}
