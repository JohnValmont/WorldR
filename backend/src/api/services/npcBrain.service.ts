import { Knex } from 'knex';
import * as crypto from 'crypto';
import { 
  PRODUCTION_BUFFER, 
  PRICE_STEP, 
  MARKETING_REVENUE_PCT, 
  ZERO_DEMAND_FACELIFT_MONTHS,
  MIN_UNITS,
  MIN_UNITS_FLOOR,
  AWARENESS_BUMP_THRESHOLD,
  MODEL_AGE_FACELIFT,
  NPC_ROSTER,
  NPC_EXPAND_SELL_RATIO,
  NPC_MAX_MARKETS
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
  // B7: signals that the NPC should try to enter additional region markets
  expandMarkets: boolean;
}

// Allowed marketing tiers and their costs for logic comparison
const MARKETING_TIERS = [
  { tier: 'none', cost: 0 },
  { tier: 'local', cost: 3500 },
  { tier: 'regional', cost: 12000 },
  { tier: 'national', cost: 35000 }
];

/**
 * PURE FUNCTION: Evaluates current memory and last month results to dictate the next month's setup.
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
  const sellRatio = unitsAllocatedLastArc > 0 ? (unitsSoldLastArc / unitsAllocatedLastArc) : 0;
  
  // Baseline B6 rule: produce based on what we sold last month + buffer, subtracting inventory
  let desired = Math.round(unitsSoldLastArc * PRODUCTION_BUFFER);
  
  // If we are selling well, keep a minimum baseline heartbeat so we don't flatline
  if (sellRatio >= 0.8) {
    desired = Math.max(desired, Math.round(factoryCapacity * 0.15));
  }
  
  let newTargetUnits = Math.max(MIN_UNITS_FLOOR, Math.min(desired - inventoryInStock, factoryCapacity));
  
  // If there is no sales history (e.g. Month 1 from seed), preserve the seeded target units!
  if (reasonCode === null) {
    newTargetUnits = input.targetUnits;
  }
  
  let newMarketingTier = marketingTier;
  let faceliftFlag = false;
  let newZeroDemandStreak = zeroDemandStreak;
  let expandMarkets = false;

  // B2 Rule: If we completely sold out, increase the price step and boost production generously
  if (reasonCode === 'Sold Out') {
    const maxAllowedPrice = costPerUnit * 2.5;
    if (salePrice < maxAllowedPrice) {
      newSalePrice = Math.min(salePrice * (1 + PRICE_STEP), maxAllowedPrice);
    }
    const desiredSoldOut = Math.max(
      Math.round(unitsSoldLastArc * (PRODUCTION_BUFFER + 0.50)),
      Math.round(factoryCapacity * 0.25)
    );
    newTargetUnits = Math.max(MIN_UNITS_FLOOR, Math.min(desiredSoldOut - inventoryInStock, factoryCapacity));
  }
  // B1 Rule: If we lost market share and didn't sell out, we are too expensive, so drop price
  // Also drop price if we are hoarding inventory (selling less than 50% of allocation)
  else if (marketShareThisArc < marketShareLastArc || sellRatio < 0.5) {
    const marketShareDrop = marketShareLastArc - marketShareThisArc;
    
    // Panic Cut: If we are selling almost nothing, aggressively slash price
    if (sellRatio < 0.2) {
      newSalePrice = salePrice * (1 - (PRICE_STEP * 2.5));
    }
    // Hysteresis: Only cut price if marketShare drops by > 0.03 AND unitsSold/unitsAllocated < 0.9
    // OR if we are just fundamentally failing to sell our stock (sellRatio < 0.5)
    else if ((marketShareDrop > 0.03 && sellRatio < 0.9) || sellRatio < 0.5) {
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

  // B7 Rule: Market Expansion — if we're consistently selling nearly everything
  // we allocate, we have untapped demand: try to enter new markets.
  if (
    unitsAllocatedLastArc > 0 &&
    reasonCode !== 'Zero Demand' &&
    reasonCode !== 'Low Brand Awareness' &&
    (unitsSoldLastArc / unitsAllocatedLastArc) >= NPC_EXPAND_SELL_RATIO
  ) {
    expandMarkets = true;
  }

  return {
    newSalePrice,
    newTargetUnits,
    newMarketingTier,
    faceliftFlag,
    newZeroDemandStreak,
    expandMarkets
  };
}

async function performIndustrialEspionage(trx: Knex, companyId: string, currentYear: number, currentMonth: number, availableCash: number): Promise<number> {
  const ESPIONAGE_COST = 10000000; // $10M
  if (availableCash < ESPIONAGE_COST) return availableCash;

  // Check if they have fewer than 6 models
  const modelsCount = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' })
    .count('* as count');
  if (Number(modelsCount[0].count) >= 6) return availableCash;

  // Get active instance
  const instance = await trx('world_instances').where({ status: 'active' }).first();
  if (!instance) return availableCash;

  // Calculate prev month
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear--;
  }

  // Find the top selling player model
  const topPlayerModel = await trx('manufacturing_sales_results as r')
    .join('manufacturing_vehicle_models as m', 'm.id', 'r.vehicle_model_id')
    .join('companies as c', 'c.id', 'm.company_id')
    .where('r.world_instance_id', instance.id)
    .where('r.world_year', prevYear)
    .where('r.world_month', prevMonth)
    .where('c.is_npc', false)
    .select('m.*', 'c.name as player_company_name')
    .sum('r.units_sold as total_sold')
    .groupBy('m.id', 'c.name', 'c.is_npc')
    .orderByRaw('SUM(r.units_sold) DESC')
    .first();

  if (!topPlayerModel || Number(topPlayerModel.total_sold) < 40) return availableCash;

  // Check if we already cloned this model recently (prevent segment spam)
  const existingClone = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, target_segment: topPlayerModel.target_segment })
    .where('name', 'like', `%Challenger%`)
    .first();
    
  if (existingClone) return availableCash;

  // Deduct cash
  availableCash -= ESPIONAGE_COST;
  await trx('company_finances').where({ company_id: companyId }).update({ available_cash: availableCash });

  const npcCompany = await trx('companies').where({ id: companyId }).first();

  const newModelId = crypto.randomUUID();
  const newModelName = `${npcCompany.name} ${topPlayerModel.name} Challenger`;

  const newModel = {
    id: newModelId,
    world_instance_id: instance.id,
    company_id: companyId,
    name: newModelName.substring(0, 60),
    target_segment: topPlayerModel.target_segment,
    vehicle_class: topPlayerModel.vehicle_class,
    platform_type: topPlayerModel.platform_type,
    power_unit_type: topPlayerModel.power_unit_type,
    drivetrain_type: topPlayerModel.drivetrain_type,
    interior_tier: topPlayerModel.interior_tier,
    safety_tier: topPlayerModel.safety_tier,
    reliability_score: Math.min(100, Number(topPlayerModel.reliability_score) + 2),
    performance_score: Math.min(100, Number(topPlayerModel.performance_score) + 2),
    fuel_efficiency_score: Math.min(100, Number(topPlayerModel.fuel_efficiency_score) + 2),
    appeal_score: Math.min(100, Number(topPlayerModel.appeal_score) + 2),
    safety_score: Math.min(100, Number(topPlayerModel.safety_score) + 2),
    cargo_score: Math.min(100, Number(topPlayerModel.cargo_score) + 2),
    manufacturing_cost_per_unit: topPlayerModel.manufacturing_cost_per_unit,
    sale_price: Math.max(1, Math.floor(Number(topPlayerModel.sale_price) * 0.95)),
    development_status: 'launched',
    status: 'active',
    launched_year: currentYear,
    launched_month: currentMonth,
    created_at_world_year: currentYear,
    created_at_world_month: currentMonth,
    created_at: new Date(),
    updated_at: new Date()
  };

  await trx('manufacturing_vehicle_models').insert(newModel);
  console.log(`[NPC Espionage] ${npcCompany.name} cloned ${topPlayerModel.name} into ${newModelName}`);

  // Create factory line
  const factory = await trx('manufacturing_factories').where({ company_id: companyId }).first();
  if (factory) {
    await trx('manufacturing_production_lines').insert({
      id: crypto.randomUUID(),
      company_id: companyId,
      factory_id: factory.id,
      assigned_vehicle_model_id: newModelId,
      status: 'active',
      target_units_per_month: 150,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Allocate to market
    const existingAllocation = await trx('manufacturing_market_allocations')
      .where({ company_id: companyId })
      .first();
      
    if (existingAllocation) {
      await trx('manufacturing_market_allocations').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        vehicle_model_id: newModelId,
        region_market_id: existingAllocation.region_market_id,
        units_allocated: 150,
        sale_price: newModel.sale_price,
        marketing_tier: 'none',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  return availableCash;
}

async function applyNpcFacelifts(trx: Knex, companyId: string, currentYear: number, currentMonth: number, availableCash: number): Promise<number> {
  const FACELIFT_COST = 10000000; // $10M
  if (availableCash < FACELIFT_COST) return availableCash;

  const models = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' });

  for (const model of models) {
    const launchedYear = Number(model.launched_year || currentYear);
    const launchedMonth = Number(model.launched_month || currentMonth);
    const ageMonths = Math.max(0, (currentYear - launchedYear) * 12 + (currentMonth - launchedMonth));

    if (ageMonths >= 24) {
      const newModelId = crypto.randomUUID();
      let newModelName = model.name + ' II';
      if (model.name.endsWith(' IV')) newModelName = model.name.replace(' IV', ' V');
      else if (model.name.endsWith(' III')) newModelName = model.name.replace(' III', ' IV');
      else if (model.name.endsWith(' II')) newModelName = model.name.replace(' II', ' III');
      
      const newModel = {
        ...model,
        id: newModelId,
        name: newModelName,
        reliability_score: Math.min(100, Number(model.reliability_score) + 12),
        performance_score: Math.min(100, Number(model.performance_score) + 12),
        appeal_score: Math.min(100, Number(model.appeal_score) + 12),
        launched_year: currentYear,
        launched_month: currentMonth,
        created_at_world_year: currentYear,
        created_at_world_month: currentMonth,
        created_at: new Date(),
        updated_at: new Date(),
        manufacturing_cost_per_unit: Math.round(Number(model.manufacturing_cost_per_unit) * 1.05),
        facelift_source_model_id: model.id
      };
      
      await trx('manufacturing_vehicle_models').insert(newModel);
      
      // Transfer production lines
      await trx('manufacturing_production_lines')
        .where({ company_id: companyId, assigned_vehicle_model_id: model.id })
        .update({ assigned_vehicle_model_id: newModelId, updated_at: new Date() });
        
      // Copy allocations
      const allocations = await trx('manufacturing_market_allocations')
        .where({ company_id: companyId, vehicle_model_id: model.id });
        
      for (const alloc of allocations) {
        const { id, ...allocWithoutId } = alloc;
        const newAlloc = { ...allocWithoutId, id: crypto.randomUUID(), vehicle_model_id: newModelId };
        await trx('manufacturing_market_allocations').insert(newAlloc);
      }
      
      // Discontinue old model
      await trx('manufacturing_vehicle_models')
        .where({ id: model.id })
        .update({ 
          status: 'discontinued', 
          development_status: 'discontinued',
          discontinued_year: currentYear, 
          discontinued_month: currentMonth, 
          updated_at: new Date() 
        });
        
      // Charge the company
      availableCash -= FACELIFT_COST;
      await trx('company_finances')
        .where({ company_id: companyId })
        .update({ available_cash: availableCash, updated_at: new Date() });
        
      // Only do one facelift per tick
      break;
    }
  }
  return availableCash;
}

/**
 * DB WRAPPER: Resolves the state for an NPC company and processes its decisions in a transaction block.
 * Uses Knex transaction (`trx`) so the demand engine month can wrap everything securely.
 */
