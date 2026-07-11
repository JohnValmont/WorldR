import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

export class CompanyController {
  // Helper to synchronize true net worth after capital movements
  private static async syncNetWorth(trx: any, characterId: number) {
    const charFinances = await trx('character_finances').where({ character_id: characterId }).first();
    if (!charFinances) return;
    
    let trueNetWorth = Number(charFinances.cash_in_hand);
    
    const equityValues = await trx('company_shares as cs')
      .join('companies as c', 'c.id', 'cs.company_id')
      .join('company_finances as cf', 'cf.company_id', 'c.id')
      .where({ 'cs.holder_character_id': characterId, 'c.status': 'active' })
      .select(
        'cs.shares',
        'cf.company_value',
        trx.raw(`(SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id) as total_shares`)
      );

    for (const row of equityValues) {
      const total = Number(row.total_shares || 0);
      if (total > 0) {
        trueNetWorth += (Number(row.shares) / total) * Number(row.company_value);
      }
    }
    
    await trx('character_finances')
      .where({ character_id: characterId })
      .update({ net_worth: Math.floor(trueNetWorth) });
  }
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

      if (Number(starting_capital) < 0 || isNaN(Number(starting_capital))) {
        return next(new AppError('Starting capital must be zero or a positive number', 400, 'BAD_REQUEST'));
      }

      if (industry_id === 'manufacturing' && Number(starting_capital) < 500000) {
        return next(new AppError('Manufacturing companies require a minimum of $500,000 in starting capital', 400, 'BAD_REQUEST'));
      }

