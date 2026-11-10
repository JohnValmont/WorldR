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
  NPC_MAX_MARKETS,
  NPC_GENERATION_COST,
  NPC_GENERATION_SCORE_BUMP,
  NPC_FORECAST_CONFIDENCE,
  NPC_NEW_MARKET_WEIGHT_FRACTION,
  NPC_SOLD_OUT_MARKET_SHARE,
  NPC_ESPIONAGE_COST,
  NPC_ESPIONAGE_COOLDOWN_MONTHS,
  NPC_ESPIONAGE_MIN_PLAYER_SALES,
  NPC_ESPIONAGE_SCORE_DELTA,
  NPC_ESPIONAGE_PRICE_FACTOR,
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
  /**
   * Last month's real buyer interest for this model, summed over its markets
   * (manufacturing_sales_results.raw_buyer_interest). Optional: when absent the
   * brain plans purely from its own past sales, as before.
   */
  demandForecast?: number;
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
  
  // If there is no sales history (e.g. Month 1 from seed or facelift), reboot production!
  if (reasonCode === null) {
    newTargetUnits = input.targetUnits > 0 ? input.targetUnits : input.factoryCapacity;
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
  else if (reasonCode !== null && (marketShareThisArc < marketShareLastArc || sellRatio < 0.5)) {
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

  // B8 Rule: Demand-led floor. Planning only from our own past sales is a
  // self-fulfilling spiral: allocate 3, sell 3, plan ~3. Last month's real buyer
  // interest tells us how many people actually wanted the car, so produce at
  // least a trusted fraction of that (minus stock we already hold).
  if (reasonCode !== null && typeof input.demandForecast === 'number' && Number.isFinite(input.demandForecast) && input.demandForecast > 0) {
    const forecastTarget = Math.round(input.demandForecast * NPC_FORECAST_CONFIDENCE) - inventoryInStock;
    newTargetUnits = Math.max(newTargetUnits, forecastTarget);
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

async function ensureUniqueModelName(trx: Knex, worldInstanceId: string, baseName: string): Promise<string> {
  let candidate = baseName.trim().substring(0, 60);
  let counter = 1;
  const MAX_NAME_ATTEMPTS = 200; // safety cap — prevents infinite loop if DB has many collisions

  while (counter <= MAX_NAME_ATTEMPTS) {
    const existing = await trx('manufacturing_vehicle_models')
      .whereRaw('world_instance_id = ? AND LOWER(name) = ?', [worldInstanceId, candidate.toLowerCase()])
      .first();

    if (!existing) return candidate;

    counter++;
    const suffix = counter === 2 ? ' II' : (counter === 3 ? ' III' : (counter === 4 ? ' IV' : ` ${counter}`));
    const prefix = baseName.substring(0, 60 - suffix.length);
    candidate = `${prefix}${suffix}`;
  }

  // Fallback: UUID suffix guarantees uniqueness even after 200 collisions
  const uuid = crypto.randomUUID().substring(0, 8);
  return `${baseName.trim().substring(0, 51)} ${uuid}`;
}

async function performIndustrialEspionage(trx: Knex, companyId: string, currentYear: number, currentMonth: number, availableCash: number): Promise<number> {
  if (availableCash < NPC_ESPIONAGE_COST) return availableCash;

  // Only NPCs with a known personality copy cars, and only inside their own segment.
  const npcCompanyRow = await trx('companies').where({ id: companyId }).first();
  const roster = NPC_ROSTER.find(r => r.key === npcCompanyRow?.npc_personality || r.name === npcCompanyRow?.name);
  if (!roster) return availableCash;

  // Cooldown: at most one copy per NPC every NPC_ESPIONAGE_COOLDOWN_MONTHS.
  const lastCopy = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId })
    .whereNotNull('npc_cloned_from_model_id')
    .orderBy([{ column: 'created_at_world_year', order: 'desc' }, { column: 'created_at_world_month', order: 'desc' }])
    .first();
  if (lastCopy && modelAgeInMonths(lastCopy.created_at_world_year, lastCopy.created_at_world_month, currentYear, currentMonth) < NPC_ESPIONAGE_COOLDOWN_MONTHS) {
    return availableCash;
  }

  // Ensure NPC has at least one active model to replace
  const modelsCount = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' })
    .count('* as count');
  if (Number(modelsCount[0].count) < 1) return availableCash;

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
    .whereRaw('LOWER(m.target_segment) = LOWER(?)', [roster.segment])
    .select('m.*', 'c.name as player_company_name')
    .sum('r.units_sold as total_sold')
    .groupBy('m.id', 'c.name', 'c.is_npc')
    .orderByRaw('SUM(r.units_sold) DESC')
    .first();

  if (!topPlayerModel || Number(topPlayerModel.total_sold) < NPC_ESPIONAGE_MIN_PLAYER_SALES) return availableCash;

  // Deduct cash
  availableCash -= NPC_ESPIONAGE_COST;
  await trx('company_finances').where({ company_id: companyId }).update({ available_cash: availableCash });

  const npcCompany = npcCompanyRow;

  const PREFIXES = ['Aurora', 'Nebula', 'Zenith', 'Apex', 'Vortex', 'Stratos', 'Nova', 'Pinnacle', 'Quantum', 'Eon'];
  const SUFFIXES = ['GT', 'Rival', 'Prime', 'X', 'Vanguard', 'Strider', 'Pulse', 'Dominator', 'Interceptor'];
  const randomPrefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const randomSuffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const rawModelName = `${npcCompany.name} ${randomPrefix} ${randomSuffix}`;
  const newModelName = await ensureUniqueModelName(trx, instance.id, rawModelName);

  const newModelId = crypto.randomUUID();
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
    reliability_score: Math.max(1, Math.min(100, Number(topPlayerModel.reliability_score) + NPC_ESPIONAGE_SCORE_DELTA)),
    performance_score: Math.max(1, Math.min(100, Number(topPlayerModel.performance_score) + NPC_ESPIONAGE_SCORE_DELTA)),
    fuel_efficiency_score: Math.max(1, Math.min(100, Number(topPlayerModel.fuel_efficiency_score) + NPC_ESPIONAGE_SCORE_DELTA)),
    appeal_score: Math.max(1, Math.min(100, Number(topPlayerModel.appeal_score) + NPC_ESPIONAGE_SCORE_DELTA)),
    safety_score: Math.max(1, Math.min(100, Number(topPlayerModel.safety_score) + NPC_ESPIONAGE_SCORE_DELTA)),
    cargo_score: Math.max(1, Math.min(100, Number(topPlayerModel.cargo_score) + NPC_ESPIONAGE_SCORE_DELTA)),
    manufacturing_cost_per_unit: topPlayerModel.manufacturing_cost_per_unit,
    sale_price: Math.max(1, Math.floor(Number(topPlayerModel.sale_price) * NPC_ESPIONAGE_PRICE_FACTOR)),
    npc_cloned_from_model_id: topPlayerModel.id,
    development_status: 'launched',
    status: 'active',
    launched_year: currentYear,
    launched_month: currentMonth,
    created_at_world_year: currentYear,
    created_at_world_month: currentMonth,
    created_at_world_day: 1,
    created_at: new Date(),
    updated_at: new Date()
  };

  await trx('manufacturing_vehicle_models').insert(newModel);
  console.log(`[NPC Espionage] ${npcCompany.name} cloned ${topPlayerModel.name} into ${newModelName}`);

  // Find worst performing model to replace (never the copy we just made)
  const worstModel = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' })
    .whereNot({ id: newModelId })
    .orderBy('appeal_score', 'asc')
    .first();

  if (worstModel) {
    // Transfer production lines
    await trx('manufacturing_production_lines')
      .where({ company_id: companyId, assigned_vehicle_model_id: worstModel.id })
      .update({ assigned_vehicle_model_id: newModelId, updated_at: new Date() });
      
    // Copy allocations
    const allocations = await trx('manufacturing_market_allocations')
      .where({ company_id: companyId, vehicle_model_id: worstModel.id });
      
    for (const alloc of allocations) {
      const { id, ...allocWithoutId } = alloc;
      const newAlloc = { ...allocWithoutId, id: crypto.randomUUID(), vehicle_model_id: newModelId };
      await trx('manufacturing_market_allocations').insert(newAlloc);
    }
    
    // Discontinue old model & zero out its market allocations to prevent ghost demand
    await trx('manufacturing_vehicle_models')
      .where({ id: worstModel.id })
      .update({ 
        status: 'discontinued', 
        development_status: 'discontinued',
        discontinued_year: currentYear, 
        discontinued_month: currentMonth, 
        updated_at: new Date() 
      });

    await trx('manufacturing_market_allocations')
      .where({ company_id: companyId, vehicle_model_id: worstModel.id })
      .update({ units_allocated: 0, updated_at: new Date() });
  }

  return availableCash;
}

