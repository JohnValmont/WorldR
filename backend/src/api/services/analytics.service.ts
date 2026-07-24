import { db } from '../../config/database';

export class AnalyticsService {
  /**
   * Generates a single-sentence plain-English advice based on the reason code.
   */
  public static generateAdvisorText(mainReasonCode: string | null): string {
    switch (mainReasonCode) {
      case 'Sold Out':
        return "Demand exceeded supply. Consider raising prices or expanding factory capacity.";
      case 'Market Capacity Capped (Cannibalised)':
        return "The market is saturated. You are competing too closely with other vehicles in this segment.";
      case 'Low Brand Awareness':
        return "Consumers don't know your brand exists. Increase marketing spend.";
      case 'Zero Demand':
        return "Your vehicle is fundamentally unappealing to this market. Check pricing or attributes.";
      case 'Weak Distribution':
        return "You lack the sales network to reach customers. Hire more Sales Managers or invest in distribution.";
      case 'Balanced':
        return "Sales are stable and meeting expectations. Focus on incremental improvements.";
      default:
        return "No clear advice available for the current market state.";
    }
  }

  public static async getSelfAnalytics(companyId: string) {
    // Determine the most recently completed month.
    const clock = await db('world_clock').first();
    const currentYear = clock?.current_year || 1;
    const currentMonth = clock?.current_month || 1;

    let targetMonth = currentMonth - 1;
    let targetYear = currentYear;
    if (targetMonth === 0) {
      targetMonth = 12; // Assuming 12 months in an year
      targetYear -= 1;
    }
    
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    // If targetYear is 0, we are at the very beginning of the game.
    if (targetYear <= 0) {
      return {
        month: { year: currentYear, month: currentMonth - 1 },
        segments: []
      };
    }

    // Fetch sales for target month
    const targetSales = await db('manufacturing_sales_results')
      .where({ 'manufacturing_sales_results.company_id': companyId, world_year: targetYear, world_month: targetMonth })
      .join('manufacturing_vehicle_models', 'manufacturing_sales_results.vehicle_model_id', 'manufacturing_vehicle_models.id')
      .join('manufacturing_region_markets', 'manufacturing_sales_results.region_market_id', 'manufacturing_region_markets.id')
      .select(
        'manufacturing_sales_results.*',
        'manufacturing_vehicle_models.name as model_name',
        'manufacturing_vehicle_models.target_segment',
        'manufacturing_region_markets.name as market_name'
      );

    // Fetch sales for previous month to calculate trends
    const prevSales = await db('manufacturing_sales_results')
      .where({ 'manufacturing_sales_results.company_id': companyId, world_year: prevYear, world_month: prevMonth })
      .join('manufacturing_vehicle_models', 'manufacturing_sales_results.vehicle_model_id', 'manufacturing_vehicle_models.id')
      .join('manufacturing_region_markets', 'manufacturing_sales_results.region_market_id', 'manufacturing_region_markets.id')
      .select(
        'manufacturing_sales_results.*',
        'manufacturing_vehicle_models.target_segment'
      );

    // Group by region_market_id (which acts as segment/market)
    const segmentMap = new Map<string, any>();

    for (const sale of targetSales) {
      const segmentId = sale.region_market_id;
      if (!segmentMap.has(segmentId)) {
        segmentMap.set(segmentId, {
          segmentId: segmentId,
          marketName: sale.market_name,
          targetSegment: sale.target_segment,
          totalUnitsSold: 0,
          totalRevenue: 0,
          models: [],
          marketShareEstimate: 0,
          mainReasonCode: sale.main_reason_code,
          trend: 'neutral'
        });
      }

      const segment = segmentMap.get(segmentId);
      segment.totalUnitsSold += Number(sale.units_sold);
      segment.totalRevenue += Number(sale.revenue);
      // Sum the market share if multiple models in same market
      segment.marketShareEstimate += Number(sale.market_share_estimate);
      segment.models.push({
        modelId: sale.vehicle_model_id,
        modelName: sale.model_name,
        unitsSold: sale.units_sold,
        revenue: sale.revenue,
        reasonCode: sale.main_reason_code
      });
    }

    // Calculate trends
    for (const [segmentId, segment] of segmentMap.entries()) {
      // Find matching prev sales
      const prevSegmentSales = prevSales.filter(s => s.region_market_id === segmentId);
      
      let prevShare = 0;
      if (prevSegmentSales.length > 0) {
         prevShare = prevSegmentSales.reduce((acc, s) => acc + Number(s.market_share_estimate), 0);
      }
      
      const currentShare = segment.marketShareEstimate;
      
      if (currentShare > prevShare + 0.01) segment.trend = 'up';
      else if (currentShare < prevShare - 0.01) segment.trend = 'down';
      else segment.trend = 'neutral';
      
      segment.advisorText = AnalyticsService.generateAdvisorText(segment.mainReasonCode);
    }

    return {
      month: { year: targetYear, month: targetMonth },
      segments: Array.from(segmentMap.values())
    };
  }

