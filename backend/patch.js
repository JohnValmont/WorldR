const fs = require('fs');
const code = \
  public static async getGlobalLeaderboards(req: Request, res: Response, next: NextFunction) {
    try {
      const topCompanies = await db('companies as c')
        .join('company_finances as cf', 'cf.company_id', 'c.id')
        .where('c.status', 'active')
        .orderBy('cf.company_value', 'desc')
        .limit(10)
        .select('c.id', 'c.name', 'c.industry_id', 'cf.company_value');

      const clock = await db('world_clock').first();
      const currentYear = clock ? clock.current_year : 1;
      const currentMonth = clock ? clock.current_month : 1;

      const popularCars = await db('manufacturing_market_brand_arc_results as r')
        .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
        .join('companies as c', 'c.id', 'm.company_id')
        .join('market_segments as seg', 'seg.id', 'r.market_segment_id')
        .join('markets as mk', 'mk.id', 'seg.market_id')
        .where('mk.country_id', 'drennia')
        .andWhere('r.world_year', currentYear)
        .andWhere('r.world_month', currentMonth)
        .select('m.id as model_id', 'm.name as model_name', 'c.name as company_name')
        .sum('r.units_sold as total_sold')
        .groupBy('m.id', 'm.name', 'c.name')
        .orderBy('total_sold', 'desc')
        .limit(10);

      const richestPlayers = await db.raw(\\\
        SELECT 
          c.id, 
          c.full_name, 
          COALESCE(cf.cash_in_hand, 0) as cash,
          (
            SELECT COALESCE(SUM(
              (CAST(cs.shares AS FLOAT) / (SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id)) * compf.company_value
            ), 0)
            FROM company_shares cs
            JOIN company_finances compf ON compf.company_id = cs.company_id
            WHERE cs.holder_character_id = c.id
          ) as equity,
          COALESCE(cf.cash_in_hand, 0) + (
            SELECT COALESCE(SUM(
              (CAST(cs.shares AS FLOAT) / (SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id)) * compf.company_value
            ), 0)
            FROM company_shares cs
            JOIN company_finances compf ON compf.company_id = cs.company_id
            WHERE cs.holder_character_id = c.id
          ) as net_worth
        FROM characters c
        LEFT JOIN character_finances cf ON cf.character_id = c.id
        WHERE c.status = 'active'
        ORDER BY net_worth DESC
        LIMIT 10
      \\\);

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
\;

let content = fs.readFileSync('d:/WorldR/backend/src/api/controllers/world.controller.ts', 'utf8');
content = content.replace(/}\\s*$/g, code);
fs.writeFileSync('d:/WorldR/backend/src/api/controllers/world.controller.ts', content);
