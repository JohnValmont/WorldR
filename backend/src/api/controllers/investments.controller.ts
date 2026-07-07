import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import * as investments from '../services/investments.service';

async function requireCharacter(req: Request): Promise<any> {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
  if (!character) throw new AppError('Active character required', 400, 'NO_CHARACTER');
  return character;
}

export class InvestmentsController {
  // ===== Loans =====

  // GET /investments/loan-offers — open offers visible to me
  public static async loanOffers(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.getOpenLoanOffers(character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /investments/loan-offers  { max_amount, monthly_interest_rate, term_months, purpose?, target_character_id? }
  public static async createLoanOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { max_amount, monthly_interest_rate, term_months, purpose, target_character_id } = req.body;
      const offer = await investments.createLoanOffer({
        lenderCharacterId: character.id,
        maxAmount: Number(max_amount),
        monthlyInterestRate: Number(monthly_interest_rate),
        termMonths: Number(term_months),
        purpose,
        targetCharacterId: target_character_id,
      });
      res.status(201).json(offer);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /investments/loan-offers/:offerId
  public static async cancelLoanOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.cancelLoanOffer(req.params.offerId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /investments/loan-offers/:offerId/accept  { amount }
  public static async acceptLoanOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const loan = await investments.acceptLoanOffer(req.params.offerId, character.id, Number(req.body.amount));
      res.status(201).json(loan);
    } catch (error) {
      next(error);
    }
  }

  // POST /investments/loans/:loanId/repay — early payoff
  public static async repayLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.repayLoanEarly(req.params.loanId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // GET /investments/my-loans
  public static async myLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.getMyLoans(character.id));
    } catch (error) {
      next(error);
    }
  }

  // ===== Private equity placements =====

  // GET /investments/placements — open placements visible to me
  public static async placements(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.getOpenPlacements(character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /investments/placements  { company_id, shares, price_per_share, target_character_id? }
  public static async createPlacement(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { company_id, shares, price_per_share, target_character_id } = req.body;
      const placement = await investments.createPlacement({
        companyId: company_id,
        sellerCharacterId: character.id,
        shares: Number(shares),
        pricePerShare: Number(price_per_share),
        targetCharacterId: target_character_id,
      });
      res.status(201).json(placement);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /investments/placements/:placementId
  public static async cancelPlacement(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.cancelPlacement(req.params.placementId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /investments/placements/:placementId/accept
  public static async acceptPlacement(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.acceptPlacement(req.params.placementId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // GET /investments/my-placements — all placements the caller has posted (any status)
  public static async myPlacements(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await investments.getMyPlacements(character.id));
    } catch (error) {
      next(error);
    }
  }
}