// ── Pure helpers (exported for tests) ──────────────────────────────────────

/** Full model age in months, across year boundaries. */
export function modelAgeInMonths(createdYear: number, createdMonth: number, currentYear: number, currentMonth: number): number {
  const y = Number(createdYear), m = Number(createdMonth);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 0;
  return Math.max(0, (currentYear - y) * 12 + (currentMonth - m));
}

/**
 * One verdict for a model sold in several markets. Previously only the first
 * market's reason code was used, so one market could hide what the rest did.
 */
export function aggregateReasonCode(rows: { main_reason_code: string | null; units_sold: number }[]): string | null {
  if (!rows || rows.length === 0) return null;
  const totalSold = rows.reduce((s, r) => s + (Number(r.units_sold) || 0), 0);
  if (totalSold === 0) return 'Zero Demand';
  const soldOut = rows.filter(r => r.main_reason_code === 'Sold Out').length;
  if (soldOut / rows.length >= NPC_SOLD_OUT_MARKET_SHARE) return 'Sold Out';
  const firstOther = rows.find(r => r.main_reason_code && r.main_reason_code !== 'Sold Out');
  return firstOther ? firstOther.main_reason_code : rows[0].main_reason_code;
}

/**
 * Split `total` whole units across markets in proportion to `weights`
 * (largest-remainder rounding, so the parts always add up to `total`).
 * Markets without a weight (no history yet) get a modest share.
 */
