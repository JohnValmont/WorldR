import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

export class WorldController {
  public static async getClock(req: Request, res: Response, next: NextFunction) {
    try {
      const clock = await db('world_clock')
        .where({ status: 'active' })
        .first();

      if (!clock) {
        return next(new AppError('No active world clock found', 404, 'CLOCK_NOT_FOUND'));
      }

      res.status(200).json(clock);
    } catch (error) {
      next(error);
    }
  }

  public static async getBootstrap(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));
      }

      const instanceId = activeInstance.id;

      const countries = await db('countries').where({ world_instance_id: instanceId, status: 'active' });
      const currencies = await db('currencies');
      const states = await db('states').whereIn('country_id', countries.map(c => c.id)).andWhere({ status: 'active' });
      const industries = await db('industries').where({ status: 'active' });
      const legal_structures = await db('legal_structures').where({ status: 'active' });

      res.status(200).json({
        instance: activeInstance,
        countries,
        currencies,
        states,
        industries,
        legal_structures
      });
    } catch (error) {
      next(error);
    }
  }
}
