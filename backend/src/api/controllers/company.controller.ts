import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

export class CompanyController {
  public static async getMyCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) {
        return res.status(200).json([]);
      }

      const companies = await db('companies').where({ owner_character_id: character.id });
      
      // Fetch finances for each company
      for (const company of companies) {
        const finances = await db('company_finances').where({ company_id: company.id }).first();
        company.finances = finances;
      }

      res.status(200).json(companies);
    } catch (error) {
      next(error);
    }
  }

  public static async getCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const company = await db('companies').where({ id }).first();

      if (!company) {
        return next(new AppError('Company not found', 404, 'NOT_FOUND'));
      }

      // We allow anyone to fetch public company details, but maybe not finances.
      // Wait, in this API we might want to return finances only if owner
      const userId = req.user?.id;
      let includeFinances = false;
      if (userId) {
        const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
        if (character && character.id === company.owner_character_id) {
          includeFinances = true;
        }
      }

      if (includeFinances) {
        company.finances = await db('company_finances').where({ company_id: company.id }).first();
      }

      res.status(200).json(company);
    } catch (error) {
      next(error);
    }
  }

  public static async createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const { name, country_id, headquarters_state_id, industry_id, legal_structure_id, currency_id, starting_capital } = req.body;

      if (!name || !country_id || !headquarters_state_id || !industry_id || !legal_structure_id || !currency_id || starting_capital === undefined) {
        return next(new AppError('Missing required fields', 400, 'BAD_REQUEST'));
      }

      // Check unique name constraint
      const existingName = await db('companies')
        .where({ world_instance_id: 'pre-alpha-world-1', country_id })
        .whereRaw('LOWER(name) = ?', [name.toLowerCase()])
        .first();

      if (existingName) {
        return next(new AppError('Company name already exists in this country', 400, 'NAME_TAKEN'));
      }

      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) {
        return next(new AppError('Active character required to create a company', 400, 'NO_CHARACTER'));
      }

      const clock = await db('world_clock').where({ status: 'active' }).first();

      const result = await db.transaction(async (trx) => {
        // Check character cash with a lock
        let characterFinances = await trx('character_finances').where({ character_id: character.id }).forUpdate().first();
        
        if (!characterFinances) {
          // Fallback repair for old accounts without finances
          const [newFinances] = await trx('character_finances').insert({
            character_id: character.id,
            currency_id: 'drennian-mark',
            cash_in_hand: 1000000,
            net_worth: 1000000
          }).returning('*');
          characterFinances = newFinances;
        }

        const filingFee = 5000;
        const totalCost = Number(starting_capital) + filingFee;

        if (Number(characterFinances.cash_in_hand) < totalCost) {
          throw new AppError('Insufficient character funds', 400, 'INSUFFICIENT_FUNDS');
        }

        // Deduct from character
        await trx('character_finances')
          .where({ character_id: character.id })
          .decrement('cash_in_hand', totalCost)
          .decrement('net_worth', filingFee); // Starting capital is transferred, so net worth drops by fee only (simplification, real net worth is cash + company_value)

        // Create company
        const [company] = await trx('companies').insert({
          world_instance_id: 'pre-alpha-world-1',
          owner_character_id: character.id,
          country_id,
          headquarters_state_id,
          industry_id,
          legal_structure_id,
          currency_id,
          name,
          status: 'active',
          reputation: 50,
          reliability: 50,
          created_at_world_orbit: clock.current_orbit,
          created_at_world_arc: clock.current_arc,
          created_at_world_mark: clock.current_mark
        }).returning('*');

        // Create finances
        const [finances] = await trx('company_finances').insert({
          company_id: company.id,
          currency_id,
          available_cash: starting_capital,
          company_value: starting_capital
        }).returning('*');

        return { ...company, finances };
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  public static async withdrawCapital(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { amount } = req.body;

      if (!userId || !amount || amount <= 0) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 400, 'NO_CHARACTER');

        const company = await trx('companies').where({ id, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        const companyFinances = await trx('company_finances').where({ company_id: company.id }).forUpdate().first();
        if (Number(companyFinances.available_cash) < amount) {
          throw new AppError('Insufficient company funds', 400, 'INSUFFICIENT_FUNDS');
        }

        // Deduct from company
        const [updatedCompanyFinances] = await trx('company_finances')
          .where({ company_id: company.id })
          .decrement('available_cash', amount)
          .decrement('company_value', amount)
          .returning('*');

        // Add to character (simulate dividend/withdrawal)
        await trx('character_finances')
          .where({ character_id: character.id })
          .increment('cash_in_hand', amount);

        return updatedCompanyFinances;
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