export async function runNpcBrainForCompany(trx: Knex, companyId: string, currentYear: number, currentMonth: number): Promise<void> {
  // 1. Fetch available cash for marketing decisions
  const finance = await trx('company_finances')
    .where({ company_id: companyId })
    .first();
  if (!finance) return;
  let availableCash = parseFloat(finance.available_cash) || 0;

  // NEW: Industrial Espionage (Clone player models if cash rich)
  availableCash = await performIndustrialEspionage(trx, companyId, currentYear, currentMonth, availableCash);

  // NEW: Automatic NPC Facelifts (V2 models)
  availableCash = await applyNpcFacelifts(trx, companyId, currentYear, currentMonth, availableCash);

  // 2. Fetch all launched, active models for the NPC company
  const models = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' });

  for (const model of models) {
    const modelId = model.id;
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} Start`;

    const salePrice = parseFloat(model.sale_price);
    const costPerUnit = parseFloat(model.manufacturing_cost_per_unit);
    // Age of the model since it was introduced to the market
    const modelAgeMonths = currentMonth - model.created_at_world_month;

    // Get current active production line and factory constraints
    const prodLine = await trx('manufacturing_production_lines')
      .where({ company_id: companyId, assigned_vehicle_model_id: modelId, status: 'active' })
      .first();
    const targetUnits = prodLine ? prodLine.target_units_per_month : 0;
    
    let factoryCapacity = 0;
    if (prodLine) {
      const factory = await trx('manufacturing_factories')
        .where({ id: prodLine.factory_id })
        .first();
      factoryCapacity = factory ? factory.capacity_per_month : 0;
    }

    // Get ALL market allocations for this model (multi-market support)
    const allocations = await trx('manufacturing_market_allocations')
      .where({ company_id: companyId, vehicle_model_id: modelId });
    const allocation = allocations[0] || null; // primary allocation for brain input
    const marketingTier = allocation ? allocation.marketing_tier : 'none';
    const unitsAllocatedLastArc = allocations.reduce((s: number, a: any) => s + Number(a.units_allocated), 0);
    const regionMarketId = allocation ? allocation.region_market_id : null;

    // Get market awareness
    let awareness = 0;
    if (regionMarketId) {
      const brandAwareness = await trx('manufacturing_brand_awareness')
        .where({ company_id: companyId, region_market_id: regionMarketId })
        .first();
      awareness = brandAwareness ? parseFloat(brandAwareness.awareness) : 0;
    }

    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 8;
      prevYear = currentYear - 1;
    }

    // Fetch the previous month's sales results to see how we did
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - Fetching lastSales`;
    const lastSales = await trx('manufacturing_sales_results')
      .where({ 
        company_id: companyId, 
        vehicle_model_id: modelId,
        world_year: prevYear,
        world_month: prevMonth 
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

    // Fetch the previous month's production results
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - Fetching lastSnapshot`;
    const lastSnapshot = await trx('manufacturing_model_snapshots')
      .where({
        company_id: companyId,
        model_id: modelId,
        world_year: prevYear,
        world_month: prevMonth
      })
      .first();
    const unitsProducedLastArc = lastSnapshot ? lastSnapshot.units_produced : 0;

    if (!lastSales) {
      // First month for this model, don't panic and drop production to minimum.
      return;
    }
    let prevPrevYear = prevYear;
    let prevPrevMonth = prevMonth - 1;
    if (prevPrevMonth === 0) {
      prevPrevMonth = 8;
      prevPrevYear = prevYear - 1;
    }

    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - Fetching prevSales`;
    const prevSales = await trx('manufacturing_sales_results')
      .where({ 
        company_id: companyId, 
        vehicle_model_id: modelId,
        world_year: prevPrevYear,
        world_month: prevPrevMonth 
      });

    let marketShareLastArc = 0;
    if (prevSales.length > 0) {
      const sum = prevSales.reduce((acc: number, s: any) => acc + parseFloat(s.market_share_estimate), 0);
      marketShareLastArc = sum / prevSales.length;
    }

    // Load brain memory table to track long term struggles (e.g. zero demand streak)
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - Fetching state`;
    const state = await trx('manufacturing_npc_state')
      .where({ company_id: companyId })
      .first();
    const zeroDemandStreak = state ? state.zero_demand_streak : 0;

    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - Fetching inv`;
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

    // Fix NaN factory capacity from legacy column names
    if (isNaN(input.factoryCapacity)) {
      const f = await trx('manufacturing_factories').where({ id: prodLine?.factory_id }).first();
      input.factoryCapacity = f ? Number(f.capacity_per_arc || f.capacity_per_month || 0) : 0;
    }
    input.factoryCapacity = Number(input.factoryCapacity) || 0;
    input.inventoryInStock = Number(input.inventoryInStock) || 0;
    input.unitsSoldLastArc = Number(input.unitsSoldLastArc) || 0;
    input.targetUnits = Number(input.targetUnits) || 0;

    // Calculate decision
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - decideNpcActions`;
    const output = decideNpcActions(input);

    // CRITICAL FIX: Sanitize output to absolutely guarantee no Postgres crash loops due to NaN values!
    if (isNaN(output.newTargetUnits) || output.newTargetUnits === null || output.newTargetUnits === undefined) {
      output.newTargetUnits = 0;
    }
    if (isNaN(output.newSalePrice) || output.newSalePrice === null || output.newSalePrice === undefined) {
      output.newSalePrice = input.salePrice;
    }
    output.newTargetUnits = Math.round(output.newTargetUnits);
    output.newSalePrice = Math.round(output.newSalePrice);

    // Write-back the results to the respective DB tables
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - update models`;
    await trx('manufacturing_vehicle_models')
      .where({ id: modelId })
      .update({ sale_price: output.newSalePrice });

    if (prodLine) {
      (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - update prodLine`;
      await trx('manufacturing_production_lines')
        .where({ id: prodLine.id })
        .update({ target_units_per_month: output.newTargetUnits });
    }

    if (allocations.length > 0) {
      (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - update allocations`;
      // Spread units evenly across all markets; any remainder goes to the primary market
      const perMarket = Math.max(1, Math.floor((output.newTargetUnits) / allocations.length));
      const remainder = output.newTargetUnits - (perMarket * allocations.length);
      for (let i = 0; i < allocations.length; i++) {
        const extraUnits = i === 0 ? remainder : 0; // give remainder to primary market
        await trx('manufacturing_market_allocations')
          .where({ id: allocations[i].id })
          .update({
            marketing_tier: output.newMarketingTier,
            units_allocated: perMarket + extraUnits + (i === 0 ? inventoryInStock : 0)
          });
      }

      // B7 Market Expansion: enter new markets if sell-through is high and cap not reached
      if (output.expandMarkets && allocations.length < NPC_MAX_MARKETS) {
        (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - B7 expand markets`;
        const coveredMarketIds = new Set(allocations.map((a: any) => a.region_market_id));
        const uncoveredMarkets = await trx('manufacturing_region_markets')
          .whereNotIn('id', [...coveredMarketIds])
          .limit(2); // expand to at most 2 new markets per tick to avoid flooding
        for (const newMarket of uncoveredMarkets) {
          if (allocations.length + uncoveredMarkets.indexOf(newMarket) >= NPC_MAX_MARKETS) break;
          await trx('manufacturing_market_allocations')
            .insert({
              company_id: companyId,
              world_instance_id: allocation!.world_instance_id,
              vehicle_model_id: modelId,
              region_market_id: newMarket.id,
              units_allocated: perMarket,
              marketing_tier: output.newMarketingTier
            })
            .onConflict(['company_id', 'vehicle_model_id', 'region_market_id'])
            .ignore();
          // Seed brand awareness for the new market at a low starting value
          await trx('manufacturing_brand_awareness')
            .insert({
              company_id: companyId,
              region_market_id: newMarket.id,
              awareness: 10,
              reputation: 30
            })
            .onConflict(['company_id', 'region_market_id'])
            .ignore();
        }
      }
    }

    // Sync NPC memory
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - merge npc_state`;
    const existingState = await trx('manufacturing_npc_state')
      .where({ company_id: companyId, vehicle_model_id: modelId })
      .first();

    if (existingState) {
      await trx('manufacturing_npc_state')
        .where({ company_id: companyId, vehicle_model_id: modelId })
        .update({
          last_market_share: marketShareThisArc,
          last_units_sold: unitsSoldLastArc,
          zero_demand_streak: output.newZeroDemandStreak,
          updated_at: trx.fn.now()
        });
    } else {
      await trx('manufacturing_npc_state')
        .insert({
          company_id: companyId,
          vehicle_model_id: modelId,
          last_market_share: marketShareThisArc,
          last_units_sold: unitsSoldLastArc,
          zero_demand_streak: output.newZeroDemandStreak,
          updated_at: trx.fn.now()
        });
    }

    // Fast Facelift
    if (output.faceliftFlag) {
      const BASE_FACELIFT_COST = 90000;
      if (availableCash >= BASE_FACELIFT_COST) {
         await trx('manufacturing_vehicle_models')
           .where({ id: modelId })
           .update({ 
              created_at_world_year: currentYear, 
              created_at_world_month: currentMonth,
              updated_at: trx.fn.now()
           });
         await trx('company_finances')
           .where({ company_id: companyId })
           .decrement('available_cash', BASE_FACELIFT_COST);
         
         console.log(`[NPC Facelift] Company ${companyId} facelifted model ${modelId} for $${BASE_FACELIFT_COST}`);
      }
    }
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
        created_at_world_year: clock.current_year,
        created_at_world_month: clock.current_month,
        created_at_world_day: 0
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

  // 3. Create Company (append numeral if it's a respawn to avoid unique constraint)
  const pastCount = await trx('companies').where({ npc_personality: roster.key, country_id: countryId }).count('id as c').first();
  const numPast = parseInt(pastCount?.c as string) || 0;
  const companyName = numPast > 0 ? `${roster.name} ${numPast + 1}` : roster.name;

  const [company] = await trx('companies')
    .insert({
      owner_character_id: sysChar.id,
      world_instance_id: clock.world_instance_id,
      country_id: countryId,
      headquarters_state_id: 'drennia-drennport', // fallback
      industry_id: 'manufacturing',
      legal_structure_id: 'sole-trader',
      currency_id: 'dollar', // fallback
      name: companyName,
      status: 'active',
      is_npc: true,
      npc_personality: roster.key,
      reputation: 50,
      reliability: 50,
      created_at_world_year: clock.current_year,
      created_at_world_month: clock.current_month,
      created_at_world_day: 0
    })
    .returning('*');

  // Auto-grant HQ state license
  await trx('company_state_licenses').insert({
    company_id: company.id,
    state_id: 'drennia-drennport',
    status: 'active'
  });

  // Finances
  await trx('company_finances').insert({
    company_id: company.id,
    currency_id: 'dollar',
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
      name: `${companyName} Standard`,
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
      created_at_world_year: clock.current_year,
      created_at_world_month: clock.current_month,
      created_at_world_day: 0
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
      name: `${companyName} Primary Facility`,
      lease_cost_per_month: 25000,
      maintenance_cost_per_month: 8000,
      capacity_per_month: 500,
      status: 'active',
      created_at_world_year: clock.current_year,
      created_at_world_month: clock.current_month,
      created_at_world_day: 0
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
      target_units_per_month: roster.targetUnitsPerArc,
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
