import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';

export class BankController {

  static async getInstitutionData(req: Request, res: Response, next: NextFunction) {
    try {
      const { bankId } = req.params;
      const bank = await db('banking_institutions').where({ id: bankId }).first();
      if (!bank) return res.status(404).json({ error: 'Bank not found' });
      
      // Calculate lendable liquidity
      const deposits = Number(bank.total_deposits);
      const treasury = Number(bank.base_treasury_injection);
      const rr = Number(bank.reserve_requirement_ratio);
      
      const totalAssets = deposits + treasury;
      const reserveRequired = totalAssets * rr;
      
      // We also need to subtract active loans they've already given out.
      // For now, let's just query total active loans.
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
        baseLendingRate: Number(bank.base_lending_rate)
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getCreditDossier(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      
      const company = await db('companies').where({ id: companyId }).first();
      if (!company) return res.status(404).json({ error: 'Company not found' });
      if (company.owner_character_id !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Fetch financial details
      const finances = await db('company_finances').where({ company_id: companyId }).first();
      const cash = Number(finances?.available_cash || 0);
      const bookValue = Number(finances?.company_value || 0);
      
      // Fetch operational / brand details
      let reputationScore = Number(company.reputation || 0);
      let trustScore = 0;
      let engineeringRep = 0;
      
      const activeLoans = await db('banking_active_loans').where({ borrower_id: companyId, status: 'ACTIVE' });
      const totalLiabilities = activeLoans.reduce((sum, l) => sum + Number(l.remaining_principal), 0);
      const totalAssets = cash + bookValue;
      const equity = totalAssets - totalLiabilities;

      // Mock Net Income for DSCR (in reality, query ledger)
      const mockNetIncome = totalAssets * 0.15; 
      const annualDebtService = activeLoans.reduce((sum, l) => sum + (Number(l.monthly_payment) * 12), 0) || 1;
      const dscr = mockNetIncome / annualDebtService;
      const ltv = totalLiabilities / (totalAssets || 1);
      
      if (company.industry_id === 'manufacturing') {
        // Evaluate trust from awareness
        const brandStats = await db('manufacturing_brand_awareness').where({ company_id: companyId });
        trustScore = brandStats.reduce((sum, b) => sum + Number(b.trust), 0) / (brandStats.length || 1);
        
        const eng = await db('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
        if (eng) {
          engineeringRep = (Number(eng.reliability_rep) + Number(eng.mfg_efficiency_rep)) / 2;
        }
      }

      // Sovereign Score (0-100) based on existing portfolio
      const ltvScore = ltv < 0.2 ? 95 : ltv < 0.5 ? 85 : ltv < 0.8 ? 70 : 40;
      const dscrScore = annualDebtService === 0 ? 100 : (dscr > 2.0 ? 90 : dscr > 1.25 ? 75 : 50);
      const liqScore = cash > 1000000 ? 90 : cash > 100000 ? 70 : 40;
      const marginScore = 88; // Placeholder for margin trend
      const industryScore = 80; // Placeholder for industry risk
      
      let riskScore = (ltvScore * 0.3) + (dscrScore * 0.25) + (liqScore * 0.2) + (marginScore * 0.15) + (industryScore * 0.10);
      
      // Clamp
      riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
      
      let ratingTier = 'D';
      if (riskScore >= 80) ratingTier = 'AAA';
      else if (riskScore >= 60) ratingTier = 'BBB';
      else if (riskScore >= 40) ratingTier = 'B';
      else if (riskScore >= 20) ratingTier = 'CCC';

      // Save rating for history
      const clock = await db('world_clock').first();
      if (clock) {
        await db('company_credit_ratings').insert({
          company_id: companyId,
          world_year: clock.year,
          world_month: clock.month,
          rating_tier: ratingTier,
          risk_score: riskScore
        }).onConflict(['company_id', 'world_year', 'world_month']).merge();
      }

      const bank = await db('banking_institutions').where({ id: 'drennia-national' }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      const dossier = {
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
          ltv
        },
        activeLoans,
        baseRate
      };

      res.json(dossier);
    } catch (error) {
      next(error);
    }
  }

  static async takeLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      const { facilityType, principalAmount, term = 36, amortizationType = 'amortizing', purpose = 'general' } = req.body;
      
      const company = await db('companies').where({ id: companyId }).first();
      if (!company) return res.status(404).json({ error: 'Company not found' });
      
      if (company.owner_character_id !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Check if they already have an active loan of this type
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

      // 5-C Underwriting
      const activeCompanyLoans = await db('banking_active_loans').where({ borrower_id: companyId, status: 'ACTIVE' });
      const currentLiabilities = activeCompanyLoans.reduce((sum, l) => sum + Number(l.remaining_principal), 0);
      
      const finances = await db('company_finances').where({ company_id: companyId }).first();
      const currentCash = Number(finances?.available_cash || 0);
      const currentDebt = Number(finances?.debt || 0);
      const currentVal = Number(finances?.company_value || 0);
      const totalAssets = currentCash + currentVal;

      const newTotalLiabilities = currentLiabilities + principalAmount;
      const ltv = newTotalLiabilities / (totalAssets || 1);

      if (ltv > 1.0) {
        return res.status(400).json({ error: 'Loan denied: Post-deal LTV exceeds 100%. Collateral insufficient.' });
      }

      const mockNetIncome = totalAssets * 0.15;
      const annualDebtService = activeCompanyLoans.reduce((sum, l) => sum + (Number(l.monthly_payment) * 12), 0) + (principalAmount * 0.10); // estimate
      const dscr = mockNetIncome / annualDebtService;

      if (dscr < 1.0) {
        return res.status(400).json({ error: 'Loan denied: DSCR below 1.0x. Cash flow insufficient.' });
      }
      
      // Calculate exact score for premium
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
      
      // Calculate max facility
      const portfolioEquity = totalAssets - currentLiabilities;
      const maxFacilityByAssets = (portfolioEquity * 0.6) + (totalAssets * 0.8);
      let maxPrincipal = Math.min(availableLiquidity, maxFacilityByAssets);

      if (Number(principalAmount) > maxPrincipal || Number(principalAmount) <= 0) {
        return res.status(400).json({ error: `Invalid principal amount. Max for your portfolio is $${Math.floor(maxPrincipal).toLocaleString()}` });
      }

      // Liquidity Squeeze Rule
      const liquidityRatio = availableLiquidity / totalAssetsBank;
      if (liquidityRatio < 0.30) {
        interestRate += 0.02; // +200 bps penalty if bank is running out of money
      }

      // State Mandate Rule
      if (company.industry_id === 'manufacturing') {
        interestRate -= 0.01; // -100 bps discount for job creators
      }

      await db('company_finances').where({ company_id: companyId }).update({
         available_cash: currentCash + principalAmount,
         debt: currentDebt + principalAmount
      });
      
      let pmt = 0;
      if (amortizationType === 'balloon') {
        // Interest only
        pmt = principalAmount * (interestRate / 12);
      } else {
        // Standard Amortizing
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
        next_payment_arc: clock.arc + 1,
        amortization_type: amortizationType,
        purpose: purpose
      });

      // Ledger entry
      await db('company_ledger').insert({
        company_id: companyId,
        game_year: clock.year,
        game_month: clock.month,
        game_day: clock.day || 1,
        entry_type: 'revenue',
        amount: principalAmount,
        description: `Loan Disbursement (${facilityType.toUpperCase()})`
      });

      res.json({ message: 'Loan secured successfully.', monthlyPayment: Math.round(pmt) });

    } catch (error) {
      next(error);
    }
  }

  static async getPersonalCreditDossier(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) return res.status(404).json({ error: 'No active world' });
      const character = await db('characters').where({ user_id: req.user!.id, status: 'active', world_instance_id: activeInstance.id }).first();
      if (!character) return res.status(404).json({ error: 'Character not found' });
      
      const finances = await db('character_finances').where({ character_id: character.id }).first();
      const cash = Number(finances?.cash_in_hand || 0);
      const netWorth = Number(finances?.net_worth || 0);

      let riskScore = 50; 
      if (cash > 100000) riskScore += 10;
      if (cash < 0) riskScore -= 20;
      if (netWorth > 500000) riskScore += 15;
      riskScore = Math.max(0, Math.min(100, riskScore));

      let ratingTier = 'D';
      if (riskScore >= 80) ratingTier = 'AAA';
      else if (riskScore >= 60) ratingTier = 'BBB';
      else if (riskScore >= 40) ratingTier = 'B';
      else if (riskScore >= 20) ratingTier = 'CCC';

      const clock = await db('world_clock').first();
      if (clock) {
        await db('character_credit_ratings').insert({
          character_id: character.id,
          world_year: clock.year,
          world_month: clock.month,
          rating_tier: ratingTier,
          risk_score: riskScore
        }).onConflict(['character_id', 'world_year', 'world_month']).merge();
      }

      const bank = await db('banking_institutions').where({ id: 'drennia-national' }).first();
      const baseRate = bank ? Number(bank.base_lending_rate) : 0.05;

      res.json({
        ratingTier,
        riskScore,
        metrics: {
          character: 70, // Arbitrary base for personal
          capacity: cash,
          capital: netWorth,
          collateral: netWorth * 0.3,
          conditions: 'Stable'
        },
        baseRate
      });
    } catch (error) {
      next(error);
    }
  }

  static async takePersonalLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { facilityType, principalAmount } = req.body;
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      const character = await db('characters').where({ user_id: req.user!.id, status: 'active', world_instance_id: activeInstance.id }).first();
      if (!character) return res.status(404).json({ error: 'Character not found' });

      let interestRate = 0;
      let term = 60; // default 5 years
      const macro = await db('bank_macro_rates').orderBy('created_at', 'desc').first();
      const baseRate = macro ? Number(macro.base_rate) : 0.05;

      if (facilityType === 'personal') {
        interestRate = baseRate + 0.06;
      } else {
        return res.status(400).json({ error: 'Unknown facility type.' });
      }

      const clock = await db('world_clock').first();
      const latestRating = await db('character_credit_ratings').where({ character_id: character.id }).orderBy('world_year', 'desc').orderBy('world_month', 'desc').first();
      const ratingTier = latestRating?.rating_tier || 'D';
      
      if (ratingTier === 'D' || ratingTier === 'CCC') {
        return res.status(400).json({ error: 'Credit rating too low for personal loan.' });
      }

      const finances = await db('character_finances').where({ character_id: character.id }).first();
      const currentCash = Number(finances?.cash_in_hand || 0);
      
      await db('character_finances').where({ character_id: character.id }).update({
         cash_in_hand: currentCash + principalAmount
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
        status: 'active'
      });

      res.json({ message: 'Personal loan secured successfully.', monthlyPayment: Math.round(pmt) });
    } catch (error) {
      next(error);
    }
  }

}
