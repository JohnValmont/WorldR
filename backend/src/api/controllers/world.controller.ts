import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { runWorldTick, runPoliticsTick } from '../services/worldTick.service';



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

      const clockPayload = {
        ...clock,
        server_time: new Date().toISOString()
      };

      res.status(200).json(clockPayload);
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

  public static async forcePoliticsTick(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await runPoliticsTick({ force: true });
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
          'companies.is_npc',
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
              isNpc: sale.is_npc,
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
              isNpc: sale.is_npc,
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

      // ── Clock: needed to scope popular cars to last completed arc ────────────
      const clock = await db('world_clock')
        .where({ world_instance_id: activeInstanceId })
        .first();
      const currentYear  = clock ? Number(clock.current_year)  : 1;
      const currentMonth = clock ? Number(clock.current_month) : 1;
      // Find the ACTUAL last month with sales data rather than blindly assuming
      // currentMonth-1 was processed. If the tick was stuck, that month may be empty.
      let prevYear  = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth === 0) { prevMonth = 12; prevYear = currentYear - 1; }
      try {
        // Sanity-cap: world_year must be <= currentYear to prevent corrupted rows
        // (e.g. arc counter accidentally stored as year, like "842") from hijacking
        // the leaderboard. Any row with world_year > currentYear is treated as bad data.
        const latestSale = await db('manufacturing_sales_results as r')
          .where('r.world_instance_id', activeInstanceId)
          .where('r.world_year', '<=', currentYear)
          .orderBy('r.world_year', 'desc')
          .orderBy('r.world_month', 'desc')
          .select('r.world_year', 'r.world_month')
          .first();
        if (latestSale) {
          prevYear  = Number(latestSale.world_year);
          prevMonth = Number(latestSale.world_month);
        }
      } catch (_) { /* fall back to clock-based guess */ }

      // ── Run all three independent queries in PARALLEL ────────────────────────
      const [topCompanies, popularCars, popularCarsAllTime, richestPlayersResult] = await Promise.all([

        // ── Global 500: precompute share price, share count, inventory via CTE ──
        db.raw(`
          WITH
          latest_price AS (
            SELECT DISTINCT ON (company_id) company_id, close_price
            FROM share_price_history
            ORDER BY company_id, game_year DESC, game_month DESC
          ),
          share_totals AS (
            SELECT company_id, SUM(shares) AS total_shares
            FROM company_shares
            GROUP BY company_id
          ),
          inv_val AS (
            SELECT mi.company_id,
              SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit) AS val
            FROM manufacturing_inventory mi
            JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
            GROUP BY mi.company_id
          ),
          book_val AS (
            SELECT cf.company_id,
              GREATEST(0,
                cf.available_cash - COALESCE(cf.debt, 0) + COALESCE(iv.val, 0)
              ) AS bv,
              cf.last_arc_profit
            FROM company_finances cf
            LEFT JOIN inv_val iv ON iv.company_id = cf.company_id
          )
          SELECT
            c.id,
            c.name,
            c.industry_id,
            c.is_npc,
            bv.last_arc_profit,
            CASE
              WHEN c.is_exchange_listed = true
                THEN COALESCE(lp.close_price * st.total_shares, bv.bv)
              ELSE bv.bv
            END AS company_value
          FROM companies c
          JOIN book_val bv ON bv.company_id = c.id
          LEFT JOIN latest_price lp ON lp.company_id = c.id
          LEFT JOIN share_totals st ON st.company_id = c.id
          WHERE c.status = 'active'
            AND c.world_instance_id = ?
          ORDER BY
            CASE
              WHEN c.is_exchange_listed = true
                THEN COALESCE(lp.close_price * st.total_shares, bv.bv)
              ELSE bv.bv
            END DESC
          LIMIT 10
        `, [activeInstanceId]),

        // ── Best Sellers: last completed arc only ────────────────────────────
        db('manufacturing_sales_results as r')
          .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
          .join('companies as c', 'c.id', 'm.company_id')
          .where('r.world_instance_id', activeInstanceId)
          .where('r.world_year',  prevYear)
          .where('r.world_month', prevMonth)
          .select('m.id as model_id', 'm.name as model_name', 'c.name as company_name')
          .sum('r.units_sold as total_sold')
          .groupBy('m.id', 'm.name', 'c.name')
          .havingRaw('SUM(r.units_sold) > 0')
          .orderByRaw('SUM(r.units_sold) DESC')
          .limit(10),

        // ── Best Sellers: all time ───────────────────────────────────────────
        db('manufacturing_sales_results as r')
          .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
          .join('companies as c', 'c.id', 'm.company_id')
          .where('r.world_instance_id', activeInstanceId)
          .select('m.id as model_id', 'm.name as model_name', 'c.name as company_name')
          .sum('r.units_sold as total_sold')
          .groupBy('m.id', 'm.name', 'c.name')
          .havingRaw('SUM(r.units_sold) > 0')
          .orderByRaw('SUM(r.units_sold) DESC')
          .limit(10),

        // ── Richest Players: CTE-based, each subquery runs once ──────────────
        db.raw(`
          WITH
          buy_escrow AS (
            SELECT character_id, SUM(escrow_amount) AS total
            FROM share_orders
            WHERE side = 'buy' AND status = 'open'
            GROUP BY character_id
          ),
          total_shares AS (
            SELECT company_id, SUM(shares) AS total
            FROM company_shares
            GROUP BY company_id
          ),
          open_sells_by_char AS (
            SELECT company_id, character_id, SUM(quantity) AS qty
            FROM share_orders
            WHERE side = 'sell' AND status = 'open'
            GROUP BY company_id, character_id
          ),
          total_open_sells AS (
            SELECT company_id, SUM(quantity) AS qty
            FROM share_orders
            WHERE side = 'sell' AND status = 'open'
            GROUP BY company_id
          ),
          inv_val AS (
            SELECT mi.company_id,
              SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit) AS val
            FROM manufacturing_inventory mi
            JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
            GROUP BY mi.company_id
          ),
          -- Latest close price per listed company (most recent game_year+month row)
          latest_price AS (
            SELECT sph.company_id, sph.close_price
            FROM share_price_history sph
            INNER JOIN (
              SELECT company_id, MAX(game_year * 100 + game_month) AS ym
              FROM share_price_history
              GROUP BY company_id
            ) mx ON mx.company_id = sph.company_id
              AND (sph.game_year * 100 + sph.game_month) = mx.ym
          ),
          -- Fallback: latest individual trade price for companies with no monthly snapshot yet
          latest_trade AS (
            SELECT st.company_id, st.price AS close_price
            FROM share_trades st
            INNER JOIN (
              SELECT company_id, MAX(executed_at) AS lat
              FROM share_trades
              GROUP BY company_id
            ) mx ON mx.company_id = st.company_id AND st.executed_at = mx.lat
          ),
          company_book_value AS (
            SELECT cf.company_id,
              GREATEST(0, cf.available_cash - COALESCE(cf.debt, 0)
                       + COALESCE(iv.val, 0)) AS real_value,
              cf.last_arc_profit
            FROM company_finances cf
            LEFT JOIN inv_val iv ON iv.company_id = cf.company_id
          ),
          char_equity AS (
            SELECT cs.holder_character_id AS char_id,
              COALESCE(SUM(
                CASE
                  -- Listed company with a known stock price: use market cap
                  WHEN co.is_exchange_listed = 1
                       AND COALESCE(lp.close_price, lt.close_price) IS NOT NULL
                       AND COALESCE(lp.close_price, lt.close_price) > 0
                  THEN
                    (CAST(cs.shares AS FLOAT) + COALESCE(osbc.qty, 0))
                    * COALESCE(lp.close_price, lt.close_price)
                  -- Otherwise (private or not yet traded): book value pro-rata
                  ELSE
                    (CAST(cs.shares AS FLOAT) + COALESCE(osbc.qty, 0))
                    / NULLIF(COALESCE(ts.total, 0) + COALESCE(tos.qty, 0), 0)
                    * cbv.real_value
                END
              ), 0) AS equity
            FROM company_shares cs
            JOIN companies co ON co.id = cs.company_id
            JOIN company_book_value cbv ON cbv.company_id = cs.company_id
            LEFT JOIN total_shares ts ON ts.company_id = cs.company_id
            LEFT JOIN open_sells_by_char osbc
              ON osbc.company_id = cs.company_id
             AND osbc.character_id = cs.holder_character_id
            LEFT JOIN total_open_sells tos ON tos.company_id = cs.company_id
            LEFT JOIN latest_price lp ON lp.company_id = cs.company_id
            LEFT JOIN latest_trade lt ON lt.company_id = cs.company_id
            GROUP BY cs.holder_character_id
          ),
          char_trend AS (
            SELECT c2.owner_character_id AS char_id,
              MAX(cf2.last_arc_profit) AS best_profit
            FROM companies c2
            JOIN company_finances cf2 ON cf2.company_id = c2.id
            GROUP BY c2.owner_character_id
          )
          SELECT
            c.id,
            c.name,
            COALESCE(cf.cash_in_hand, 0) + COALESCE(be.total, 0) AS cash,
            COALESCE(ce.equity, 0) AS equity,
            COALESCE(cf.cash_in_hand, 0) + COALESCE(be.total, 0)
              + COALESCE(ce.equity, 0) AS net_worth,
            ct.best_profit AS trend
          FROM characters c
          LEFT JOIN character_finances cf ON cf.character_id = c.id
          LEFT JOIN buy_escrow be ON be.character_id = c.id
          LEFT JOIN char_equity ce ON ce.char_id = c.id
          LEFT JOIN char_trend ct ON ct.char_id = c.id
          WHERE c.status = 'active'
            AND c.name != 'System NPC'
            AND c.world_instance_id = ?
          ORDER BY net_worth DESC
          LIMIT 10
        `, [activeInstanceId]),
      ]);

      const popularCarsArc = { year: prevYear, month: prevMonth };

      res.status(200).json({
        topCompanies: (topCompanies as any).rows || topCompanies,
        popularCars,
        popularCarsAllTime,
        popularCarsArc,
        richestPlayers: (richestPlayersResult as any).rows || richestPlayersResult
      });

    } catch (error) {
      next(error);
    }
  }
}
