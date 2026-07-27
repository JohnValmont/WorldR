import knex from '../src/db/knex';
import { ManufacturingController } from '../src/api/controllers/manufacturing.controller';

async function run() {
  try {
    const clock = await knex('world_clock').first();
    const markets = await knex('manufacturing_region_markets').where({ country_id: 'drennia' }).select('id');
    const marketIds = markets.map((m: any) => m.id);

    const allocations = await knex('manufacturing_market_allocations as mma')
      .join('manufacturing_vehicle_models as vm', 'mma.vehicle_model_id', 'vm.id')
      .join('companies as c', 'vm.company_id', 'c.id')
      .whereIn('mma.region_market_id', marketIds)
      .where('vm.development_status', 'launched')
      .where('vm.status', 'active')
      .select(
        'mma.id',
        'mma.world_instance_id',
        'mma.company_id',
        'mma.vehicle_model_id',
        'mma.region_market_id',
        'mma.units_allocated',
        'mma.marketing_tier',
        'vm.name as model_name',
        'vm.target_segment',
        'vm.sale_price',
        'vm.appeal_score',
        'vm.performance_score',
        'vm.reliability_score',
        'vm.fuel_efficiency_score',
        'vm.cargo_score',
        'vm.manufacturing_cost_per_unit',
        'c.name as company_name',
        'c.is_npc',
        'vm.launched_year',
        'vm.launched_month'
      );

    const brandMap = new Map();
    const brandData = await knex('manufacturing_brand_awareness');
    for (const b of brandData) {
      brandMap.set(`${b.company_id}_${b.region_market_id}`, Number(b.awareness_level));
    }
    const salesBonusMap = new Map();

    const forecast = ManufacturingController.simulateSalesDemand(
      allocations,
      brandMap,
      1.0,
      salesBonusMap,
      clock.current_year,
      clock.current_month
    );

    let totalDrenniaDemand = 0;
    const companyDemand: Record<string, number> = {};
    const companyUnitsSold: Record<string, number> = {};
    const companyModels: Record<string, string[]> = {};

    for (const f of forecast) {
      if (!companyDemand[f.companyName]) {
        companyDemand[f.companyName] = 0;
        companyUnitsSold[f.companyName] = 0;
        companyModels[f.companyName] = [];
      }
      companyDemand[f.companyName] += f.demand;
      companyUnitsSold[f.companyName] += f.unitsSold;
      totalDrenniaDemand += f.demand;
      
      const modelStr = `${f.modelName} [${f.regionMarketId}] (${Math.round(f.unitsSold)} sold / ${Math.round(f.demand)} demand) [Share: ${(f.marketShareEstimate * 100).toFixed(1)}%] - Reason: ${f.mainReasonCode}`;
      companyModels[f.companyName].push(modelStr);
    }

    console.log(`\n=== DRENNIA NATIONAL MARKET SHARE FORECAST ===`);
    console.log(`Total Projected Demand: ${Math.round(totalDrenniaDemand)} units\n`);

    const sortedCompanies = Object.keys(companyDemand).sort((a, b) => companyDemand[b] - companyDemand[a]);
    for (const comp of sortedCompanies) {
      const share = ((companyDemand[comp] / totalDrenniaDemand) * 100).toFixed(2);
      console.log(`[${share}%] ${comp} (Demand: ${Math.round(companyDemand[comp])} | Est. Sold: ${Math.round(companyUnitsSold[comp])})`);
      for (const m of companyModels[comp]) {
        console.log(`  - ${m}`);
      }
      console.log();
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
