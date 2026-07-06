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

      // We assume one active character per user per world instance (pre-alpha-world-1 for now)
      const character = await db('characters')
        .where({ user_id: userId, status: 'active' })
        .first();

      if (!character) {
        return res.status(404).json({ message: 'No active character found' });
      }

      const finances = await db('character_finances')
        .where({ character_id: character.id })
        .first();

      res.status(200).json({
        ...character,
        finances
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

      // Check if character already exists for this user
      const existing = await db('characters')
        .where({ user_id: userId, world_instance_id: 'pre-alpha-world-1' })
        .whereNot('status', 'deleted')
        .first();

      if (existing) {
        return next(new AppError('Character already exists', 400, 'CHARACTER_EXISTS'));
      }

      // Get world clock for created_at_world_*
      const clock = await db('world_clock').where({ status: 'active' }).first();
      if (!clock) {
        return next(new AppError('World clock not active', 500, 'INTERNAL_ERROR'));
      }

      const result = await db.transaction(async (trx) => {
        const [character] = await trx('characters').insert({
          world_instance_id: 'pre-alpha-world-1',
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
    } catch (error) {
      next(error);
    }
  }

  public static async deleteMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const character = await db('characters')
        .where({ user_id: userId, status: 'active' })
        .first();

      if (character) {
        await db('characters')
          .where({ id: character.id })
          .update({ status: 'deleted' });
      }

      res.status(200).json({ message: 'Character deleted' });
    } catch (error) {
      next(error);
    }
  }
}
