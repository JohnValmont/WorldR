import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import * as market from '../services/shareMarket.service';

async function requireCharacter(req: Request): Promise<any> {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
  if (!character) throw new AppError('Active character required', 400, 'NO_CHARACTER');
  return character;
}

export class ShareMarketController {
  // GET /exchange/listings — all public player companies
  public static async listings(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await market.getListings());
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/:companyId/book
  public static async orderBook(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await market.getOrderBook(req.params.companyId));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/:companyId/trades
  public static async trades(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await market.getTradeHistory(req.params.companyId));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/:companyId/history — monthly price summary
  public static async priceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await market.getPriceHistory(req.params.companyId));
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/:companyId/orders  { side, price, quantity }
  public static async placeOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { side, price, quantity, purchaserCompanyId } = req.body;
      if (side !== 'buy' && side !== 'sell') return next(new AppError('side must be buy or sell', 400, 'BAD_REQUEST'));

      const result = await market.placeOrder({
        companyId: req.params.companyId,
        characterId: character.id,
        purchaserCompanyId,
        side,
        price: Number(price),
        quantity: Number(quantity),
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /exchange/orders/:orderId
  public static async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await market.cancelOrder(req.params.orderId, character.id));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/portfolio — my holdings across all companies
  public static async portfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await market.getPortfolio(character.id));
    } catch (error) {
      next(error);
    }
  }

  // GET /exchange/my-orders
  public static async myOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      res.status(200).json(await market.getMyOrders(character.id));
    } catch (error) {
      next(error);
    }
  }

  // POST /exchange/:companyId/ipo  { price_per_share, quantity }
  // Owner-only. Posts an initial sell block at the chosen price.
  public static async ipoLaunch(req: Request, res: Response, next: NextFunction) {
    try {
      const character = await requireCharacter(req);
      const { price_per_share, quantity } = req.body;

      if (!price_per_share || !quantity) {
        return next(new AppError('price_per_share and quantity are required', 400, 'BAD_REQUEST'));
      }

      const result = await market.ipoLaunch({
        companyId: req.params.companyId,
        characterId: character.id,
        pricePerShare: Number(price_per_share),
        quantity: Number(quantity),
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
  // POST /exchange/admin/backfill-npc-shares (admin only)
  // Seeds missing company_shares rows for every active, exchange-listed NPC company
  // so the cap-table denominator is correct and pie-chart percentages add to 100%.
  public static async backfillNpcShares(req: Request, res: Response, next: NextFunction) {
    try {
      const TOTAL_SHARES = market.TOTAL_SHARES;
      const npcCompanies = await db('companies')
        .where({ is_npc: true, status: 'active', is_exchange_listed: true })
        .select('id', 'name', 'owner_character_id');

      const results: any[] = [];

      for (const co of npcCompanies) {
        // Sum player-held shares (everything NOT by the owner character)
        const allSumRow = await db('company_shares').where({ company_id: co.id }).sum('shares as total').first();
        const currentTotal = Number(allSumRow?.total ?? 0);

        // Check if System NPC already has a row
        const npcRow = await db('company_shares')
          .where({ company_id: co.id, holder_character_id: co.owner_character_id })
          .first();

        const playerHeld = currentTotal - (npcRow ? Number(npcRow.shares) : 0);
        const correctNpcShares = Math.max(0, TOTAL_SHARES - playerHeld);

        if (!npcRow) {
          await db('company_shares').insert({
            company_id: co.id,
            holder_character_id: co.owner_character_id,
            shares: correctNpcShares,
            avg_cost_basis: 0,
          });
          results.push({ company: co.name, action: 'inserted', npc_shares: correctNpcShares, player_held: playerHeld });
        } else if (Number(npcRow.shares) !== correctNpcShares) {
          await db('company_shares')
            .where({ company_id: co.id, holder_character_id: co.owner_character_id })
            .update({ shares: correctNpcShares, updated_at: new Date() });
          results.push({ company: co.name, action: 'corrected', npc_shares_before: Number(npcRow.shares), npc_shares_after: correctNpcShares, player_held: playerHeld });
        } else {
          results.push({ company: co.name, action: 'ok', npc_shares: Number(npcRow.shares), player_held: playerHeld });
        }
      }

      res.status(200).json({ fixed: results.length, results });
    } catch (error) {
      next(error);
    }
  }
}
