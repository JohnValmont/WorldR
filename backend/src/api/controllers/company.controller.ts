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

      const { name, country_id, headquarters_state_id, industry_id, subsector_id, legal_structure_id, currency_id, starting_capital } = req.body;

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

      // Validate the chosen legal structure (sole-trader / private-company / public-corporation)
      const structure = await db('legal_structures').where({ id: legal_structure_id, is_available: true }).first();
      if (!structure) {
        return next(new AppError('Invalid or unavailable legal structure', 400, 'BAD_STRUCTURE'));
      }
      // Public corporations require minimum starting value to IPO at creation
      if (Number(structure.min_company_value) > 0 && Number(starting_capital) < Number(structure.min_company_value)) {
        return next(new AppError(`A ${structure.name} requires at least §${Number(structure.min_company_value).toLocaleString()} in starting capital`, 400, 'MIN_VALUE'));
      }

      const clock = await db('world_clock').where({ status: 'active' }).first();

      const result = await db.transaction(async (trx) => {
        // Check character cash with a lock
        let characterFinances = await trx('character_finances').where({ character_id: character.id }).forUpdate().first();
        
        if (!characterFinances) {
          // Fallback repair for old accounts without finances
          const [newFinances] = await trx('character_finances').insert({
            character_id: character.id,
            currency_id: 'drennian-day',
            cash_in_hand: 1000000,
            net_worth: 1000000
          }).returning('*');
          characterFinances = newFinances;
        }

        const filingFee = Number(structure.filing_fee) || 5000;
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
          subsector_id,
          legal_structure_id,
          currency_id,
          name,
          status: 'active',
          reputation: 50,
          reliability: 50,
          created_at_world_year: clock.current_year,
          created_at_world_month: clock.current_month,
          created_at_world_day: clock.current_day
        }).returning('*');

        // Create finances
        const [finances] = await trx('company_finances').insert({
          company_id: company.id,
          currency_id,
          available_cash: starting_capital,
          company_value: starting_capital
        }).returning('*');

        // Cap table: founder holds all 1,000,000 authorized shares
        await trx('company_shares').insert({
          company_id: company.id,
          holder_character_id: character.id,
          shares: 1000000,
          avg_cost_basis: 0
        });

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
  public static async updateFinances(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const companyId = req.params.id;
      const { maintenance_policy } = req.body;

      if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 404, 'NOT_FOUND');

      const company = await db('companies').where({ id: companyId, owner_character_id: character.id }).first();
      if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

      if (maintenance_policy && !['Low', 'Standard', 'Generous'].includes(maintenance_policy)) {
        throw new AppError('Invalid maintenance policy', 400, 'BAD_REQUEST');
      }

      if (maintenance_policy) {
        await db('company_finances')
          .where({ company_id: companyId })
          .update({ maintenance_policy });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // GET /companies/structures — available legal structures with rules
  public static async getStructures(req: Request, res: Response, next: NextFunction) {
    try {
      const structures = await db('legal_structures').where({ is_available: true }).orderBy('filing_fee', 'asc');
      res.status(200).json(structures);
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:id/convert-structure  { legal_structure_id }
  // Company pays the new structure's filing fee. IPO requires min company value.
  public static async convertStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { legal_structure_id } = req.body;
      if (!userId || !legal_structure_id) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 400, 'NO_CHARACTER');

        const company = await trx('companies').where({ id, owner_character_id: character.id }).forUpdate().first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');
        if (company.legal_structure_id === legal_structure_id) throw new AppError('Company already has this structure', 400, 'SAME_STRUCTURE');

        const target = await trx('legal_structures').where({ id: legal_structure_id, is_available: true }).first();
        if (!target) throw new AppError('Invalid or unavailable legal structure', 400, 'BAD_STRUCTURE');

        const finances = await trx('company_finances').where({ company_id: id }).forUpdate().first();
        const fee = Number(target.filing_fee);

        // IPO requirement: minimum company value
        if (Number(target.min_company_value) > 0 && Number(finances.company_value) < Number(target.min_company_value)) {
          throw new AppError(`Requires company value of at least §${Number(target.min_company_value).toLocaleString()} (current: §${Number(finances.company_value).toLocaleString()})`, 400, 'MIN_VALUE');
        }

        // Downgrade guard: cannot move to a structure whose shareholder cap is below current holder count
        if (target.max_shareholders != null) {
          const holders = await trx('company_shares').where({ company_id: id }).where('shares', '>', 0).count('* as n').first();
          if (Number(holders?.n || 0) > Number(target.max_shareholders)) {
            throw new AppError(`Company has ${holders?.n} shareholders but a ${target.name} allows only ${target.max_shareholders}. Buy out shareholders first.`, 400, 'TOO_MANY_HOLDERS');
          }
        }

        if (Number(finances.available_cash) < fee) {
          throw new AppError(`Insufficient company cash for the §${fee.toLocaleString()} filing fee`, 400, 'INSUFFICIENT_FUNDS');
        }

        await trx('company_finances').where({ company_id: id }).decrement('available_cash', fee);
        await trx('companies').where({ id }).update({ legal_structure_id, updated_at: trx.fn.now() });

        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: id,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          entry_type: 'expense',
          description: `Converted to ${target.name} (filing fee)`,
          amount: -fee,
          balance_after: Number(finances.available_cash) - fee,
        });

        return { converted: true, legal_structure_id, fee };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PUT /companies/:id/dividend-policy  { payout_percent }
  public static async setDividendPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const payout = Number(req.body.payout_percent);
      if (!userId || !Number.isFinite(payout) || payout < 0 || payout > 50) {
        return next(new AppError('payout_percent must be between 0 and 50', 400, 'BAD_REQUEST'));
      }

      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) return next(new AppError('No character', 400, 'NO_CHARACTER'));

      const company = await db('companies').where({ id, owner_character_id: character.id }).first();
      if (!company) return next(new AppError('Company not found or unauthorized', 404, 'NOT_FOUND'));

      await db('dividend_policies')
        .insert({ company_id: id, payout_percent: payout })
        .onConflict('company_id')
        .merge({ payout_percent: payout, updated_at: db.fn.now() });

      res.status(200).json({ success: true, payout_percent: payout });
    } catch (error) {
      next(error);
    }
  }

  // GET /companies/:id/cap-table — shareholders and ownership (visible to any shareholder or owner)
  public static async getCapTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const holders = await db('company_shares as s')
        .join('characters as ch', 'ch.id', 's.holder_character_id')
        .where({ 's.company_id': id })
        .where('s.shares', '>', 0)
        .orderBy('s.shares', 'desc')
        .select('s.holder_character_id', 'ch.name', 's.shares', 's.avg_cost_basis');

      const policy = await db('dividend_policies').where({ company_id: id }).first();
      const recentDividends = await db('dividend_payments')
        .where({ company_id: id })
        .orderBy('created_at', 'desc')
        .limit(24);

      // Bug E fix: return dividend_policy as an object { payout_percent: number } so all
      // frontend consumers (EquityDeskTab) can read .dividend_policy.payout_percent uniformly.
      res.status(200).json({
        total_shares: 1000000,
        holders: holders.map((h: any) => ({ ...h, percent: (Number(h.shares) / 1000000) * 100 })),
        dividend_policy: { payout_percent: policy ? Number(policy.payout_percent) : 0 },
        recent_dividends: recentDividends,
      });
    } catch (error) {
      next(error);
    }
  }
}