export function splitUnitsByWeight(total: number, weights: (number | null | undefined)[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const units = Math.max(0, Math.floor(total));
  const known = weights.filter((w): w is number => typeof w === 'number' && Number.isFinite(w) && w > 0);
  const fallback = known.length > 0 ? Math.min(...known) * NPC_NEW_MARKET_WEIGHT_FRACTION : 1;
  const w = weights.map(x => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : fallback));
  const sum = w.reduce((a, b) => a + b, 0);
  const exact = w.map(x => (units * x) / sum);
  const parts = exact.map(Math.floor);
  let left = units - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && left > 0; k++, left--) parts[order[k].i] += 1;
  return parts;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

/**
 * "Falcon" -> "Falcon II" -> ... -> "Falcon V" -> "Falcon VI".
 * The old logic turned "IV" into "V" and then appended " II" again, producing
 * names like "Vortex Vanguard V V V V V V III". Stacked trailing numerals are
 * collapsed first so already-broken names heal on their next generation.
 */
export function nextGenerationName(name: string): string {
  const tokens = name.trim().split(/\s+/);
  let generation = 1;
  while (tokens.length > 1 && ROMAN.includes(tokens[tokens.length - 1])) {
    generation = Math.max(generation, ROMAN.indexOf(tokens.pop() as string) + 1);
  }
  const next = Math.min(generation + 1, ROMAN.length);
  return `${tokens.join(' ')} ${ROMAN[next - 1]}`;
}


/**
 * Generational upgrade: once an NPC model reaches MODEL_AGE_FACELIFT months it is
 * replaced by its next generation (better scores, SAME build cost), and its
 * production lines, market allocations and unsold stock move to the successor.
 *
 * Replaces the old loop that launched a new variant every 2 months with +5%
 * build cost each time — compounding over decades it pushed NPC prices to
 * ~30x launch price and emptied the car market.
 */
