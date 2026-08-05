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
        .whereNull('purchaser_company_id')
        .sum('escrow_amount as total_escrow')
        .first();

      let trueNetWorth = Number(finances?.cash_in_hand || 0) + Number(buyEscrow?.total_escrow || 0);

      // Equity valuation rule:
      // - LISTED companies: use Market Cap (last stock price × shares owned). This correctly
      //   reflects the post-IPO world where the company treasury belongs to ALL shareholders.
      // - PRIVATE companies: use Book Value (cash – debt + inventory at cost).
      const equityValues = await db('company_shares as cs')
        .join('companies as c', 'c.id', 'cs.company_id')
        .join('company_finances as cf', 'cf.company_id', 'c.id')
        .where({ 'cs.holder_character_id': character.id, 'c.status': 'active' })
        .select(
          'cs.shares',
          'c.is_exchange_listed',
          'cs.company_id',
          'cf.available_cash',
          'cf.debt',
          db.raw(`COALESCE((SELECT SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit) FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id WHERE mi.company_id = c.id), 0) as inventory_value`),
          db.raw(`(SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id) + COALESCE((SELECT SUM(quantity) FROM share_orders WHERE company_id = cs.company_id AND side = 'sell' AND status = 'open'), 0) as total_shares`),
          db.raw(`COALESCE((SELECT SUM(quantity) FROM share_orders WHERE company_id = cs.company_id AND character_id = cs.holder_character_id AND side = 'sell' AND status = 'open'), 0) as escrowed_shares`)
        );

      for (const row of equityValues) {
        const total = Number(row.total_shares || 0);
        const myShares = Number(row.shares) + Number(row.escrowed_shares || 0);
        if (total <= 0 || myShares <= 0) continue;

        if (row.is_exchange_listed) {
          // Listed: value = last close price × my shares (market cap basis)
          const latestPriceRow = await db('share_price_history')
            .where({ company_id: row.company_id })
            .orderBy('game_year', 'desc')
            .orderBy('game_month', 'desc')
            .first('close_price');
          const lastTrade = latestPriceRow ? null : await db('share_trades')
            .where({ company_id: row.company_id })
            .orderBy('executed_at', 'desc')
            .first('price');
          const lastPrice = latestPriceRow
            ? Number(latestPriceRow.close_price)
            : lastTrade ? Number(lastTrade.price) : null;
          if (lastPrice != null && lastPrice > 0) {
            trueNetWorth += myShares * lastPrice;
          } else {
            // No price yet (just listed): fall back to book value until first trade
            const bookValue = Math.max(0, Number(row.available_cash) - Number(row.debt || 0) + Number(row.inventory_value || 0));
            trueNetWorth += (myShares / total) * bookValue;
          }
        } else {
          // Private: book value
          const bookValue = Math.max(0, Number(row.available_cash) - Number(row.debt || 0) + Number(row.inventory_value || 0));
          trueNetWorth += (myShares / total) * bookValue;
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

      const { name, motherland_country_id, home_state_id, currency_id, attributes } = req.body;

      if (!name || !motherland_country_id || !currency_id) {
        return next(new AppError('Missing required fields', 400, 'BAD_REQUEST'));
      }

      // Map frontend attributes: [Charisma, Cunning, Capital, Diplomacy, Resolve]
      // Fallback defaults to 0 (which scales to 0)
      const attrs = Array.isArray(attributes) ? attributes : [0, 0, 0, 0, 0];
      const charAttr = attrs[0] || 0;
      const cunAttr = attrs[1] || 0;
      const capAttr = attrs[2] || 0;
      const dipAttr = attrs[3] || 0;
      const resAttr = attrs[4] || 0;

      const charisma = charAttr * 10;
      const credibility = resAttr * 10;
      const influence = (cunAttr + dipAttr) * 5;
      const starting_cash = 1000000 + (capAttr * 1000000);

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
          credibility,
          charisma,
          influence,
          status: 'active',
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1
        }).returning('*');

        const [finances] = await trx('character_finances').insert({
          character_id: character.id,
          currency_id,
          cash_in_hand: starting_cash,
          net_worth: starting_cash
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
  public static async recalculateNetWorthHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) return res.status(404).json({ message: 'No active character found' });

      // Get all historical snapshots for this character
      const history = await db('character_net_worth_history')
        .where({ character_id: character.id })
        .orderBy('world_year')
        .orderBy('world_month');

      if (history.length === 0) return res.status(200).json({ updated: 0 });

      // Get all company_shares currently held by this character
      const shareRows = await db('company_shares as cs')
        .join('companies as co', 'co.id', 'cs.company_id')
        .join('company_finances as cf', 'cf.company_id', 'co.id')
        .where({ 'cs.holder_character_id': character.id, 'co.status': 'active' })
        .select(
          'cs.company_id',
          'cs.shares',
          'co.is_exchange_listed',
          'cf.available_cash',
          'cf.debt',
          db.raw(`(SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id) AS total_shares`)
        );

      let updated = 0;
      for (const snap of history) {
        let equity = 0;
        for (const sr of shareRows) {
          const myShares = Number(sr.shares);
          const totalShares = Number(sr.total_shares || 0);
          if (myShares <= 0 || totalShares <= 0) continue;

          if (sr.is_exchange_listed) {
            // Try to find the stock price at this historical point
            const priceRow = await db('share_price_history')
              .where({ company_id: sr.company_id, game_year: snap.world_year, game_month: snap.world_month })
              .first('close_price');

            // Try the previous month if no exact match (covers arc gaps)
            const fallbackPrice = !priceRow
              ? await db('share_price_history')
                  .where({ company_id: sr.company_id })
                  .where(db.raw('(game_year * 100 + game_month) <= ?', [snap.world_year * 100 + snap.world_month]))
                  .orderBy('game_year', 'desc')
                  .orderBy('game_month', 'desc')
                  .first('close_price')
              : null;

            const price = priceRow
              ? Number(priceRow.close_price)
              : fallbackPrice
              ? Number(fallbackPrice.close_price)
              : null;

            if (price != null && price > 0) {
              equity += myShares * price;
            } else {
              // No historical price yet (e.g. company listed after this snapshot)
              const bookValue = Math.max(0, Number(sr.available_cash) - Number(sr.debt || 0));
              equity += (myShares / totalShares) * bookValue;
            }
          } else {
            const bookValue = Math.max(0, Number(sr.available_cash) - Number(sr.debt || 0));
            equity += (myShares / totalShares) * bookValue;
          }
        }

        const newTotal = Number(snap.cash_in_hand) + equity;
        await db('character_net_worth_history')
          .where({ id: snap.id })
          .update({ equity_value: equity, total_net_worth: newTotal });
        updated++;
      }

      res.status(200).json({ success: true, updated, message: `Recalculated ${updated} net worth history records.` });
    } catch (error) {
      next(error);
    }
  }
}