  public static async getMarketStructure(countryId: string) {
    // Determine the most recently completed month.
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
      return {
        month: { year: currentYear, month: currentMonth - 1 },
        segments: []
      };
    }

    // Fetch sales for target month across all companies in the country
    const allSales = await db('manufacturing_sales_results')
      .where({ 'manufacturing_sales_results.world_year': targetYear, 'manufacturing_sales_results.world_month': targetMonth })
      .join('manufacturing_region_markets', 'manufacturing_sales_results.region_market_id', 'manufacturing_region_markets.id')
      .join('companies', 'manufacturing_sales_results.company_id', 'companies.id')
      .where({ 'manufacturing_region_markets.country_id': countryId })
      .select(
        'manufacturing_sales_results.*',
        'manufacturing_region_markets.name as market_name',
        'companies.name as company_name',
        'companies.is_npc'
      );

    const segmentMap = new Map<string, any>();

    for (const sale of allSales) {
      const segmentId = sale.region_market_id;
      if (!segmentMap.has(segmentId)) {
        segmentMap.set(segmentId, {
          segmentId: segmentId,
          marketName: sale.market_name,
          totalUnitsSold: 0,
          totalRevenue: 0,
          reasonCodes: [],
          averageSalePrice: 0,
          saturationSignal: 'Balanced',
          companySalesMap: new Map<string, number>()
        });
      }

      const segment = segmentMap.get(segmentId);
      segment.totalUnitsSold += Number(sale.units_sold);
      segment.totalRevenue += Number(sale.revenue);
      // Track reason codes weighted by units sold or just count instances. The prompt says "If a large percentage of sales in this segment had the 'Sold Out' reason code". Weighting by units is more accurate for the whole market.
      // Wait, 'Sold Out' means they sold everything, so weighting by units sold might underrepresent it if they didn't have much. Let's just tally the reason codes per sale record.
      segment.reasonCodes.push({ reason: sale.main_reason_code, units: Number(sale.units_sold) });
      
      const compData = segment.companySalesMap.get(sale.company_name) || { units: 0, isNpc: sale.is_npc };
      compData.units += Number(sale.units_sold);
      segment.companySalesMap.set(sale.company_name, compData);
    }

    for (const segment of segmentMap.values()) {
      if (segment.totalUnitsSold > 0) {
        segment.averageSalePrice = segment.totalRevenue / segment.totalUnitsSold;
      }

      // Calculate saturation signal based on reason codes (weighted by units sold)
      let soldOutUnits = 0;
      let cannibalisedUnits = 0;

      for (const rc of segment.reasonCodes) {
        if (rc.reason === 'Sold Out') soldOutUnits += rc.units;
        if (rc.reason === 'Market Capacity Capped (Cannibalised)') cannibalisedUnits += rc.units;
      }

      if (segment.totalUnitsSold > 0) {
        if (soldOutUnits / segment.totalUnitsSold > 0.4) {
          segment.saturationSignal = 'Underserved';
        } else if (cannibalisedUnits / segment.totalUnitsSold > 0.4) {
          segment.saturationSignal = 'Saturated';
        }
      }

      segment.companies = [];
      for (const [companyName, data] of segment.companySalesMap.entries()) {
        segment.companies.push({
          companyName,
          isNpc: data.isNpc,
          marketShare: segment.totalUnitsSold > 0 ? (data.units / segment.totalUnitsSold) * 100 : 0
        });
      }

      // Clean up reason codes before returning to keep response small and anonymized
      delete segment.reasonCodes;
      delete segment.companySalesMap;
    }