      if (industry_id === 'shipping-logistics' && Number(starting_capital) < 50000) {
        return next(new AppError('Logistics companies require a minimum of $50,000 in starting capital', 400, 'BAD_REQUEST'));
      }

      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));
      }

      // Check unique name constraint
      const existingName = await db('companies')
        .where({ world_instance_id: activeInstance.id, country_id })
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
        return next(new AppError(`A ${structure.name} requires at least $${Number(structure.min_company_value).toLocaleString()} in starting capital`, 400, 'MIN_VALUE'));
      }

      const clock = await db('world_clock').where({ status: 'active' }).first();

      const result = await db.transaction(async (trx) => {
        // Check character cash with a lock
        let characterFinances = await trx('character_finances').where({ character_id: character.id }).forUpdate().first();
        
        if (!characterFinances) {
          // Fallback repair for old accounts without finances
          const [newFinances] = await trx('character_finances').insert({
            character_id: character.id,
            currency_id: 'dollar',
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
          world_instance_id: activeInstance.id,
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
          available_cash: Number(starting_capital),
          company_value: Number(starting_capital)
        }).returning('*');

        // Cap table: founder holds all 1,000,000 authorized shares
        await trx('company_shares').insert({
          company_id: company.id,
          holder_character_id: character.id,
          shares: 1000000,
          avg_cost_basis: Number(starting_capital) / 1000000
        });

        return { ...company, finances };
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /companies/:id/inject-capital  { amount }
   * Sole Trader only: transfer personal cash → company cash (owner loan).
   * Private company and public corporation routes are handled separately.
   */
  public static async injectCapital(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { amount } = req.body;

      if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
      if (!amount || Number(amount) <= 0 || isNaN(Number(amount))) {
        return next(new AppError('Amount must be a positive number.', 400, 'BAD_REQUEST'));
      }

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

        const company = await trx('companies').where({ id, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        // Structure guard: only sole traders can do direct capital injection
        if (company.legal_structure_id !== 'sole-trader') {
          throw new AppError(
            'Only sole traders can inject capital directly. Private companies issue shares; public corporations raise via rights issues.',
            400,
            'WRONG_STRUCTURE'
          );
        }

        const charFinances = await trx('character_finances')
          .where({ character_id: character.id })
          .forUpdate()
          .first();
        if (!charFinances) throw new AppError('Character finances not found', 500, 'INTERNAL');

        const personalCash = Number(charFinances.cash_in_hand);
        if (personalCash < Number(amount)) {
          throw new AppError(
            `Insufficient personal funds. You have $${personalCash.toLocaleString()} but need $${Number(amount).toLocaleString()}.`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        // Deduct from character
        await trx('character_finances')
          .where({ character_id: character.id })
          .decrement('cash_in_hand', Number(amount));

        // Add to company (owner loan — increases cash but tracked as equity/loan, not debt)
        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: company.id })
          .increment('available_cash', Number(amount))
          .increment('company_value', Number(amount))
          .returning('*');

        // Write ledger entry
        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: company.id,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          entry_type: 'capital_injection',
          description: `Owner capital injection`,
          amount: Number(amount),
          balance_after: updatedFinances.available_cash,
        });

        await CompanyController.syncNetWorth(trx, character.id);

        return {
          available_cash: updatedFinances.available_cash,
          personal_cash_remaining: personalCash - Number(amount),
        };
      });

      res.status(200).json({
        success: true,
        message: `$${Number(amount).toLocaleString()} injected into company as owner capital.`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /companies/:id/issue-shares  { sharesToIssue, pricePerShare }
   * Private Company only: founder issues new shares to themselves.
   * - sharesToIssue × pricePerShare cash deducted from personal wallet
   * - Same amount credited to company cash
   * - company_shares table updated (new shares minted)
   * - company_value incremented by the capital raised
   * Max shareholders check enforced (private-company allows 10).
   */
  public static async issueShares(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { sharesToIssue, pricePerShare } = req.body;

      if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      const shares = Math.floor(Number(sharesToIssue));
      const price  = Number(pricePerShare);

      if (!shares || shares <= 0) return next(new AppError('sharesToIssue must be a positive integer.', 400, 'BAD_REQUEST'));
      if (!price  || price  <= 0) return next(new AppError('pricePerShare must be positive.', 400, 'BAD_REQUEST'));

      const totalCost = shares * price;

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

        const company = await trx('companies').where({ id, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        // Structure guard: private-company only
        if (company.legal_structure_id !== 'private-company') {
          throw new AppError(
            'Share issuance is only available to Private Companies. Sole traders inject capital directly; public corporations raise via exchange rights issues.',
            400,
            'WRONG_STRUCTURE'
          );
        }

        // Dilution protection: cannot unilaterally issue shares if there are minority shareholders
        const otherHolders = await trx('company_shares')
          .where({ company_id: company.id })
          .where('shares', '>', 0)
          .whereNot({ holder_character_id: character.id })
          .forUpdate();
        if (otherHolders.length > 0) {
          throw new AppError('Cannot arbitrarily issue shares because there are minority shareholders. You must use the Equity Placements system to raise capital fairly without unilateral dilution.', 400, 'EMBEZZLEMENT_PROTECTION');
        }

        // Upsert cap table row for founder
        const existingRow = await trx('company_shares')
          .where({ company_id: id, holder_character_id: character.id })
          .forUpdate()
          .first();

        const struct = await trx('legal_structures').where({ id: 'private-company' }).first();
        const maxShareholders = struct?.max_shareholders ?? 10;
        
        if (!existingRow) {
          const holderCount = await trx('company_shares')
            .where({ company_id: id })
            .where('shares', '>', 0)
            .count('holder_character_id as n')
            .first();
          const currentHolders = Number((holderCount as any)?.n ?? 0);
          if (currentHolders >= maxShareholders) {
            throw new AppError(`Shareholder cap reached (${maxShareholders}). Cannot issue further shares without upgrading to a public corporation.`, 400, 'SHAREHOLDER_CAP');
          }
        }

        // Check personal funds
        const charFinances = await trx('character_finances')
          .where({ character_id: character.id })
          .forUpdate()
          .first();
        if (!charFinances) throw new AppError('Character finances not found', 500, 'INTERNAL');

        if (Number(charFinances.cash_in_hand) < totalCost) {
          throw new AppError(
            `Insufficient personal funds. This issuance costs $${totalCost.toLocaleString()} (${shares.toLocaleString()} shares × $${price.toLocaleString()}), but you only have $${Number(charFinances.cash_in_hand).toLocaleString()}.`,
            400,
            'INSUFFICIENT_FUNDS'
          );
        }

        // Deduct from character
        await trx('character_finances')
          .where({ character_id: character.id })
          .decrement('cash_in_hand', totalCost);

        // Credit company cash + company_value
        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: id })
          .increment('available_cash', totalCost)
          .increment('company_value',  totalCost)
          .returning('*');

        // Write ledger entry
        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: id,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          entry_type: 'share_issuance',
          description: `Issued ${shares.toLocaleString()} shares at $${price.toLocaleString()}`,
          amount: totalCost,
          balance_after: updatedFinances.available_cash,
        });

        // Use the existingRow fetched earlier at the start of the transaction
        if (existingRow) {
          const prevShares = Number(existingRow.shares);
          const prevCost   = Number(existingRow.avg_cost_basis);
          const newTotal   = prevShares + shares;
          const newAvgCost = ((prevCost * prevShares) + (price * shares)) / newTotal;
          await trx('company_shares')
            .where({ company_id: id, holder_character_id: character.id })
            .update({ shares: newTotal, avg_cost_basis: newAvgCost, updated_at: trx.fn.now() });
        } else {
          await trx('company_shares').insert({
            company_id: id,
            holder_character_id: character.id,
            shares,
            avg_cost_basis: price,
          });
        }

        await CompanyController.syncNetWorth(trx, character.id);

        return {
          available_cash: updatedFinances.available_cash,
          company_value:  updatedFinances.company_value,
          shares_issued:  shares,
          price_per_share: price,
          capital_raised:  totalCost,
          personal_cash_remaining: Number(charFinances.cash_in_hand) - totalCost,
        };
      });

      res.status(200).json({
        success: true,
        message: `Issued ${result.shares_issued.toLocaleString()} new shares at $${result.price_per_share.toLocaleString()} each. $${result.capital_raised.toLocaleString()} raised for the company.`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async withdrawCapital(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { amount } = req.body;

      if (!userId || !amount || Number(amount) <= 0 || isNaN(Number(amount))) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      const result = await db.transaction(async (trx) => {
        const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
        if (!character) throw new AppError('No character', 400, 'NO_CHARACTER');

        const company = await trx('companies').where({ id, owner_character_id: character.id }).first();
        if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');

        if (company.legal_structure_id === 'public-corporation') {
          throw new AppError('Public corporations cannot use direct owner drawings. Use dividend policies to distribute cash to shareholders.', 400, 'WRONG_STRUCTURE');
        }

        if (company.legal_structure_id === 'private-company') {
          const otherHolders = await trx('company_shares')
            .where({ company_id: company.id })
            .where('shares', '>', 0)
            .whereNot({ holder_character_id: character.id });
          if (otherHolders.length > 0) {
            throw new AppError('Cannot use ad-hoc owner drawings because there are minority shareholders. Use dividend policies to distribute cash fairly.', 400, 'EMBEZZLEMENT_PROTECTION');
          }
        }

        const companyFinances = await trx('company_finances').where({ company_id: company.id }).forUpdate().first();
        if (Number(companyFinances.available_cash) < Number(amount)) {
          throw new AppError('Insufficient company funds', 400, 'INSUFFICIENT_FUNDS');
        }

        // Deduct from company
        const [updatedCompanyFinances] = await trx('company_finances')
          .where({ company_id: company.id })
          .decrement('available_cash', Number(amount))
          .decrement('company_value', Number(amount))
          .returning('*');

        // Write ledger entry
        const clock = await trx('world_clock').first();
        await trx('company_ledger').insert({
          company_id: company.id,
          game_year: clock?.current_year || 1,
          game_month: clock?.current_month || 1,
          game_day: clock?.current_day || 1,
          entry_type: 'capital_withdrawal',
          description: `Owner drawings`,
          amount: -Number(amount),
          balance_after: updatedCompanyFinances.available_cash,
        });

        // Add to character (simulate dividend/withdrawal)
        await trx('character_finances')
          .where({ character_id: character.id })
          .increment('cash_in_hand', Number(amount));

        await CompanyController.syncNetWorth(trx, character.id);

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
          throw new AppError(`Requires company value of at least $${Number(target.min_company_value).toLocaleString()} (current: $${Number(finances.company_value).toLocaleString()})`, 400, 'MIN_VALUE');
        }

        // Downgrade guard: cannot move to a structure whose shareholder cap is below current holder count
        if (target.max_shareholders != null) {
          const holders = await trx('company_shares').where({ company_id: id }).where('shares', '>', 0).count('* as n').first();
          if (Number(holders?.n || 0) > Number(target.max_shareholders)) {
            throw new AppError(`Company has ${holders?.n} shareholders but a ${target.name} allows only ${target.max_shareholders}. Buy out shareholders first.`, 400, 'TOO_MANY_HOLDERS');
          }
        }

        if (Number(finances.available_cash) < fee) {
          throw new AppError(`Insufficient company cash for the $${fee.toLocaleString()} filing fee`, 400, 'INSUFFICIENT_FUNDS');
        }

        await trx('company_finances')
          .where({ company_id: id })
          .decrement('available_cash', fee)
          .decrement('company_value', fee);
        await trx('companies').where({ id }).update({ legal_structure_id, updated_at: trx.fn.now() });

        // IPO Pre-Listing Split: normalize total shares to exactly 1,000,000 to match DRX exchange limits.
        if (target.id === 'public-corporation') {
          const holders = await trx('company_shares').where({ company_id: id }).where('shares', '>', 0);
          const currentTotal = holders.reduce((sum: number, h: any) => sum + Number(h.shares), 0);
          if (currentTotal > 0 && currentTotal !== 1_000_000) {
            const splitRatio = 1_000_000 / currentTotal;
            for (const h of holders) {
              const newShares = Math.floor(Number(h.shares) * splitRatio);
              const newCost = Number(h.avg_cost_basis) / splitRatio;
              await trx('company_shares')
                .where({ company_id: id, holder_character_id: h.holder_character_id })
                .update({ shares: newShares, avg_cost_basis: newCost, updated_at: trx.fn.now() });
            }
            // Fix rounding errors by giving remainder to the largest shareholder
            const finalTotalRes = await trx('company_shares').where({ company_id: id }).sum('shares as total').first();
            const finalTotal = Number(finalTotalRes?.total || 0);
            if (finalTotal !== 1_000_000 && holders.length > 0) {
              const largestHolder = [...holders].sort((a,b) => Number(b.shares) - Number(a.shares))[0];
              await trx('company_shares')
                .where({ company_id: id, holder_character_id: largestHolder.holder_character_id })
                .increment('shares', 1_000_000 - finalTotal);
            }
          }
        }

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

      const totalShares = holders.reduce((sum, h) => sum + Number(h.shares), 0);

      // Fetch company and its finances
      const company = await db('companies').where({ id }).first();
      const finances = await db('company_finances').where({ company_id: id }).first();

      res.status(200).json({
        company: company ? { ...company, ...finances } : null,
        total_shares: totalShares,
        holders: holders.map((h: any) => ({ ...h, percent: totalShares > 0 ? (Number(h.shares) / totalShares) * 100 : 0 })),
        dividend_policy: { payout_percent: policy ? Number(policy.payout_percent) : 0 },
        recent_dividends: recentDividends,
      });
    } catch (error) {
      next(error);
    }
  }
}