async function applyNpcGenerationalUpgrade(trx: Knex, companyId: string, currentYear: number, currentMonth: number, availableCash: number): Promise<number> {
  if (availableCash < NPC_GENERATION_COST) return availableCash;

  const models = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' });

  for (const model of models) {
    const ageMonths = modelAgeInMonths(
      model.launched_year ?? model.created_at_world_year,
      model.launched_month ?? model.created_at_world_month,
      currentYear,
      currentMonth,
    );
    if (ageMonths < MODEL_AGE_FACELIFT) continue;

    const newModelId = crypto.randomUUID();
    const newModelName = await ensureUniqueModelName(trx, model.world_instance_id, nextGenerationName(model.name));

    await trx('manufacturing_vehicle_models').insert({
      ...model,
      id: newModelId,
      name: newModelName,
      reliability_score: Math.min(100, Number(model.reliability_score) + NPC_GENERATION_SCORE_BUMP),
      performance_score: Math.min(100, Number(model.performance_score) + NPC_GENERATION_SCORE_BUMP),
      appeal_score: Math.min(100, Number(model.appeal_score) + NPC_GENERATION_SCORE_BUMP),
      launched_year: currentYear,
      launched_month: currentMonth,
      created_at_world_year: currentYear,
      created_at_world_month: currentMonth,
      created_at: new Date(),
      updated_at: new Date(),
      // Build cost deliberately unchanged between generations.
      manufacturing_cost_per_unit: model.manufacturing_cost_per_unit,
      facelift_source_model_id: model.id,
      // A new generation is the NPC's own car now; the espionage cooldown is
      // measured from the original copy (still on record as discontinued).
      npc_cloned_from_model_id: null,
    });

    await trx('manufacturing_production_lines')
      .where({ company_id: companyId, assigned_vehicle_model_id: model.id })
      .update({ assigned_vehicle_model_id: newModelId, updated_at: new Date() });

    const allocations = await trx('manufacturing_market_allocations')
      .where({ company_id: companyId, vehicle_model_id: model.id });
    for (const alloc of allocations) {
      const { id, ...rest } = alloc;
      await trx('manufacturing_market_allocations').insert({ ...rest, id: crypto.randomUUID(), vehicle_model_id: newModelId });
    }

    // Unsold cars carry over to the successor instead of being stranded forever.
    await trx('manufacturing_inventory')
      .where({ company_id: companyId, vehicle_model_id: model.id })
      .update({ vehicle_model_id: newModelId, updated_at: new Date() });

    await trx('manufacturing_vehicle_models')
      .where({ id: model.id })
      .update({
        status: 'discontinued',
        development_status: 'discontinued',
        discontinued_year: currentYear,
        discontinued_month: currentMonth,
        updated_at: new Date(),
      });
    await trx('manufacturing_market_allocations')
      .where({ company_id: companyId, vehicle_model_id: model.id })
      .update({ units_allocated: 0, updated_at: new Date() });

    availableCash -= NPC_GENERATION_COST;
    await trx('company_finances')
      .where({ company_id: companyId })
      .update({ available_cash: availableCash, updated_at: new Date() });

    break; // at most one new generation per company per month
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

  // Generational upgrade once a model reaches MODEL_AGE_FACELIFT months
  availableCash = await applyNpcGenerationalUpgrade(trx, companyId, currentYear, currentMonth, availableCash);

  // 2. Fetch all launched, active models for the NPC company
  const models = await trx('manufacturing_vehicle_models')
    .where({ company_id: companyId, development_status: 'launched', status: 'active' });

  for (const model of models) {
    const modelId = model.id;
    (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} Start`;

    const salePrice = parseFloat(model.sale_price);
    const costPerUnit = parseFloat(model.manufacturing_cost_per_unit);
    // Age of the model since it was introduced to the market (across years —
    // the old month-only subtraction meant the 36-month rule could never fire)
    const modelAgeMonths = modelAgeInMonths(model.created_at_world_year, model.created_at_world_month, currentYear, currentMonth);

    // Get current active production line and factory constraints
    const prodLine = await trx('manufacturing_production_lines')
      .where({ company_id: companyId, assigned_vehicle_model_id: modelId })
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
      prevMonth = 12; // December of the previous year
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
    const unitsSoldLastArc = lastSales.length > 0 ? lastSales.reduce((acc: number, s: any) => acc + Number(s.units_sold || 0), 0) : 0;
    // One verdict across ALL markets (was: whatever the first market said)
    const reasonCode = aggregateReasonCode(lastSales);
    // Real buyer interest per market last month — drives production and where stock goes
    const interestByMarket = new Map<string, number>();
    for (const row of lastSales) {
      interestByMarket.set(row.region_market_id, (interestByMarket.get(row.region_market_id) || 0) + (Number(row.raw_buyer_interest) || 0));
    }
    const demandForecast = [...interestByMarket.values()].reduce((a, b) => a + b, 0);

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

    if (lastSales.length === 0) {
      // First month for this model, proceed with reasonCode = null to trigger reboot logic
    }
    let prevPrevYear = prevYear;
    let prevPrevMonth = prevMonth - 1;
    if (prevPrevMonth === 0) {
      prevPrevMonth = 12; // December of the prior year
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
      inventoryInStock,
      demandForecast,
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
    console.log('[NPC_DEBUG]', JSON.stringify({ companyId, modelId, reasonCode, input, output }, null, 2));

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
        .update({ 
          target_units_per_month: output.newTargetUnits,
          status: output.newTargetUnits > 0 ? 'active' : 'idle'
        });
    }

    if (allocations.length > 0) {
      (global as any).tickProgress = `Processing country: ... - Step 2: Decide (NPCs) - Company ${companyId} Model ${modelId} - update allocations`;
      // Send new production AND unsold stock where the buyers are, in proportion
      // to each market's real buyer interest last month. (Previously production
      // was split evenly regardless of market size and all stock was dumped on
      // the first market — big markets starved while small ones overflowed.)
      const split = splitUnitsByWeight(
        output.newTargetUnits + Number(inventoryInStock || 0),
        allocations.map((a: any) => interestByMarket.get(a.region_market_id)),
      );
      for (let i = 0; i < allocations.length; i++) {
        await trx('manufacturing_market_allocations')
          .where({ id: allocations[i].id })
          .update({
            marketing_tier: output.newMarketingTier,
            units_allocated: Math.max(0, split[i])
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
              // Start with 0 allocation this month since production was already fully divided
              units_allocated: 0,
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

  // 3. Create Company — always use the canonical roster name.
  // Bankrupt NPCs are renamed to [DISSOLVED] <name> before respawn, so
  // there is no unique-constraint collision and we never need a numbered suffix.
  const companyName = roster.name;

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

  // Auto-list on exchange
  await trx('companies').where({ id: company.id }).update({ is_exchange_listed: true });

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
  const rawModelName = `${companyName} Standard`;
  const modelName = await ensureUniqueModelName(trx, clock.world_instance_id, rawModelName);

  const [model] = await trx('manufacturing_vehicle_models')
    .insert({
      company_id: company.id,
      world_instance_id: clock.world_instance_id,
      name: modelName,
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

  // Seed initial share price history so the exchange can show the company immediately
  const seedPrice = Math.max(1, Math.round((roster.seedCapital / 1000000) * 100) / 100);
  await trx('share_price_history').insert({
    company_id: company.id,
    game_year: clock.current_year,
    game_month: clock.current_month,
    open_price: seedPrice,
    high_price: seedPrice,
    low_price: seedPrice,
    close_price: seedPrice,
    volume_shares: 0,
    market_cap: seedPrice * 1_000_000,
    eps: 0
  }).onConflict().ignore();

  // Seed the System NPC's initial 1,000,000-share holding so the cap-table
  // denominator is correct from the first trade. Without this row the percentage
  // math breaks: player shares appear > 100% because the NPC's float is invisible.
  await trx('company_shares').insert({
    company_id: company.id,
    holder_character_id: sysChar.id,
    shares: 1_000_000,
    avg_cost_basis: seedPrice,
  }).onConflict().ignore();
}
