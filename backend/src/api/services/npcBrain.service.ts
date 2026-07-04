import { Knex } from 'knex';
import { 
  PRODUCTION_BUFFER, 
  PRICE_STEP, 
  MARKETING_REVENUE_PCT, 
  ZERO_DEMAND_FACELIFT_MONTHS,
  MIN_UNITS,
  MIN_UNITS_FLOOR,
  AWARENESS_BUMP_THRESHOLD,
  MODEL_AGE_FACELIFT,
  NPC_ROSTER
} from '../constants/npc';

// Defines the inputs required for an NPC company to make its monthly decisions
export interface NpcBrainInput {
  salePrice: number;
  costPerUnit: number;
  targetUnits: number;
  factoryCapacity: number;
  marketingTier: string;
  awareness: number;
  availableCash: number;
  lastRevenue: number;
  unitsSoldLastArc: number;
  unitsAllocatedLastArc: number;
  marketShareThisArc: number;
  marketShareLastArc: number;
  reasonCode: string | null;
  zeroDemandStreak: number;
  modelAgeMonths: number;
  unitsProducedLastArc: number;
  inventoryInStock: number;
}

// Defines the output actions to be taken by an NPC company
export interface NpcBrainOutput {
  newSalePrice: number;
  newTargetUnits: number;
  newMarketingTier: string;
  faceliftFlag: boolean;
  newZeroDemandStreak: number;
}

// Allowed marketing tiers and their costs for logic comparison
const MARKETING_TIERS = [
  { tier: 'none', cost: 0 },
  { tier: 'local', cost: 3500 },
  { tier: 'regional', cost: 12000 },
  { tier: 'national', cost: 35000 }
];

/**
 * PURE FUNCTION: Evaluates current memory and last arc results to dictate the next arc's setup.
 * Highly predictable, rule-based heuristics to create plausible competitors.
 */
export function decideNpcActions(input: NpcBrainInput): NpcBrainOutput {
  const {
    salePrice, costPerUnit, factoryCapacity, marketingTier, awareness,
    availableCash, lastRevenue, unitsSoldLastArc, unitsAllocatedLastArc,
    marketShareThisArc, marketShareLastArc, reasonCode, zeroDemandStreak, modelAgeMonths,
    unitsProducedLastArc, inventoryInStock
  } = input;

  let newSalePrice = salePrice;
  
  // Baseline B6 rule: produce based on what we sold last month + buffer, subtracting inventory
  const desired = Math.round(unitsSoldLastArc * PRODUCTION_BUFFER);
  let newTargetUnits = Math.max(MIN_UNITS_FLOOR, Math.min(desired - inventoryInStock, factoryCapacity));
  
  // If there is no sales history (e.g. Arc 1 from seed), preserve the seeded target units!
  if (reasonCode === null) {
    newTargetUnits = input.targetUnits;
  }
  
  let newMarketingTier = marketingTier;
  let faceliftFlag = false;
  let newZeroDemandStreak = zeroDemandStreak;

  // B2 Rule: If we completely sold out, increase the price step and boost production generously
  if (reasonCode === 'Sold Out') {
    const maxAllowedPrice = costPerUnit * 2.5;
    if (salePrice < maxAllowedPrice) {
      newSalePrice = Math.min(salePrice * (1 + PRICE_STEP), maxAllowedPrice);
    }
    const desiredSoldOut = Math.round(unitsSoldLastArc * (PRODUCTION_BUFFER + 0.10));
    newTargetUnits = Math.max(MIN_UNITS_FLOOR, Math.min(desiredSoldOut - inventoryInStock, factoryCapacity));
  }
  // B1 Rule: If we lost market share and didn't sell out, we are too expensive, so drop price
  else if (marketShareThisArc < marketShareLastArc) {
    const marketShareDrop = marketShareLastArc - marketShareThisArc;
    const sellRatio = unitsAllocatedLastArc > 0 ? (unitsSoldLastArc / unitsAllocatedLastArc) : 0;
    
    // Hysteresis: Only cut price if marketShare drops by > 0.03 AND unitsSold/unitsAllocated < 0.9
    if (marketShareDrop > 0.03 && sellRatio < 0.9) {
      newSalePrice = salePrice * (1 - PRICE_STEP);
    }
  }

  // Ensure production limits are respected (already clamped above, but just in case)
  newTargetUnits = Math.max(MIN_UNITS_FLOOR, Math.min(newTargetUnits, factoryCapacity));

  // Protect against going bankrupt from too low prices (Cost Floor)
  const priceFloor = costPerUnit * 1.05;
  if (newSalePrice < priceFloor) {
    newSalePrice = priceFloor;
  }

  // B3 Rule: Try to bump marketing if awareness is low or reason code demands it
  if (reasonCode === 'Low Brand Awareness' || awareness < AWARENESS_BUMP_THRESHOLD) {
    const currentTierIndex = MARKETING_TIERS.findIndex(t => t.tier === marketingTier);
    if (currentTierIndex >= 0 && currentTierIndex < MARKETING_TIERS.length - 1) {
      const nextTier = MARKETING_TIERS[currentTierIndex + 1];
      // Only upgrade if the cost is <= configured % of last month's revenue and we have cash
      if (nextTier.cost <= MARKETING_REVENUE_PCT * lastRevenue && availableCash > nextTier.cost) {
        newMarketingTier = nextTier.tier;
      }
    }
  }

  // B4 Rule: Detect if a model has entirely stalled on sales despite having stock
  if (reasonCode === 'Zero Demand' || (unitsSoldLastArc === 0 && unitsAllocatedLastArc > 0)) {
    newZeroDemandStreak += 1;
  } else {
    newZeroDemandStreak = 0;
  }
  
  if (newZeroDemandStreak >= ZERO_DEMAND_FACELIFT_MONTHS) {
    faceliftFlag = true;
  }

  // B5 Rule: Natural aging lifecycle of a vehicle mandates a facelift
  if (modelAgeMonths >= MODEL_AGE_FACELIFT) {
    faceliftFlag = true;
  }

  return {
    newSalePrice,
    newTargetUnits,
    newMarketingTier,
    faceliftFlag,
    newZeroDemandStreak
  };
}

