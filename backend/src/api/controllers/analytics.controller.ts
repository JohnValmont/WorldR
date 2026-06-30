import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AppError } from '../../utils/errors';
import { verifyManufacturingCompany } from './manufacturing.controller';
import { db } from '../../config/database';

export class AnalyticsController {
  // GET /companies/:companyId/manufacturing/analytics
  public static async getSelfAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;

      if (!userId || !companyId) {
        return next(new AppError('Missing or invalid fields: userId, companyId', 400, 'BAD_REQUEST'));
      }

      // Verify ownership using the existing helper method from manufacturing.controller
      // We pass db instead of a transaction since this is a read-only request
      await verifyManufacturingCompany(db, userId, companyId);

      const analytics = await AnalyticsService.getSelfAnalytics(companyId);

      res.status(200).json({ status: 'success', data: analytics });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /market/structure/:countryId/last-arc
  public static async getMarketStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { countryId } = req.params;

      if (!countryId) {
        return next(new AppError('Missing field: countryId', 400, 'BAD_REQUEST'));
      }

      const analytics = await AnalyticsService.getMarketStructure(countryId);

      res.status(200).json({ status: 'success', data: analytics });
    } catch (error: any) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/research
  public static async purchaseMarketResearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { regionMarketId, tier } = req.body;

      if (!userId || !companyId || !regionMarketId || !tier) {
        return next(new AppError('Missing required fields', 400, 'BAD_REQUEST'));
      }

      await verifyManufacturingCompany(db, userId, companyId);

      // A simple 400 response for insufficient funds logic using AppError 
      // but AnalyticsService throws standard Errors, which our error handler will catch 
      // (though ideally we map it to 400, but catching error handles it).
      try {
        const data = await AnalyticsService.purchaseMarketResearch(companyId, regionMarketId, tier);
        res.status(200).json({ status: 'success', data });
      } catch (err: any) {
        if (err.message.includes('Insufficient funds')) {
           return next(new AppError(err.message, 400, 'BAD_REQUEST'));
        }
        throw err;
      }
    } catch (error: any) {
      next(error);
    }
  }
}
