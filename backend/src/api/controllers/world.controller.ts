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

  /**
   * GET /world/operators
   * Returns all active characters in the world with their company + political party.
   * Public-safe: no emails, no finances, no private data.
   */
  public static async getOperators(req: Request, res: Response, next: NextFunction) {
    try {
      // All active characters
      const characters = await db('characters')
        .where({ status: 'active', world_instance_id: 'pre-alpha-world-1' })
        .select(
          'id',
          'name',
          'age',
          'credibility',
          'charisma',
          'influence',
          'home_state_id',
          'motherland_country_id',
          'created_at_world_orbit',
          'created_at_world_arc'
        );

      if (!characters.length) {
        return res.json({ operators: [], arc: null });
      }

      const characterIds = characters.map((c: any) => c.id);

      // Their companies (one per character via owner_character_id)
      const companies = await db('companies')
        .whereIn('owner_character_id', characterIds)
        .where({ status: 'active' })
        .select('id', 'name', 'owner_character_id', 'headquarters_state_id', 'reputation', 'reliability');

      // Their political parties (via pol_party_members)
      let partyMemberships: any[] = [];
      try {
        partyMemberships = await db('pol_party_members')
          .whereIn('character_id', characterIds)
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
      const companyByOwner = new Map(companies.map((c: any) => [c.owner_character_id, c]));
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
        joined_arc: char.created_at_world_arc,
        joined_orbit: char.created_at_world_orbit,
        company: companyByOwner.get(char.id) || null,
        party: partyByCharacter.get(char.id) || null,
      }));

      res.json({ operators });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /world/market-leaderboard
   * Returns per-segment company market share from the last completed arc.
   * Public data — company names + market share % only. No specs, no prices.
   */
  public static async getMarketLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const clock = await db('world_clock').first();
      const currentOrbit = clock?.current_orbit || 1;
      const currentArc = clock?.current_arc || 1;

      let targetArc = currentArc - 1;
      let targetOrbit = currentOrbit;
      if (targetArc === 0) {
        targetArc = 12;
        targetOrbit -= 1;
      }

      if (targetOrbit <= 0) {
        return res.json({ segments: [], arc: null });
      }

      const sales = await db('manufacturing_sales_results')
        .where({
          'manufacturing_sales_results.world_orbit': targetOrbit,
          'manufacturing_sales_results.world_arc': targetArc,
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
            marketShare: 0,
          });
        }
        const co = seg.companies.get(key);
        co.unitsSold += Number(sale.units_sold);
        co.revenue += Number(sale.revenue);
        co.marketShare += Number(sale.market_share_estimate);
      }

      const segments = Array.from(segmentMap.values()).map((seg: any) => {
        const companies = Array.from(seg.companies.values())
          .sort((a: any, b: any) => b.marketShare - a.marketShare)
          .map((co: any) => ({
            ...co,
            marketShare: Math.round(co.marketShare * 1000) / 10, // → percentage, 1dp
          }));
        return {
          segmentId: seg.segmentId,
          marketName: seg.marketName,
          companies,
        };
      });

      res.json({
        arc: { orbit: targetOrbit, arc: targetArc },
        segments,
      });
    } catch (error) {
      next(error);
    }
  }
}