/**
 * DB WRAPPER: Resolves the state for an NPC company and processes its decisions in a transaction block.
 * Uses Knex transaction (`trx`) so the demand engine arc can wrap everything securely.
 */
export async function runNpcBrainForCompany(trx: Knex, companyId: string, currentOrbit: number, currentArc: number): Promise<void> {
  // 1. Fetch available cash for marketing decisions
  const finance = await trx('company_finances')
    .where({ company_id: companyId })
    .first();
  if (!finance) return;
  const availableCash = parseFloat(finance.available_cash) || 0;

  // 2. Fetch all launched, active models for the NPC company
  const models = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' });

  for (const model of models) {
    const modelId = model.id;
    const salePrice = parseFloat(model.sale_price);
    const costPerUnit = parseFloat(model.manufacturing_cost_per_unit);
    // Age of the model since it was introduced to the market
    const modelAgeMonths = currentArc - model.created_at_world_arc;

    // Get current active production line and factory constraints
    const prodLine = await trx('manufacturing_production_lines')
      .where({ company_id: companyId, assigned_vehicle_model_id: modelId, status: 'active' })
      .first();
    const targetUnits = prodLine ? prodLine.target_units_per_arc : 0;
    
    let factoryCapacity = 0;
    if (prodLine) {
      const factory = await trx('manufacturing_factories')
        .where({ id: prodLine.factory_id })
        .first();
      factoryCapacity = factory ? factory.capacity_per_arc : 0;
    }

    // Get market allocation details (assume 1 main market for now for NPCs)
    const allocation = await trx('manufacturing_market_allocations')
      .where({ company_id: companyId, vehicle_model_id: modelId })
      .first();
    const marketingTier = allocation ? allocation.marketing_tier : 'none';
    const unitsAllocatedLastArc = allocation ? allocation.units_allocated : 0;
    const regionMarketId = allocation ? allocation.region_market_id : null;

    // Get market awareness
    let awareness = 0;
    if (regionMarketId) {
      const brandAwareness = await trx('manufacturing_brand_awareness')
        .where({ company_id: companyId, region_market_id: regionMarketId })
        .first();
      awareness = brandAwareness ? parseFloat(brandAwareness.awareness) : 0;
    }

    let prevOrbit = currentOrbit;
    let prevArc = currentArc - 1;
    if (prevArc === 0) {
      prevArc = 8;
      prevOrbit = currentOrbit - 1;
    }

    // Fetch the previous arc's sales results to see how we did
    const lastSales = await trx('manufacturing_sales_results')
      .where({ 
        company_id: companyId, 
        vehicle_model_id: modelId,
        world_orbit: prevOrbit,
        world_arc: prevArc 
      });

    let marketShareThisArc = 0;
    let lastRevenue = 0;
    if (lastSales.length > 0) {
      const sum = lastSales.reduce((acc: number, s: any) => acc + parseFloat(s.market_share_estimate), 0);
      marketShareThisArc = sum / lastSales.length;
      lastRevenue = lastSales.reduce((acc: number, s: any) => acc + parseFloat(s.revenue), 0);
    }
    const unitsSoldLastArc = lastSales.length > 0 ? lastSales.reduce((acc: number, s: any) => acc + s.units_sold, 0) : 0;
    const reasonCode = lastSales.length > 0 ? lastSales[0].main_reason_code : null;

    // Fetch the previous arc's production results
    const lastSnapshot = await trx('manufacturing_model_snapshots')
      .where({
        company_id: companyId,
        model_id: modelId,
        world_orbit: prevOrbit,
        world_arc: prevArc
      })
      .first();
    const unitsProducedLastArc = lastSnapshot ? lastSnapshot.units_produced : 0;

    if (!lastSales) {
      // First arc for this model, don't panic and drop production to minimum.
      return;
    }
    let prevPrevOrbit = prevOrbit;
    let prevPrevArc = prevArc - 1;
    if (prevPrevArc === 0) {
      prevPrevArc = 8;
      prevPrevOrbit = prevOrbit - 1;
    }

    const prevSales = await trx('manufacturing_sales_results')
      .where({ 
        company_id: companyId, 
        vehicle_model_id: modelId,
        world_orbit: prevPrevOrbit,
        world_arc: prevPrevArc 
      });

    let marketShareLastArc = 0;
    if (prevSales.length > 0) {
      const sum = prevSales.reduce((acc: number, s: any) => acc + parseFloat(s.market_share_estimate), 0);
      marketShareLastArc = sum / prevSales.length;
    }

    // Load brain memory table to track long term struggles (e.g. zero demand streak)
    const state = await trx('manufacturing_npc_state')
      .where({ company_id: companyId })
      .first();
    const zeroDemandStreak = state ? state.zero_demand_streak : 0;

    const inv = await trx('manufacturing_inventory')
      .where({ company_id: companyId, vehicle_model_id: modelId })
      .first();
    const inventoryInStock = inv ? inv.units_in_stock : 0;

    // Build the brain's input payload
    const input: NpcBrainInput = {
      salePrice,
      costPerUnit,
      targetUnits,
      factoryCapacity,
      marketingTier,
      awareness,
      availableCash,
      lastRevenue,
      unitsSoldLastArc,
      unitsAllocatedLastArc,
      marketShareThisArc,
      marketShareLastArc,
      reasonCode,
      zeroDemandStreak,
      modelAgeMonths,
      unitsProducedLastArc,
      inventoryInStock
    };

    // Calculate decision
    const output = decideNpcActions(input);

    // Write-back the results to the respective DB tables
    await trx('manufacturing_vehicle_models')
      .where({ id: modelId })
      .update({ sale_price: output.newSalePrice });

    if (prodLine) {
      await trx('manufacturing_production_lines')
        .where({ id: prodLine.id })
        .update({ target_units_per_arc: output.newTargetUnits });
    }

    if (allocation) {
      await trx('manufacturing_market_allocations')
        .where({ id: allocation.id })
        .update({
          marketing_tier: output.newMarketingTier,
          units_allocated: output.newTargetUnits + inventoryInStock
        });
    }

    // Sync NPC memory
    await trx('manufacturing_npc_state')
      .insert({
        company_id: companyId,
        vehicle_model_id: modelId,
        last_market_share: marketShareThisArc,
        last_units_sold: unitsSoldLastArc,
        zero_demand_streak: output.newZeroDemandStreak,
        updated_at: trx.fn.now()
      })
      .onConflict('company_id')
      .merge();

  }
}


