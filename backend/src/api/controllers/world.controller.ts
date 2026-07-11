import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { runWorldTick } from '../services/worldTick.service';



export class WorldController {
  public static async getClock(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));
      }
      
      const clock = await db('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .first();

      if (!clock) {
        return next(new AppError('No active world clock found', 404, 'CLOCK_NOT_FOUND'));
      }

      res.status(200).json(clock);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /world/tick (admin)
   * Force-advance the world by one game month immediately, regardless of schedule.
   */
  public static async forceTick(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await runWorldTick({ force: true });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /world/clock/pause (admin) — stop automatic ticks.
   * POST /world/clock/resume (admin) — restart automatic ticks (reschedules from now).
   */
  public static async pauseClock(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));

      const updated = await db('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .update({ status: 'paused', updated_at: db.fn.now() });
      if (!updated) return next(new AppError('World clock not found', 404, 'CLOCK_NOT_FOUND'));
      res.status(200).json({ status: 'success', data: { clockStatus: 'paused' } });
    } catch (error) {
      next(error);
    }
  }

  public static async resumeClock(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));

      const clock = await db('world_clock').where({ world_instance_id: activeInstance.id }).first();
      if (!clock) return next(new AppError('World clock not found', 404, 'CLOCK_NOT_FOUND'));

      const intervalMs = (clock.real_seconds_per_month || 28800) * 1000;
      const nextClose = new Date(Date.now() + intervalMs);
      await db('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .update({
          status: 'active',
          month_started_at: new Date().toISOString(),
          next_arc_close_at: nextClose.toISOString(),
          updated_at: db.fn.now(),
        });
      res.status(200).json({ status: 'success', data: { clockStatus: 'active', next_arc_close_at: nextClose.toISOString() } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /world/clock/speed (admin)
   * Body: { seconds_per_month: number } — how many real seconds one game month lasts.
   * Reschedules the next tick from now using the new speed.
   */
  public static async setClockSpeed(req: Request, res: Response, next: NextFunction) {
    try {
      const seconds = Number(req.body?.seconds_per_month);
      if (!Number.isFinite(seconds) || seconds < 10 || seconds > 31_536_000) {
        return next(new AppError('seconds_per_month must be a number between 10 and 31536000', 400, 'BAD_REQUEST'));
      }

      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) return next(new AppError('No active world instance found', 404, 'INSTANCE_NOT_FOUND'));

      const nextClose = new Date(Date.now() + seconds * 1000);
      const updated = await db('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .update({
          real_seconds_per_month: Math.round(seconds),
          month_started_at: new Date().toISOString(),
          next_arc_close_at: nextClose.toISOString(),
          updated_at: db.fn.now(),
        });
      if (!updated) return next(new AppError('World clock not found', 404, 'CLOCK_NOT_FOUND'));
      res.status(200).json({ status: 'success', data: { real_seconds_per_month: Math.round(seconds), next_arc_close_at: nextClose.toISOString() } });
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

  /**
   * GET /world/operators
   * Returns all active characters in the world with their company + political party.
   * Public-safe: no emails, no finances, no private data.
   */
  public static async getOperators(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) {
        return res.json({ operators: [], month: null });
      }

      // All active characters
      const characters = await db('characters')
        .where({ status: 'active', world_instance_id: activeInstance.id })
        .select(
          'id',
          'name',
          'age',
          'credibility',
          'charisma',
          'influence',
          'home_state_id',
          'motherland_country_id',
          'created_at_world_year',
          'created_at_world_month'
        );

      if (!characters.length) {
        return res.json({ operators: [], month: null });
      }

      const buildCharIdQuery = () => db('characters').select('id').where({ status: 'active', world_instance_id: activeInstance.id });

      // Their companies (can be multiple per character)
      const companies = await db('companies')
        .whereIn('owner_character_id', buildCharIdQuery())
        .where({ status: 'active' })
        .select('id', 'name', 'owner_character_id', 'headquarters_state_id', 'reputation', 'reliability');

      // Their political parties (via pol_party_members)
      let partyMemberships: any[] = [];
      try {
        partyMemberships = await db('pol_party_members')
          .whereIn('character_id', buildCharIdQuery())
          .join('pol_parties', 'pol_party_members.party_id', 'pol_parties.id')
          .select(
            'pol_party_members.character_id',
            'pol_party_members.role',
            'pol_parties.id as party_id',
            'pol_parties.name as party_name'
          );
      } catch {
        // pol_party_members may not exist yet — degrade gracefully
        partyMemberships = [];
      }

      // Build lookup maps
      const companyByOwner = new Map<string, any[]>();
      for (const c of companies) {
        const arr = companyByOwner.get(c.owner_character_id) || [];
        arr.push(c);
        companyByOwner.set(c.owner_character_id, arr);
      }
      const partyByCharacter = new Map(partyMemberships.map((m: any) => [m.character_id, m]));

      const operators = characters.map((char: any) => ({
        id: char.id,
        name: char.name,
        age: char.age,
        credibility: char.credibility,
        charisma: char.charisma,
        influence: char.influence,
        home_state_id: char.home_state_id,
        motherland_country_id: char.motherland_country_id,
        joined_arc: char.created_at_world_month,
        joined_year: char.created_at_world_year,
        companies: companyByOwner.get(char.id) || [],
        party: partyByCharacter.get(char.id) || null,
      }));

      res.json({ operators });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /world/market-leaderboard
   * Returns per-segment company market share from the last completed month.
   * Public data — company names + market share % only. No specs, no prices.
   */
  public static async getMarketLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const clock = await db('world_clock').first();
      const currentYear = clock?.current_year || 1;
      const currentMonth = clock?.current_month || 1;

      let targetMonth = currentMonth - 1;
      let targetYear = currentYear;
      if (targetMonth === 0) {
        targetMonth = 12;
        targetYear -= 1;
      }

      if (targetYear <= 0) {
        return res.json({ segments: [], month: null });
      }

      const sales = await db('manufacturing_sales_results')
        .where({
          'manufacturing_sales_results.world_year': targetYear,
          'manufacturing_sales_results.world_month': targetMonth,
        })
        .join('companies', 'manufacturing_sales_results.company_id', 'companies.id')
        .join('manufacturing_region_markets', 'manufacturing_sales_results.region_market_id', 'manufacturing_region_markets.id')
        .select(
          'manufacturing_sales_results.region_market_id',
          'manufacturing_region_markets.name as market_name',
          'companies.id as company_id',
          'companies.name as company_name',
          'manufacturing_sales_results.units_sold',
          'manufacturing_sales_results.revenue',
          'manufacturing_sales_results.market_share_estimate'
        );

        // Group by segment, aggregate per company
        const segmentMap = new Map<string, any>();
        for (const sale of sales) {
          if (!segmentMap.has(sale.region_market_id)) {
            segmentMap.set(sale.region_market_id, {
              segmentId: sale.region_market_id,
              marketName: sale.market_name,
              totalUnits: 0,
              companies: new Map<string, any>(),
            });
          }
          const seg = segmentMap.get(sale.region_market_id);
          const key = sale.company_id;
          if (!seg.companies.has(key)) {
            seg.companies.set(key, {
              companyId: sale.company_id,
              companyName: sale.company_name,
              unitsSold: 0,
              revenue: 0,
            });
          }
          const co = seg.companies.get(key);
          const uSold = Number(sale.units_sold);
          co.unitsSold += uSold;
          co.revenue += Number(sale.revenue);
          seg.totalUnits += uSold;
        }

        const segments = Array.from(segmentMap.values()).map((seg: any) => {
          const companies = Array.from(seg.companies.values())
            .map((co: any) => {
              const share = seg.totalUnits > 0 ? co.unitsSold / seg.totalUnits : 0;
              return {
                ...co,
                marketShare: Math.round(share * 1000) / 10, // percentage, 1dp
              };
            })
            .sort((a: any, b: any) => b.marketShare - a.marketShare);
          return {
            segmentId: seg.segmentId,
            marketName: seg.marketName,
            companies,
          };
        });

        // Compute National Aggregation
        const nationalCompanies = new Map<string, any>();
        let nationalTotalUnits = 0;
        
        for (const sale of sales) {
          const key = sale.company_id;
          if (!nationalCompanies.has(key)) {
            nationalCompanies.set(key, {
              companyId: sale.company_id,
              companyName: sale.company_name,
              unitsSold: 0,
              revenue: 0,
            });
          }
          const co = nationalCompanies.get(key);
          const uSold = Number(sale.units_sold);
          co.unitsSold += uSold;
          co.revenue += Number(sale.revenue);
          nationalTotalUnits += uSold;
        }

        const nationalCompArr = Array.from(nationalCompanies.values())
          .map((co: any) => {
            const share = nationalTotalUnits > 0 ? co.unitsSold / nationalTotalUnits : 0;
            return {
              ...co,
              marketShare: Math.round(share * 1000) / 10,
            };
          })
          .sort((a: any, b: any) => b.marketShare - a.marketShare);

        segments.unshift({
          segmentId: 'national',
          marketName: 'Drennia (National)',
          companies: nationalCompArr,
        });

        res.json({
          month: { year: targetYear, month: targetMonth },
          segments,
        });
    } catch (error) {
      next(error);
    }
  }

  public static async getGlobalLeaderboards(req: Request, res: Response, next: NextFunction) {
    try {
      const activeInstance = await db('world_instances').where({ status: 'active' }).first();
      const activeInstanceId = activeInstance ? activeInstance.id : null;

      const topCompanies = await db('companies as c')
        .join('company_finances as cf', 'cf.company_id', 'c.id')
        .where('c.status', 'active')
        .andWhere('c.world_instance_id', activeInstanceId)
        .orderBy('cf.company_value', 'desc')
        .limit(10)
        .select('c.id', 'c.name', 'c.industry_id', 'cf.company_value', 'cf.last_arc_profit');



      const popularCars = await db('manufacturing_sales_results as r')
        .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
        .join('companies as c', 'c.id', 'm.company_id')
        .where('r.world_instance_id', activeInstanceId)
        .select('m.id as model_id', 'm.name as model_name', 'c.name as company_name')
        .sum('r.units_sold as total_sold')
        .groupBy('m.id', 'm.name', 'c.name')
        .orderByRaw('SUM(r.units_sold) DESC')
        .limit(10);

      const richestPlayers = await db.raw(`
        SELECT 
          c.id, 
          c.name, 
          COALESCE(cf.cash_in_hand, 0) as cash,
          (
            SELECT COALESCE(SUM(
              (CAST(cs.shares AS FLOAT) / NULLIF((SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id), 0)) * compf.company_value
            ), 0)
            FROM company_shares cs
            JOIN company_finances compf ON compf.company_id = cs.company_id
            WHERE cs.holder_character_id = c.id
          ) as equity,
          COALESCE(cf.cash_in_hand, 0) + (
            SELECT COALESCE(SUM(
              (CAST(cs.shares AS FLOAT) / NULLIF((SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id), 0)) * compf.company_value
            ), 0)
            FROM company_shares cs
            JOIN company_finances compf ON compf.company_id = cs.company_id
            WHERE cs.holder_character_id = c.id
          ) as net_worth,
          (
            SELECT compf2.last_arc_profit 
            FROM companies c2 
            JOIN company_finances compf2 ON compf2.company_id = c2.id 
            WHERE c2.owner_character_id = c.id 
            ORDER BY compf2.company_value DESC 
            LIMIT 1
          ) as trend
        FROM characters c
        LEFT JOIN character_finances cf ON cf.character_id = c.id
        WHERE c.status = 'active' AND c.name NOT ILIKE '%NPC%' AND c.world_instance_id = ?
        ORDER BY net_worth DESC
        LIMIT 10
      `, [activeInstanceId]);

      res.status(200).json({
        topCompanies,
        popularCars,
        richestPlayers: richestPlayers.rows || richestPlayers
      });
    } catch (error) {
      next(error);
    }
  }
}