    return {
      month: { year: targetYear, month: targetMonth },
      segments: Array.from(segmentMap.values())
    };
  }

  public static async purchaseMarketResearch(companyId: string, regionMarketId: string, tierLevel: number) {
    const cost = tierLevel === 1 ? 25000 : tierLevel === 2 ? 100000 : null;
    
    if (cost === null) {
      throw new Error('Invalid research tier');
    }

    return await db.transaction(async (trx) => {
      // Fetch company finances and lock for update
      const finances = await trx('company_finances')
        .where({ company_id: companyId })
        .first()
        .forUpdate();

      if (!finances) {
        throw new Error('Company finances not found');
      }

      if (Number(finances.available_cash) < cost) {
        throw new Error(`Insufficient funds. Need $${cost.toLocaleString()} for Tier ${tierLevel} research.`);
      }

      // Deduct cash
      await trx('company_finances')
        .where({ company_id: companyId })
        .update({
          available_cash: Number(finances.available_cash) - cost
        });

      // Determine the most recently completed month
      const clock = await trx('world_clock').first();
      const currentYear = clock?.current_year || 1;
      const currentMonth = clock?.current_month || 1;

      let targetMonth = currentMonth - 1;
      let targetYear = currentYear;
      if (targetMonth === 0) {
        targetMonth = 12;
        targetYear -= 1;
      }

      if (targetYear <= 0) {
        return []; // No completed month yet
      }

      // Fetch all sales for this segment in the last month
      const sales = await trx('manufacturing_sales_results')
        .where({ 
          'manufacturing_sales_results.region_market_id': regionMarketId,
          'manufacturing_sales_results.world_year': targetYear,
          'manufacturing_sales_results.world_month': targetMonth
        })
        .join('manufacturing_vehicle_models', 'manufacturing_sales_results.vehicle_model_id', 'manufacturing_vehicle_models.id')
        .join('companies', 'manufacturing_sales_results.company_id', 'companies.id')
        .select(
          'companies.name as company_name',
          'companies.is_npc',
          'manufacturing_vehicle_models.name as model_name',
          'manufacturing_sales_results.market_share_estimate',
          // Get all specs and price, we'll nullify them later if Tier 1
          'manufacturing_vehicle_models.sale_price',
          'manufacturing_vehicle_models.reliability_score',
          'manufacturing_vehicle_models.performance_score',
          'manufacturing_vehicle_models.fuel_efficiency_score',
          'manufacturing_vehicle_models.appeal_score',
          'manufacturing_vehicle_models.cargo_score'
        );

      // Filter based on tier
      const results = sales.map(s => {
        const base = {
          company_name: s.company_name,
          is_npc: s.is_npc,
          model_name: s.model_name,
          market_share_estimate: Number(s.market_share_estimate)
        };

        if (tierLevel === 2) {
          return {
            ...base,
            sale_price: Number(s.sale_price),
            reliability_score: s.reliability_score,
            performance_score: s.performance_score,
            fuel_efficiency_score: s.fuel_efficiency_score,
            appeal_score: s.appeal_score,
            cargo_score: s.cargo_score
          };
        } else {
          return {
            ...base,
            sale_price: null,
            reliability_score: null,
            performance_score: null,
            fuel_efficiency_score: null,
            appeal_score: null,
            cargo_score: null
          };
        }
      });

      // Sort by market share descending
      results.sort((a, b) => b.market_share_estimate - a.market_share_estimate);

      return results;
    });
  }
}
