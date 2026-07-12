import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

export class CharacterController {
  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return res.status(404).json({ message: 'No active world instance found' });
      }

      // We assume one active character per user per world instance
      const character = await db('characters')
        .where({ user_id: userId, status: 'active', world_instance_id: activeInstance.id })
        .first();

      if (!character) {
        return res.status(404).json({ message: 'No active character found' });
      }

      const finances = await db('character_finances')
        .where({ character_id: character.id })
        .first();

      // Add cash locked in open BUY orders
      const buyEscrow = await db('share_orders')
        .where({ character_id: character.id, status: 'open', side: 'buy' })
        .sum('escrow_amount as total_escrow')
        .first();

      let trueNetWorth = Number(finances?.cash_in_hand || 0) + Number(buyEscrow?.total_escrow || 0);

      // Dynamically calculate equity value
      const equityValues = await db('company_shares as cs')
        .join('companies as c', 'c.id', 'cs.company_id')
        .join('company_finances as cf', 'cf.company_id', 'c.id')
        .where({ 'cs.holder_character_id': character.id, 'c.status': 'active' })
        .select(
          'cs.shares',
          'cf.company_value',
          db.raw(`(SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id) + COALESCE((SELECT SUM(quantity) FROM share_orders WHERE company_id = cs.company_id AND side = 'sell' AND status = 'open'), 0) as total_shares`),
          db.raw(`COALESCE((SELECT SUM(quantity) FROM share_orders WHERE company_id = cs.company_id AND character_id = cs.holder_character_id AND side = 'sell' AND status = 'open'), 0) as escrowed_shares`)
        );

      for (const row of equityValues) {
        const total = Number(row.total_shares || 0);
        const myShares = Number(row.shares) + Number(row.escrowed_shares || 0);
        if (total > 0) {
          trueNetWorth += (myShares / total) * Number(row.company_value);
        }
      }

      if (finances) {
        finances.net_worth = trueNetWorth;
      }

      let netWorthHistory: any[] = [];
      try {
        const history = await db('character_net_worth_history')
          .where({ character_id: character.id })
          .orderBy('world_year', 'desc')
          .orderBy('world_month', 'desc')
          .limit(12);
        netWorthHistory = history.reverse();
      } catch (err) {
        // Ignore if table doesn't exist yet
      }

      res.status(200).json({
        ...character,
        finances,
        netWorthHistory
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createCharacter(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const { name, motherland_country_id, home_state_id, currency_id } = req.body;

      if (!name || !motherland_country_id || !currency_id) {
        return next(new AppError('Missing required fields', 400, 'BAD_REQUEST'));
      }

      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));
      }

      // Check if character already exists for this user
      const existing = await db('characters')
        .where({ user_id: userId, world_instance_id: activeInstance.id })
        .whereNot('status', 'deleted')
        .first();

      if (existing) {
        return next(new AppError('Character already exists', 400, 'CHARACTER_EXISTS'));
      }

      // Get world clock for created_at_world_*
      const clock = await db('world_clock').where({ status: 'active', world_instance_id: activeInstance.id }).first();
      if (!clock) {
        return next(new AppError('World clock not active', 500, 'INTERNAL_ERROR'));
      }

      const result = await db.transaction(async (trx) => {
        const [character] = await trx('characters').insert({
          world_instance_id: activeInstance.id,
          user_id: userId,
          motherland_country_id,
          home_state_id: home_state_id || null,
          name,
          age: 18,
          credibility: 50,
          charisma: 50,
          influence: 10,
          status: 'active',
          created_at_world_year: clock.current_year,
          created_at_world_month: clock.current_month,
          created_at_world_day: clock.current_day
        }).returning('*');

        const [finances] = await trx('character_finances').insert({
          character_id: character.id,
          currency_id,
          cash_in_hand: 1000000,
          net_worth: 1000000
        }).returning('*');

        return { ...character, finances };
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'unique_character_per_user_world') {
        return next(new AppError('You already have an active character in this world. Please delete it before creating a new one.', 400, 'CHARACTER_EXISTS'));
      }
      next(error);
    }
  }

  public static async deleteMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return res.status(404).json({ message: 'No active world instance found' });
      }

      const character = await db('characters')
        .where({ user_id: userId, status: 'active', world_instance_id: activeInstance.id })
        .first();

      if (character) {
        const timestamp = Date.now();
        const deletedSuffix = ` [DELETED ${timestamp}]`;

        await db.transaction(async (trx) => {
          await trx('characters')
            .where({ id: character.id })
            .update({ 
              status: 'deleted',
              name: `${character.name.substring(0, 50)}${deletedSuffix}`
            });

          const companies = await trx('companies').where({ owner_character_id: character.id });
          for (const company of companies) {
            await trx('companies')
              .where({ id: company.id })
              .update({ 
                status: 'bankrupt',
                name: `${company.name.substring(0, 50)}${deletedSuffix}`
              });
          }
        });
      }

      res.status(200).json({ message: 'Character deleted' });
    } catch (error) {
      next(error);
    }
  }
}
