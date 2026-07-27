import { db } from './src/config/database';
import { ManufacturingController } from './src/api/controllers/manufacturing.controller';

async function run() {
  try {
    const clock = await db('world_clock').first();
    const currentYear = clock.current_year;
    const currentMonth = clock.current_month;

    // Fetch all active, launched allocations across all region markets
    const allocations = await db('manufacturing_market_allocations as mma')
      .join('manufacturing_vehicle_models as vm', 'mma.vehicle_model_id', 'vm.id')
      .join('companies as c', 'vm.company_id', 'c.id')
      .join('manufacturing_region_markets as mrm', 'mma.region_market_id', 'mrm.id')
      .whereIn('vm.development_status', ['launched', 'discontinued'])
      .where('vm.status', 'active')
      .where('mma.units_allocated', '>', 0)
      .select(
        'mma.*',
        'vm.name as model_name',
        'vm.vehicle_class',
        'vm.target_segment',
        'vm.sale_price',
        'vm.manufacturing_cost_per_unit',
        'vm.reliability_score',
        'vm.performance_score',
        'vm.fuel_efficiency_score',
        'vm.appeal_score',
        'vm.cargo_score',
        'vm.launched_year',
        'vm.launched_month',
        'c.name as company_name',
        'c.is_npc',
        'mrm.population',
        'mrm.state_id as market_state_id',
        'mrm.average_income',
        'mrm.economic_multiplier',
        'mrm.preference_compact',
        'mrm.preference_sedan',
        'mrm.preference_utility_van',
        'mrm.competition_level',
        'mrm.market_tier',
        'mrm.distribution_strength',
        'mrm.avg_household_size',
        'mrm.vehicle_ownership_rate',
        'mrm.baseline_replacement_rate',
        'mrm.first_time_buyer_rate',
        'mrm.purchase_need_intensity',
        'mrm.vehicle_price_comfort_ratio',
        'mrm.price_sensitivity',
        'mrm.preference_economy',
        'mrm.preference_standard',
        'mrm.preference_premium',
        'mrm.vehicle_attribute_weights'
      );

    const brandMap = new Map();
    const brandData = await db('manufacturing_brand_awareness');
    for (const b of brandData) {
      brandMap.set(`${b.company_id}_${b.region_market_id}`, {
        awareness: Number(b.awareness),
        reputation: Number(b.reputation || 50)
      });
    }

    const forecast = ManufacturingController.simulateSalesDemand(
      allocations,
      brandMap,
      { none: 1.0, local: 1.15, regional: 1.30, national: 1.50 },
      new Map(),
      currentYear,
      currentMonth
    );

    let globalTotalDemand = 0;
    const companyDemand: Record<string, number> = {};
    const companyUnitsSold: Record<string, number> = {};
    const companyRevenue: Record<string, number> = {};
    const companyIdMap: Record<string, string> = {};

    for (const f of forecast) {
      const compName = f.alloc.company_name;
      const compId = f.alloc.company_id;
      companyIdMap[compName] = compId;

      if (!companyDemand[compName]) {
        companyDemand[compName] = 0;
        companyUnitsSold[compName] = 0;
        companyRevenue[compName] = 0;
      }
      companyDemand[compName] += f.finalAssignedDemand;
      companyUnitsSold[compName] += f.unitsSold;
      companyRevenue[compName] += f.unitsSold * Number(f.alloc.sale_price);
      globalTotalDemand += f.finalAssignedDemand;
    }

    const sortedCompanies = Object.keys(companyDemand).sort((a, b) => companyDemand[b] - companyDemand[a]).slice(0, 10);

    console.log(`=== TOP 10 PROJECTED MARKET SHARE & SHARE PRICE FORECAST (Y${currentYear} M${currentMonth}) ===\n`);
    console.log(`Total Global Industry Demand: ${Math.round(globalTotalDemand)} units\n`);

    for (const compName of sortedCompanies) {
      const compId = companyIdMap[compName];
      const demand = companyDemand[compName];
      const sold = companyUnitsSold[compName];
      const share = globalTotalDemand > 0 ? ((demand / globalTotalDemand) * 100).toFixed(2) : '0.00';
      const rev = companyRevenue[compName];

      // Fetch stock exchange data if listed
      const company = await db('companies').where({ id: compId }).first();
      const finance = await db('company_finances').where({ company_id: compId }).first();
      
      let sharePriceStr = 'Unlisted';
      let projectedPriceChange = 'N/A';

      if (company?.is_exchange_listed) {
        const prevBar = await db('share_price_history')
          .where({ company_id: compId })
          .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
          .first();

        if (prevBar) {
          const prevClose = Number(prevBar.close_price);
          const bookValue = Number(finance?.company_value || 0);
          const companyTotalShares = 1000000;
          const bookValuePerShare = bookValue / companyTotalShares;

          // Intrinsic Value Drift
          let driftRate = 0.05;
          if (bookValuePerShare > prevClose * 3) driftRate = 0.30;
          else if (bookValuePerShare > prevClose * 1.5) driftRate = 0.15;

          const projClose = prevClose + (bookValuePerShare - prevClose) * driftRate;
          const pctChange = (((projClose - prevClose) / prevClose) * 100).toFixed(2);
          const sign = Number(pctChange) >= 0 ? '+' : '';

          sharePriceStr = `$${prevClose.toFixed(2)} -> $${projClose.toFixed(2)}`;
          projectedPriceChange = `${sign}${pctChange}%`;
        }
      }

      console.log(`Rank: ${sortedCompanies.indexOf(compName) + 1} | ${compName}`);
      console.log(`  - Projected Market Share: ${share}% (${Math.round(demand)} units demand | ${Math.round(sold)} est. sold)`);
      console.log(`  - Est. Monthly Revenue: $${rev.toLocaleString('en-US')}`);
      console.log(`  - Share Price Forecast: ${sharePriceStr} (${projectedPriceChange})`);
      console.log();
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
