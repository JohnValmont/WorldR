/**
 * Vehicle design — the single source of truth for turning a design (choices
 * the player makes in the Car Designer) into engineering scores, unit cost,
 * development cost/time and a demand forecast.
 *
 * Used by BOTH:
 *   - POST /companies/:id/manufacturing/models          (create, charges money)
 *   - POST /companies/:id/manufacturing/models/preview  (free, live preview)
 * so what a player previews is exactly what they get.
 */
import { AppError } from '../../utils/errors';
import {
  VEHICLE_CLASSES, PLATFORMS, POWER_UNITS, DRIVETRAINS, INTERIOR_TIERS, SAFETY_TIERS, QUALITY_TARGETS,
  DEFAULT_ENGINEERING_PRIORITIES, BUDGET_BUCKETS,
} from '../constants/manufacturing';
import { calculateEngineeringOutcome, EngineeringDesign, EngineerContext } from '../constants/engineeringEngine';
import { MARKET_SEGMENTS } from '../constants/marketSegments';
import { MARKETING_DEMAND_MULT } from '../constants/marketing';
import { ManufacturingController } from '../controllers/manufacturing.controller';

export interface DesignInput {
  vehicleClass: string;
  platform: string;
  powerUnit: string;
  drivetrain: string;
  interiorTier: string;
  safetyTier: string;
  qualityTarget: string;
  salePrice?: number;
  targetSegment?: string;
  appliedEngineeringPackage?: string;
  engineeringPriorities?: Record<string, number>;
  budgetAllocation?: Record<string, number>;
}

/** Map build quality to one of the demand engine's real segment ids (budget/family/luxury...). */
function defaultSegmentFor(qualityTarget: string): string {
  if (qualityTarget === 'budget') return 'budget';
  if (qualityTarget === 'premium') return 'luxury';
  return 'family';
}

/** Throws AppError(400) for anything the engine can't safely evaluate. */
export function validateDesignInput(body: any): DesignInput {
  const { vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget } = body ?? {};
  if (!vehicleClass || !platform || !powerUnit || !drivetrain || !interiorTier || !safetyTier || !qualityTarget) {
    throw new AppError('All design choices are required', 400, 'BAD_REQUEST');
  }
  if (!VEHICLE_CLASSES.includes(vehicleClass)) throw new AppError('Invalid vehicle class', 400, 'BAD_REQUEST');
  const known = (list: { id: string; locked?: boolean }[], id: string, what: string) => {
    const opt = list.find(o => o.id === id);
    if (!opt) throw new AppError(`Invalid ${what}`, 400, 'BAD_REQUEST');
    if (opt.locked) throw new AppError(`${what} is not available yet`, 400, 'LOCKED_OPTION');
  };
  known(PLATFORMS, platform, 'platform');
  known(POWER_UNITS, powerUnit, 'power unit');
  known(DRIVETRAINS, drivetrain, 'drivetrain');
  known(INTERIOR_TIERS, interiorTier, 'interior');
  known(SAFETY_TIERS, safetyTier, 'safety tier');
  known(QUALITY_TARGETS, qualityTarget, 'build quality');

  const priorities: Record<string, number> = body.engineeringPriorities ?? DEFAULT_ENGINEERING_PRIORITIES;
  let sum = 0;
  for (const val of Object.values(priorities)) {
    if (typeof val !== 'number' || val < 0) throw new AppError('Engineering priorities must be positive numbers', 400, 'INVALID_PRIORITIES');
    sum += val;
  }
  if (Math.abs(sum - 100) > 2) throw new AppError(`Engineering priorities must sum to 100 (got ${sum})`, 400, 'INVALID_PRIORITIES');

  if (body.targetSegment && !MARKET_SEGMENTS[String(body.targetSegment).toLowerCase()]) {
    throw new AppError('Invalid target buyers', 400, 'BAD_REQUEST');
  }

  return {
    vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget,
    salePrice: body.salePrice !== undefined ? Number(body.salePrice) : undefined,
    targetSegment: body.targetSegment ? String(body.targetSegment).toLowerCase() : undefined,
    appliedEngineeringPackage: body.appliedEngineeringPackage || undefined,
    engineeringPriorities: priorities,
    budgetAllocation: body.budgetAllocation,
  };
}

