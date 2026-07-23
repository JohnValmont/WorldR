import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { randomUUID } from 'crypto';

export class BankController {
  
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
      
      if (company.industry_id === 'manufacturing') {
        // Evaluate trust from awareness
        const brandStats = await db('manufacturing_brand_awareness').where({ company_id: companyId });
        trustScore = brandStats.reduce((sum, b) => sum + Number(b.trust), 0) / (brandStats.length || 1);
        
        const eng = await db('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
        if (eng) {
          engineeringRep = (Number(eng.reliability_rep) + Number(eng.mfg_efficiency_rep)) / 2;
        }
      }

      // Base Risk Score (0-100)
      let riskScore = 50; 
      if (cash > 500000) riskScore += 10;
      if (cash < 0) riskScore -= 20;
      if (bookValue > 1000000) riskScore += 10;
      
      riskScore += (reputationScore / 10);
      riskScore += (trustScore / 10);
      riskScore += (engineeringRep / 10);
      
      // Clamp
      riskScore = Math.max(0, Math.min(100, riskScore));
      
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

      const macro = await db('bank_macro_rates').orderBy('created_at', 'desc').first();
      const baseRate = macro ? Number(macro.base_rate) : 0.05;

      const dossier = {
        ratingTier,
        riskScore,
        metrics: {
          character: reputationScore,
          capacity: cash,
          capital: bookValue,
          collateral: bookValue * 0.5,
          conditions: 'Stable'
        },
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
      const { facilityType, principalAmount } = req.body; // e.g. 'growth', 250000
      
      const company = await db('companies').where({ id: companyId }).first();
      if (!company) return res.status(404).json({ error: 'Company not found' });
      
      if (company.owner_character_id !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Check if they already have an active loan of this type
      const existingLoan = await db('company_debt_facilities')
        .where({ company_id: companyId, facility_type: facilityType, status: 'active' })
        .first();
      if (existingLoan) {
        return res.status(400).json({ error: 'You already have an active facility of this type.' });
      }

      const clock = await db('world_clock').first();
      const ratingInfo = await db('company_credit_ratings')
        .where({ company_id: companyId, world_year: clock.year, world_month: clock.month })
        .first();
        
      const tier = ratingInfo?.rating_tier || 'D';
      
      const macro = await db('bank_macro_rates').orderBy('created_at', 'desc').first();
      const baseRate = macro ? Number(macro.base_rate) : 0.05;
      
      let interestRate = baseRate + 0.05;
      let term = 36;
      let covMinCash = 0;
      let divBlock = false;
      let validatedPrincipal = 0;

      if (facilityType === 'tla') {
        if (tier === 'D' || tier === 'CCC') return res.status(400).json({ error: 'Credit rating too low for Senior Term Loan.' });
        interestRate = baseRate + 0.04;
        term = 36;
        covMinCash = 100000;
        divBlock = true;
        validatedPrincipal = 250000;
      } else if (facilityType === 'growth') {
        if (Number(company.reputation) < 50) return res.status(400).json({ error: 'Reputation too low for Growth Capital.' });
        interestRate = baseRate + 0.07;
        term = 24; 
        validatedPrincipal = 100000;
      } else if (facilityType === 'distressed') {
        const financesForCheck = await db('company_finances').where({ company_id: companyId }).first();
        if (Number(financesForCheck?.available_cash) >= 0 && tier !== 'D' && tier !== 'CCC') {
          return res.status(400).json({ error: 'Company is not distressed enough for a bailout.' });
        }
        interestRate = 0.22; // 22% fixed
        term = 12;
        divBlock = true;
        validatedPrincipal = 50000;
      } else {
        return res.status(400).json({ error: 'Invalid facility type.' });
      }

      if (Number(principalAmount) !== validatedPrincipal) {
        return res.status(400).json({ error: 'Invalid principal amount requested for this facility.' });
      }

      // Update finances correctly (increase cash and debt)
      const finances = await db('company_finances').where({ company_id: companyId }).first();
      const currentCash = Number(finances?.available_cash || 0);
      const currentDebt = Number(finances?.debt || 0);
      const currentVal = Number(finances?.company_value || 0);
      
      await db('company_finances').where({ company_id: companyId }).update({
         available_cash: currentCash + principalAmount,
         debt: currentDebt + principalAmount
      });
      
      // Calculate monthly payment (amortization)
      // Standard PMT formula: P * (r / n) / (1 - (1 + r/n)^-n)
      const r = interestRate / 12;
      const n = term;
      const pmt = (principalAmount * r) / (1 - Math.pow(1 + r, -n));

      await db('company_debt_facilities').insert({
        id: randomUUID(),
        company_id: companyId,
        bank_id: 'drennia_national',
        facility_type: facilityType,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        term_months: term,
        months_remaining: term,
        monthly_payment: Math.round(pmt),
        status: 'active',
        cov_min_cash: covMinCash,
        cov_dividend_block: divBlock
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

}
