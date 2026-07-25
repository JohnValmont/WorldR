import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import * as ipo from '../services/ipoExchange.service';

async function requireCharacter(req: Request): Promise<any> {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
  if (!character) throw new AppError('Active character required', 400, 'NO_CHARACTER');
  return character;
}

export class IpoExchangeController {
  // GET /exchange/ipo/pipeline — all in-flight IPOs (review + book-building)
  public static async pipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await ipo.getPipeline(character.id));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/ipo/index — the DRX market index
  public static async index(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await ipo.getDrxIndex());
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/company/:companyId — full quote detail
  public static async companyDetail(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await ipo.getCompanyDetail(req.params.companyId));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/company/:companyId/ohlc?months=24
  public static async ohlc(req: Request, res: Response, next: NextFunction) {
    try {
      const months = Math.min(120, Math.max(1, Number(req.query.months) || 24));
      res.status(200).json(await ipo.getOhlc(req.params.companyId, months));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/company/:companyId/earnings
  public static async earnings(req: Request, res: Response, next: NextFunction) {
    try {
      const months = Math.min(60, Math.max(1, Number(req.query.months) || 12));
      res.status(200).json(await ipo.getEarnings(req.params.companyId, months));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/ipo/:companyId/eligibility — founder-only pre-flight check
  public static async eligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await ipo.getEligibility(req.params.companyId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/ipo/:companyId — latest IPO record for a company
  public static async companyIpo(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await ipo.getCompanyIpo(req.params.companyId));
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/ipo/:companyId/file
  public static async file(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { priceMin, priceMax, floatPercent, useOfProceeds, lockupMonths } = req.body;
      const listing = await ipo.fileIpo({
        companyId: req.params.companyId,
        characterId: character.id,
        priceMin: Number(priceMin),
        priceMax: Number(priceMax),
        floatPercent: Number(floatPercent),
        useOfProceeds: String(useOfProceeds ?? ''),
        lockupMonths: Number(lockupMonths),
      });
      res.status(201).json(listing);
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/ipo/:companyId/withdraw
  public static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await ipo.withdrawIpo(req.params.companyId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/ipo/:ipoId/ioi  { pricePerShare, quantity }
  public static async submitIoi(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { pricePerShare, quantity, biddingCompanyId } = req.body;
      const ioi = await ipo.submitIoi({
        ipoId: req.params.ipoId,
        characterId: character.id,
        biddingCompanyId,
        pricePerShare: Number(pricePerShare),
        quantity: Number(quantity),
      });
      res.status(201).json(ioi);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /exchange/ipo/ioi/:ioiId
  public static async cancelIoi(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await ipo.cancelIoi(req.params.ioiId, character.id));
    } catch (error) {
      next(error);
    }
  }
}