/** Runs the real engineering engine and cost model for a design. No writes. */
export async function computeVehicleDesign(trx: any, companyId: string, autoConfig: any, input: DesignInput) {
  const clock = await trx('world_clock').first();
  const currentYear = clock?.current_year ?? 1;
  const currentMonth = clock?.current_month || 1;

  const engineerStaff = await trx('company_staff').where({ company_id: companyId, role: 'automotive-engineer' }).first();
  const engineerCount = engineerStaff?.quantity || 0;

  const knowledgeRows = await trx('manufacturing_company_knowledge').where({ company_id: companyId });
  const companyKnowledge: Record<string, number> = {};
  for (const row of knowledgeRows) companyKnowledge[row.domain] = row.xp_points;

  const BASE_DEV_COST = Number(autoConfig?.base_vehicle_dev_cost ?? 150000);

  const budgetAlloc: Record<string, number> = { ...(input.budgetAllocation ?? {}) };
  if (Object.keys(budgetAlloc).length === 0) {
    for (const bucket of BUDGET_BUCKETS) budgetAlloc[bucket.id] = Math.round(BASE_DEV_COST * bucket.defaultPct);
  } else {
    for (const val of Object.values(budgetAlloc)) {
      if (typeof val !== 'number' || val < 0) throw new AppError('Budget allocations must be positive numbers', 400, 'INVALID_BUDGET');
    }
  }

  const engineeringPriorities = input.engineeringPriorities ?? DEFAULT_ENGINEERING_PRIORITIES;
  const engineDesign: EngineeringDesign = {
    vehicleClass: input.vehicleClass,
    platform: input.platform,
    powerUnit: input.powerUnit,
    drivetrain: input.drivetrain,
    interiorTier: input.interiorTier,
    safetyTier: input.safetyTier,
    qualityTarget: input.qualityTarget,
    priorities: engineeringPriorities,
    budgetAlloc,
    totalBudget: BASE_DEV_COST,
    appliedEngineeringPackage: input.appliedEngineeringPackage,
  };
  const engContext: EngineerContext = {
    engineerCount,
    engineerSkillLevel: Math.min(Math.floor(engineerCount / 2), 5),
    companyKnowledge,
    currentMonth,
    currentYear,
  };
  const outcome = calculateEngineeringOutcome(engineDesign, engContext);

  const platDef = PLATFORMS.find(p => p.id === input.platform);
  const pwrDef = POWER_UNITS.find(p => p.id === input.powerUnit);
  const drvDef = DRIVETRAINS.find(p => p.id === input.drivetrain);
  const intDef = INTERIOR_TIERS.find(p => p.id === input.interiorTier);
  const safDef = SAFETY_TIERS.find(p => p.id === input.safetyTier);
  const qualDef = QUALITY_TARGETS.find(p => p.id === input.qualityTarget);
  const rawCost = ((platDef?.baseCost ?? 12000) + (pwrDef?.baseCost ?? 2500) + (drvDef?.baseCost ?? 0) + (intDef?.baseCost ?? 0) + (safDef?.baseCost ?? 0)) * (qualDef?.costMultiplier ?? 1.0);
  const manufacturingCostPerUnit = Math.round(rawCost * outcome.productionCostMultiplier);

  const finalSalePrice = input.salePrice && input.salePrice > 0 ? input.salePrice : Math.round(manufacturingCostPerUnit * 1.5);
  const finalSegment = input.targetSegment || defaultSegmentFor(input.qualityTarget);

  return {
    outcome, engineDesign, engineeringPriorities, budgetAlloc, engineerCount,
    manufacturingCostPerUnit, finalSalePrice, finalSegment,
    clock: { currentYear, currentMonth, currentDay: clock?.current_day || 1 },
  };
}

export interface DesignForecastMarket {
  marketId: string;
  name: string;
  marketBuyersPerMonth: number;   // total car buyers in this region per month
  interestedBuyers: number;       // buyers who would consider THIS car (before competitors take their share)
}

/**
 * Demand forecast for a design using the real (locked) demand engine.
 * Each region is evaluated with this car alone, i.e. "how many buyers would
 * consider this car" — competitors then take their share, so real sales are lower.
 */
export async function forecastDesignDemand(
  trx: any,
  company: { id: string; country_id: string; world_instance_id: string },
  design: { scores: Record<string, number>; salePrice: number; segment: string; marketingTier?: string },
): Promise<{ markets: DesignForecastMarket[]; totalInterested: number; totalMarketBuyers: number }> {
  const markets = await trx('manufacturing_region_markets')
    .where({ country_id: company.country_id, status: 'active' });
  if (markets.length === 0) return { markets: [], totalInterested: 0, totalMarketBuyers: 0 };

  const clock = await trx('world_clock').first();
  const year = clock?.current_year ?? 1;
  const month = clock?.current_month ?? 1;

  const brandRows = await trx('manufacturing_brand_awareness').where({ company_id: company.id });
  const brandMap = new Map<string, { awareness: number; reputation: number }>();
  for (const b of brandRows) brandMap.set(`${company.id}_${b.region_market_id}`, { awareness: Number(b.awareness), reputation: Number(b.reputation) });

  const tier = design.marketingTier && MARKETING_DEMAND_MULT[design.marketingTier] !== undefined ? design.marketingTier : 'none';
  const allocations = markets.map((m: any) => ({
    ...m,
    region_market_id: m.id,
    company_id: company.id,
    vehicle_model_id: `preview-${m.id}`,
    sale_price: design.salePrice,
    reliability_score: design.scores.reliability,
    performance_score: design.scores.performance,
    fuel_efficiency_score: design.scores.fuelEfficiency,
    appeal_score: design.scores.appeal,
    cargo_score: design.scores.cargo,
    safety_score: design.scores.safety,
    target_segment: design.segment,
    units_allocated: 1_000_000_000, // uncapped: we want interest, not stock-limited sales
    marketing_tier: tier,
    launched_year: year,
    launched_month: month,
  }));

  const results = ManufacturingController.simulateSalesDemand(allocations, brandMap, MARKETING_DEMAND_MULT, new Map(), year, month);
  const out: DesignForecastMarket[] = results.map((r: any) => ({
    marketId: r.alloc.region_market_id,
    name: r.alloc.name,
    marketBuyersPerMonth: Math.round(Number(r.marketPurchaseCapacity) || 0),
    interestedBuyers: Math.round(Number(r.rawBuyerInterest) || 0),
  })).sort((a: DesignForecastMarket, b: DesignForecastMarket) => b.interestedBuyers - a.interestedBuyers);

  return {
    markets: out,
    totalInterested: out.reduce((s, m) => s + m.interestedBuyers, 0),
    totalMarketBuyers: out.reduce((s, m) => s + m.marketBuyersPerMonth, 0),
  };
}
