const { db } = require('./src/config/database');
const { ManufacturingController } = require('./src/api/controllers/manufacturing.controller');

async function run() {
  try {
    const clock = await db('world_clock').first();

    const allocations = await db('manufacturing_market_allocations as mma')
      .join('manufacturing_vehicle_models as vm', 'mma.vehicle_model_id', 'vm.id')
      .join('companies as c', 'vm.company_id', 'c.id')
      .join('manufacturing_region_markets as mrm', 'mma.region_market_id', 'mrm.id')
      .where('mrm.country_id', 'drennia')
      .where('vm.development_status', 'launched')
      .where('vm.status', 'active')
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
      brandMap.set(`${b.company_id}_${b.region_market_id}`, { awareness: Number(b.awareness_level), reputation: Number(b.reputation_level || 50) });
    }
    const salesBonusMap = new Map();

    const forecast = ManufacturingController.simulateSalesDemand(
      allocations,
      brandMap,
      { none: 1.0, local: 1.15, regional: 1.30, national: 1.50 }, // MARKETING_MULT
      salesBonusMap,
      clock.current_year,
      clock.current_month
    );

    let totalDrenniaDemand = 0;
    const companyDemand = {};
    const companyUnitsSold = {};
    const companyModels = {};

    for (const f of forecast) {
      const compName = f.alloc.company_name;
      const modName = f.alloc.model_name;
      const regId = f.alloc.region_market_id;

      if (!companyDemand[compName]) {
        companyDemand[compName] = 0;
        companyUnitsSold[compName] = 0;
        companyModels[compName] = [];
      }
      companyDemand[compName] += f.finalAssignedDemand;
      companyUnitsSold[compName] += f.unitsSold;
      totalDrenniaDemand += f.finalAssignedDemand;
      
      const modelStr = `${modName} (${Math.round(f.unitsSold)} sold / ${Math.round(f.finalAssignedDemand)} demand) [Market: ${regId}] - Reason: ${f.mainReasonCode}`;
      companyModels[compName].push(modelStr);
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