/**
 * Spawns a fresh NPC company with the specified personality.
 */
export async function spawnNpc(trx: Knex, personality: string, countryId: string, clock: any): Promise<void> {
  const roster = NPC_ROSTER.find(r => r.key === personality);
  if (!roster) throw new Error(`Unknown NPC personality: ${personality}`);

  // 1. Ensure system character exists
  let sysUser = await trx('users').where({ email: 'system_npc@worldr.game' }).first();
  if (!sysUser) {
    const [insertedUser] = await trx('users')
      .insert({ email: 'system_npc@worldr.game', password_hash: 'no_login_allowed' })
      .returning('*');
    sysUser = insertedUser;
  }

  let sysChar = await trx('characters').where({ user_id: sysUser.id }).first();
  if (!sysChar) {
    const [insertedChar] = await trx('characters')
      .insert({
        user_id: sysUser.id,
        world_instance_id: clock.world_instance_id,
        motherland_country_id: countryId,
        name: 'System NPC',
        age: 30,
        created_at_world_orbit: clock.world_orbit,
        created_at_world_arc: clock.world_arc,
        created_at_world_mark: 0
      })
      .returning('*');
    sysChar = insertedChar;
  }

  // 2. Get a standard factory type and region market
  const factoryType = await trx('manufacturing_factory_types').where({ id: 'small-workshop' }).first();
  const regionMarket = await trx('manufacturing_region_markets').where({ country_id: countryId }).first();

  if (!sysChar || !factoryType || !regionMarket) {
    console.log('Skipping NPC seed: missing dependencies.');
    return;
  }

  // 3. Create Company
  const [company] = await trx('companies')
    .insert({
      owner_character_id: sysChar.id,
      world_instance_id: clock.world_instance_id,
      country_id: countryId,
      headquarters_state_id: 'drennia-drennport', // fallback
      industry_id: 'manufacturing',
      legal_structure_id: 'sole-trader',
      currency_id: 'drennian-mark', // fallback
      name: roster.name,
      status: 'active',
      is_npc: true,
      npc_personality: roster.key,
      reputation: 50,
      reliability: 50,
      created_at_world_orbit: clock.world_orbit,
      created_at_world_arc: clock.world_arc,
      created_at_world_mark: 0
    })
    .returning('*');

  // Finances
  await trx('company_finances').insert({
    company_id: company.id,
    currency_id: 'drennian-mark',
    available_cash: roster.seedCapital,
    debt: 0,
    company_value: roster.seedCapital,
    last_arc_profit: 0
  });

  // Model
  const [model] = await trx('manufacturing_vehicle_models')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      name: `${roster.name} Standard`,
      vehicle_class: roster.build.platform === 'heavy-duty' ? 'Utility Van' : (roster.build.platform === 'economy' ? 'Compact Car' : 'Sedan'),
      platform_type: roster.build.platform,
      power_unit_type: roster.build.powerUnit,
      drivetrain_type: roster.build.drivetrain,
      interior_tier: roster.build.interior,
      safety_tier: roster.build.safety,
      target_segment: roster.segment,
      sale_price: roster.salePrice,
      manufacturing_cost_per_unit: Math.round(roster.salePrice * 0.55),
      reliability_score: roster.scores.reliability,
      performance_score: roster.scores.performance,
      fuel_efficiency_score: roster.scores.fuel_efficiency,
      appeal_score: roster.scores.appeal,
      cargo_score: roster.scores.cargo,
      safety_score: roster.scores.safety || 50,
      development_status: 'launched',
      dev_stage: 'ready_to_launch',
      status: 'active',
      created_at_world_orbit: clock.world_orbit,
      created_at_world_arc: clock.world_arc,
      created_at_world_mark: 0
    })
    .returning('*');

  // Factory
  const [factory] = await trx('manufacturing_factories')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      country_id: countryId,
      state_id: 'drennia-drennport',
      factory_type_id: factoryType.id,
      name: `${roster.name} Primary Facility`,
      lease_cost_per_arc: 25000,
      maintenance_cost_per_arc: 8000,
      capacity_per_arc: 500,
      status: 'active',
      created_at_world_orbit: clock.world_orbit,
      created_at_world_arc: clock.world_arc,
      created_at_world_mark: 0
    })
    .returning('*');

  // Production Line
  await trx('manufacturing_production_lines')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      factory_id: factory.id,
      line_number: 1,
      assigned_vehicle_model_id: model.id,
      target_units_per_arc: roster.targetUnitsPerArc,
      status: 'active'
    });

  // Staff
  await trx('company_staff').insert({ company_id: company.id, role: 'factory-worker', quantity: 30 });
  await trx('company_staff').insert({ company_id: company.id, role: 'production-supervisor', quantity: roster.staff.supervisor });
  await trx('company_staff').insert({ company_id: company.id, role: 'sales-manager', quantity: roster.staff.salesManager });
  if (roster.staff.engineer > 0) {
    await trx('company_staff').insert({ company_id: company.id, role: 'automotive-engineer', quantity: roster.staff.engineer });
  }
  if (roster.staff.inspector > 0) {
    await trx('company_staff').insert({ company_id: company.id, role: 'quality-inspector', quantity: roster.staff.inspector });
  }

  // Allocation
  await trx('manufacturing_market_allocations')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      vehicle_model_id: model.id,
      region_market_id: regionMarket.id,
      units_allocated: roster.targetUnitsPerArc,
      marketing_tier: roster.marketingTier
    });

  // NPC State
  await trx('manufacturing_npc_state')
    .insert({
      company_id: company.id,
      vehicle_model_id: model.id
    });
}
