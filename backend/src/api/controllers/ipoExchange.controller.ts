import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import * as ipo from '../services/ipoExchange.service';
import * as distressed from '../services/distressedMarket.service';
import * as auction from '../services/acquisitionAuction.service';

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

  // GET /exchange/distressed — all companies in financial distress available for acquisition
  public static async distressed(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await distressed.getDistressedCompanies());
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/distressed/:companyId/acquire — player acquires a distressed company
  public static async acquire(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { acquiringCompanyId } = req.body;
      res.status(200).json(await distressed.acquireDistressedCompany({
        targetCompanyId: req.params.companyId,
        characterId: character.id,
        acquiringCompanyId,
      }));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/acquisitions — all active auctions (registration + bidding)
  public static async getAuctions(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await auction.getActiveAuctions());
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/acquisitions/my-bids — bids placed by the current character
  public static async getMyBids(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await auction.getMyBids(character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/acquisitions/:auctionId/bid  { amount }
  public static async placeBid(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const amount = Number(req.body.amount);
      if (!amount || amount <= 0) throw new AppError('Invalid bid amount.', 400, 'INVALID_AMOUNT');
      res.status(200).json(await auction.placeBid({
        auctionId:   req.params.auctionId,
        characterId: character.id,
        amount,
      }));
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/admin/retroactive-ipo-fix
  public static async retroactiveFix(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { companyId } = req.body;
      if (!companyId) throw new AppError('Missing companyId', 400, 'BAD_REQUEST');
      
      await db.transaction(async (trx: any) => {
        const company = await trx('companies').where({ id: companyId }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
        
        const listing = await trx('ipo_listings').where({ company_id: company.id, status: 'listed' }).first();
        if (!listing) throw new AppError('No listed IPO found for this company.', 404, 'NOT_FOUND');
        
        if (listing.use_of_proceeds === 'RETROACTIVELY_FIXED') {
            throw new AppError('This IPO has already been retroactively fixed.', 400, 'ALREADY_FIXED');
        }
        
        const proceeds = Number(listing.proceeds_raised || 0);
        const clearingPrice = Number(listing.clearing_price || 0);
        const founderId = company.owner_character_id;
        
        // Exact number of shares sold to the public (works even if undersubscribed)
        const soldShares = (clearingPrice > 0) ? Math.round(proceeds / clearingPrice) : 0;
        
        if (soldShares > 0 && founderId) {
          const founderHolding = await trx('company_shares').where({ company_id: company.id, holder_character_id: founderId }).first();
          if (founderHolding) {
            await trx('company_shares')
              .where({ company_id: company.id, holder_character_id: founderId })
              .increment('shares', soldShares);
          } else {
            await trx('company_shares').insert({
              company_id: company.id,
              holder_character_id: founderId,
              shares: soldShares,
              avg_cost_basis: 1,
            });
          }
        }
          
        if (proceeds > 0 && founderId) {
          const charFinances = await trx('character_finances').where({ character_id: founderId }).first();
          const availableToDisgorge = Math.max(0, Math.min(proceeds, Number(charFinances?.cash_in_hand ?? 0)));
          
          if (availableToDisgorge > 0) {
            await trx('character_finances')
              .where({ character_id: founderId })
              .decrement('cash_in_hand', availableToDisgorge);
              
            await trx('company_finances')
              .where({ company_id: company.id })
              .increment('available_cash', availableToDisgorge);
          }
        }
          
        await trx('ipo_listings').where({ id: listing.id }).update({ use_of_proceeds: 'RETROACTIVELY_FIXED' });
      });
      
      res.status(200).json({ success: true, message: 'IPO successfully converted to a Primary Offering!' });
    } catch (error) {
      next(error);
    }
  }
}
