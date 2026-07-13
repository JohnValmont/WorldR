import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { MARKETING, awarenessGain } from '../constants/marketing';
import { formatGameDate } from '../utils/calendar';
import { AppError } from '../../utils/errors';
import {
  VEHICLE_CLASSES,
  PLATFORMS,
  POWER_UNITS,
  DRIVETRAINS,
  INTERIOR_TIERS,
  SAFETY_TIERS,
  QUALITY_TARGETS,
  STAFF_ROLES,
  QUALITY_DEFECT_RATES,
  ENGINEERING_PROGRAMMES_CATALOG,
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_LEVEL_XP,
  DEFAULT_ENGINEERING_PRIORITIES,
  BUDGET_BUCKETS,
  calcKnowledgeXp,
} from '../constants/manufacturing';
import {
  calculateEngineeringOutcome,
  EngineeringDesign,
  EngineerContext,
  deriveProductionModifiers,
  deriveMarketModifiers,
  deriveWarrantyReserve,
  deriveTrustModifiers,
  evaluatePrototypeValidation,
  applyKnowledgeBonuses,
  applyEngineeringCulture,
  calculateEngineeringAssessment,
  calculateBalanceRating,
} from '../constants/engineeringEngine';
import { MARKET_SEGMENTS } from '../constants/marketSegments';
import { runNpcBrainForCompany } from '../services/npcBrain.service';
import { processPoliticalArc, worldClockToArc } from '../services/politics.service';

// ── Score Calculation (Original formulas) ─────────────────────────────────────
function calculateDesignScores(design: {
  vehicleClass: string;
  platform: string;
  powerUnit: string;
  drivetrain: string;
  interiorTier: string;
  safetyTier: string;
  qualityTarget: string;
}) {
  const { vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget } = design;

  // Retrieve definitions
  const platDef = PLATFORMS.find(p => p.id === platform);
  const pwrDef = POWER_UNITS.find(p => p.id === powerUnit);
  const drvDef = DRIVETRAINS.find(p => p.id === drivetrain);
  const intDef = INTERIOR_TIERS.find(p => p.id === interiorTier);
  const safDef = SAFETY_TIERS.find(p => p.id === safetyTier);
  const qualDef = QUALITY_TARGETS.find(p => p.id === qualityTarget);

  // === Manufacturing Cost Per Unit ===
  let baseCost = platDef?.baseCost ?? 12000;
  const engineCost = pwrDef?.baseCost ?? 2500;
  const drivetrainCost = drvDef?.baseCost ?? 0;
  const interiorCost = intDef?.baseCost ?? 0;
  const safetyCost = safDef?.baseCost ?? 0;
  const qualityMultiplier = qualDef?.costMultiplier ?? 1.0;

  const manufacturingCostPerUnit = Math.round(
    (baseCost + engineCost + drivetrainCost + interiorCost + safetyCost) * qualityMultiplier
  );

  // === Reliability Score (0-100) ===
  let reliability = 50 + (safDef?.reliabilityMod ?? 0) + (qualDef?.reliabilityMod ?? 0) + (platDef?.reliabilityMod ?? 0) + (pwrDef?.reliabilityMod ?? 0);
  reliability = Math.min(100, Math.max(10, reliability));

  // === Performance Score (0-100) ===
  let performance = 40 + (pwrDef?.performanceMod ?? 0) + (drvDef?.performanceMod ?? 0) + (platDef?.performanceMod ?? 0);
  if (vehicleClass === 'Compact Car') performance += 5;
  performance = Math.min(100, Math.max(10, performance));

  // === Fuel Efficiency Score (0-100) ===
  let fuelEfficiency = 60 + (pwrDef?.fuelMod ?? 0) + (drvDef?.fuelMod ?? 0) + (platDef?.fuelMod ?? 0);
  if (vehicleClass === 'Compact Car') fuelEfficiency += 8;
  if (vehicleClass === 'Utility Van') fuelEfficiency -= 10;
  fuelEfficiency = Math.min(100, Math.max(10, fuelEfficiency));

  // === Appeal Score (0-100) ===
  let appeal = 45 + (intDef?.appealMod ?? 0) + (safDef?.appealMod ?? 0) + (platDef?.appealMod ?? 0) + (qualDef?.appealMod ?? 0);
  if (vehicleClass === 'Sedan') appeal += 8;
  appeal = Math.min(100, Math.max(10, appeal));

  // === Cargo Score (0-100) ===
  let cargo = 30 + (platDef?.cargoMod ?? 0) + (drvDef?.cargoMod ?? 0);
  if (vehicleClass === 'Utility Van') cargo += 35;
  if (vehicleClass === 'Compact Car') cargo -= 10;
  cargo = Math.min(100, Math.max(5, cargo));

  // === Safety Score (0-100) ===
  let safety = 50 + (safDef?.safetyMod ?? 0) + (platDef?.safetyMod ?? 0);
  safety = Math.min(100, Math.max(10, safety));

  return {
    manufacturingCostPerUnit,
    reliabilityScore: reliability,
    performanceScore: performance,
    fuelEfficiencyScore: fuelEfficiency,
    appealScore: appeal,
    cargoScore: cargo,
    safetyScore: safety,
  };
}


// ── Helper: Verify ownership + load country config ────────────────────────────
export async function verifyManufacturingCompany(trx: any, userId: number | string, companyId: string) {
  const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
  if (!character) throw new AppError('No active character found', 404, 'NOT_FOUND');

  const company = await trx('companies')
    .where({ id: companyId, owner_character_id: character.id })
    .first();
  if (!company) throw new AppError('Company not found or unauthorized', 404, 'NOT_FOUND');
  if (company.industry_id !== 'manufacturing') {
    throw new AppError('This company is not a Manufacturing company', 400, 'WRONG_INDUSTRY');
  }

  // Load currency symbol for this company's country
  const currency = await trx('currencies').where({ id: company.currency_id }).first();
  const currencySymbol: string = currency?.symbol ?? '?';

  // Load country automobile configuration (fallback to safe defaults if missing)
  const autoConfig = await trx('manufacturing_country_auto_config')
    .where({ country_id: company.country_id }).first() ?? {};

  return { character, company, currencySymbol, autoConfig };
}

// ── Controller ────────────────────────────────────────────────────────────────

export interface ParticipantState {
  company: any;
  runningCash: number;
  totalProductionCosts: number;
  totalDefectiveUnits: number;
  totalPlannedUnits: number;
  totalUnitsProduced: number;
  totalStaffWages: number;
  actualWagesPaid: number;
  totalLeaseCosts: number;
  totalMaintenanceCosts: number;
  totalStorageCosts: number;
  totalWarrantyReserveCost: number;
  modelTracking: Map<string, any>;
  activeMarketCount: number;
  approvedResearchNames: string[];
  approvedStandards: any[];       // all approved engineering programme rows
  marketStatsMap: Map<string, any>;
  staff: any[];
}

export class ManufacturingController {

  public static async addCompanyKnowledge(trx: any, companyId: string, domain: string, amt: number) {
    await trx.raw(`
      INSERT INTO manufacturing_company_knowledge (world_instance_id, company_id, domain, xp_points)
      SELECT world_instance_id, ?, ?, ? FROM companies WHERE id = ?
      ON CONFLICT (company_id, domain) DO UPDATE SET xp_points = manufacturing_company_knowledge.xp_points + ?
    `, [companyId, domain, amt, companyId, amt]);
  }


  // GET /manufacturing/bootstrap
  public static async getBootstrap(req: Request, res: Response, next: NextFunction) {
    try {
      const subsectors = await db('manufacturing_subsectors').where({ status: 'active' });
      const factoryTypes = await db('manufacturing_factory_types');

      res.status(200).json({
        subsectors,
        factoryTypes,
        vehicleClasses: VEHICLE_CLASSES.map(v => ({ id: v, label: v })),
        platforms: PLATFORMS,
        powerUnits: POWER_UNITS,
        drivetrains: DRIVETRAINS,
        interiorTiers: INTERIOR_TIERS,
        safetyTiers: SAFETY_TIERS,
        qualityTargets: QUALITY_TARGETS,
        staffRoles: STAFF_ROLES,
        engineeringProgrammes: ENGINEERING_PROGRAMMES_CATALOG,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /companies/:companyId/manufacturing/data
  public static async getCompanyManufacturingData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      if (!userId || !companyId) return next(new AppError('Missing or invalid fields: userId, companyId', 400, 'BAD_REQUEST'));

      const { company } = await verifyManufacturingCompany(db, userId, companyId);

      const factories = await db('manufacturing_factories')
        .join('manufacturing_factory_types', 'manufacturing_factories.factory_type_id', 'manufacturing_factory_types.id')
        .where('manufacturing_factories.company_id', companyId)
        .where('manufacturing_factories.status', 'active')
        .select(
          'manufacturing_factories.*',
          'manufacturing_factory_types.name as type_name',
          'manufacturing_factory_types.max_production_lines',
          'manufacturing_factory_types.worker_requirement'
        );

      const productionLines = factories.length > 0
        ? await db('manufacturing_production_lines')
            .leftJoin('manufacturing_vehicle_models', 'manufacturing_production_lines.assigned_vehicle_model_id', 'manufacturing_vehicle_models.id')
            .where('manufacturing_production_lines.company_id', companyId)
            .select(
              'manufacturing_production_lines.*',
              'manufacturing_vehicle_models.name as model_name',
              'manufacturing_vehicle_models.vehicle_class as model_class',
              'manufacturing_vehicle_models.sale_price as model_sale_price',
              'manufacturing_vehicle_models.manufacturing_cost_per_unit as model_cost_per_unit'
            )
        : [];

      // Include all lifecycle states (launched, in_development, ready_to_launch, discontinued)
      // Never delete models — lifecycle states drive visibility
      const models = await db('manufacturing_vehicle_models')
        .where({ company_id: companyId })
        .whereNot({ status: 'deleted' })
        .orderBy('created_at', 'desc');

      const modelSnapshots = await db('manufacturing_model_snapshots')
        .where({ company_id: companyId })
        .orderBy('world_year', 'desc')
        .orderBy('world_month', 'desc');

      const inventory = await db('manufacturing_inventory')
        .join('manufacturing_vehicle_models', 'manufacturing_inventory.vehicle_model_id', 'manufacturing_vehicle_models.id')
        .where('manufacturing_inventory.company_id', companyId)
        .select(
          'manufacturing_inventory.*',
          'manufacturing_vehicle_models.name as model_name',
          'manufacturing_vehicle_models.vehicle_class',
          'manufacturing_vehicle_models.sale_price'
        );

      const latestReport = await db('manufacturing_arc_reports')
        .where({ company_id: companyId })
        .orderBy('world_year', 'desc')
        .orderBy('world_month', 'desc')
        .first();

      const allReports = await db('manufacturing_arc_reports')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(20);

      const brandResults = await db('manufacturing_market_brand_arc_results')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(100);

      const staff = await db('company_staff').where({ company_id: companyId });

      const ledger = await db('company_ledger')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(100);

      const records = await db('company_records')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(100);

      const finances = await db('company_finances').where({ company_id: companyId }).first();

      const programmes = await db('manufacturing_engineering_programmes')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc');

      // Get home state market
      const homeMarket = await db('manufacturing_region_markets')
        .join('states', 'manufacturing_region_markets.state_id', 'states.id')
        .where({ 'manufacturing_region_markets.state_id': company.headquarters_state_id, 'manufacturing_region_markets.status': 'active' })
        .select('manufacturing_region_markets.*', 'states.name as state_name')
        .first();

      const allMarkets = await db('manufacturing_region_markets')
        .join('states', 'manufacturing_region_markets.state_id', 'states.id')
        .where({ 'manufacturing_region_markets.country_id': company.country_id, 'manufacturing_region_markets.status': 'active' })
        .select('manufacturing_region_markets.*', 'states.name as state_name');

      // Load states for this country (for frontend display)
      const statesForCountry = await db('states')
        .where({ country_id: company.country_id })
        .select('id', 'name');

      // Components
      const componentCatalogue = await db('manufacturing_component_catalogue')
        .where({ status: 'active' });
        
      const componentInventory = await db('manufacturing_component_inventory')
        .where({ company_id: companyId });

      // Load currency symbol
      const companyCurrency = await db('currencies').where({ id: company.currency_id }).first();
      const currencySymbol: string = companyCurrency?.symbol ?? '?';

      // Load country automobile configuration
      const countryAutoConfig = await db('manufacturing_country_auto_config')
        .where({ country_id: company.country_id }).first() ?? {};

      // Phase 3: Company knowledge
      const knowledgeRows = await db('manufacturing_company_knowledge')
        .where({ company_id: companyId });
      const companyKnowledge: Record<string, { xp: number; level: number }> = {};
      for (const domain of KNOWLEDGE_DOMAINS) {
        const row = knowledgeRows.find((r: any) => r.domain === domain.id);
        const xp = row?.xp_points ?? 0;
        let level = 0;
        for (const i of KNOWLEDGE_LEVEL_XP.keys()) {
           if (xp >= KNOWLEDGE_LEVEL_XP[i]) level = i + 1;
        }
        companyKnowledge[domain.id] = { xp, level };
      }

      // Phase 3: Engineering reputation
      const engReputation = await db('manufacturing_engineering_reputation')
        .where({ company_id: companyId }).first() ?? null;

      res.status(200).json({
        factories,
        productionLines,
        models,
        inventory,
        latestReport,
        allReports,
        brandResults,
        staff,
        ledger,
        records,
        finances,
        homeMarket,
        programmes,
        research: programmes, // alias for frontend compatibility
        allMarkets,
        statesForCountry,
        staffRoles: STAFF_ROLES,
        modelSnapshots,
        currencySymbol,
        countryAutoConfig,
        componentCatalogue,
        componentInventory,
        // Phase 3
        companyKnowledge,
        engReputation,
        knowledgeDomains: KNOWLEDGE_DOMAINS,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/components/procure
  public static async procureComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { component_id, units } = req.body;
      
      if (!userId || !companyId || !component_id || typeof units !== 'number' || units <= 0) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      const { company } = await verifyManufacturingCompany(db, userId, companyId);
      
      const component = await db('manufacturing_component_catalogue').where({ id: component_id }).first();
      if (!component) {
        return next(new AppError('Component not found', 404, 'NOT_FOUND'));
      }

      const totalCost = component.base_cost * units;

      const result = await db.transaction(async (trx) => {
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < totalCost) {
          throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
        }

        // Deduct cash
        const newBalance = Number(finances.available_cash) - totalCost;
        await trx('company_finances')
          .where({ company_id: companyId })
          .update({
            available_cash: newBalance,
            updated_at: trx.fn.now()
          });

        // Add to inventory
        const existingInventory = await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: component_id })
          .forUpdate()
          .first();

        if (existingInventory) {
          await trx('manufacturing_component_inventory')
            .where({ id: existingInventory.id })
            .update({
              units_in_stock: Number(existingInventory.units_in_stock) + units,
              updated_at: trx.fn.now()
            });
        } else {
          await trx('manufacturing_component_inventory').insert({
            world_instance_id: company.world_instance_id,
            company_id: companyId,
            component_id: component_id,
            units_in_stock: units
          });
        }

        const clock = await trx('world_clock').first();
        const currentYear = clock?.current_year ?? 1;
        const currentMonth = clock?.current_month ?? 1;
        const currentDay = clock?.current_day ?? 1;

        // Record history
        await trx('manufacturing_procurement_history').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          component_id: component_id,
          units_ordered: units,
          unit_cost: component.base_cost,
          total_cost: totalCost,
          world_year: currentYear,
          world_month: currentMonth,
          world_day: currentDay
        });
        
        // Add ledger entry
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: currentYear,
          game_month: currentMonth,
          game_day: currentDay,
          entry_type: 'expense',
          description: `Procured ${units} units of ${component.name}`,
          amount: -totalCost,
          balance_after: newBalance
        });
      });

      res.status(200).json({ status: 'success', message: `Procured ${units} units of ${component.name}` });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/factories/lease
  public static async leaseFactory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { factoryTypeId } = req.body;

      if (!userId || !companyId || !factoryTypeId) return next(new AppError('Missing or invalid fields: userId, companyId, factoryTypeId', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const { company, currencySymbol } = await verifyManufacturingCompany(trx, userId, companyId);

        const factoryType = await trx('manufacturing_factory_types').where({ id: factoryTypeId }).first();
        if (!factoryType) throw new AppError('Factory type not found', 404, 'NOT_FOUND');
        if (factoryType.status === 'locked') throw new AppError('This factory type is not yet available', 400, 'LOCKED');

        // Check if company already has a factory of this type
        const existingFactory = await trx('manufacturing_factories')
          .where({ company_id: companyId, factory_type_id: factoryTypeId, status: 'active' })
          .forUpdate()
          .first();
        if (existingFactory) throw new AppError('You already have an active factory of this type', 400, 'DUPLICATE');

        const leaseCost = Number(factoryType.base_lease_cost_per_month);
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();

        if (Number(finances.available_cash) < leaseCost) {
          throw new AppError(`Insufficient funds. Factory lease requires ${currencySymbol}${leaseCost.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', leaseCost)
          .returning('*');

        const clock = await trx('world_clock').first();

        const [factory] = await trx('manufacturing_factories').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          country_id: company.country_id,
          state_id: company.headquarters_state_id,
          factory_type_id: factoryTypeId,
          name: `${factoryType.name} — ${company.name}`,
          lease_cost_per_month: factoryType.base_lease_cost_per_month,
          maintenance_cost_per_month: factoryType.base_maintenance_per_month,
          capacity_per_month: factoryType.base_capacity_per_month,
          machine_level: 1,
          condition: 100.00,
          status: 'active',
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1,
        }).returning('*');

        // Create production line(s) up to max
        const linesToCreate = factoryType.max_production_lines;
        const lines = [];
        for (let i = 1; i <= linesToCreate; i++) {
          const [line] = await trx('manufacturing_production_lines').insert({
            world_instance_id: company.world_instance_id,
            company_id: companyId,
            factory_id: factory.id,
            line_number: i,
            quality_setting: 'Standard',
            target_units_per_month: 0,
            status: 'idle',
          }).returning('*');
          lines.push(line);
        }

        // Ledger entry
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: clock?.current_year ?? 1,
          game_month: clock?.current_month ?? 1,
          game_day: clock?.current_day ?? 1,
          entry_type: 'factory_lease',
          description: `First lease payment — ${factoryType.name}`,
          amount: -leaseCost,
          balance_after: updatedFinances.available_cash,
        });

        return { factory, productionLines: lines, available_cash: updatedFinances.available_cash };
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/models
  public static async createVehicleModel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const {
        name, vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget,
        salePrice, targetSegment: reqSegment, appliedEngineeringPackage,
        // Phase 3 fields
        engineeringPriorities: rawPriorities,
        budgetAllocation: rawBudgetAlloc,
      } = req.body;

      if (!userId || !companyId) return next(new AppError('Missing or invalid fields: userId, companyId', 400, 'BAD_REQUEST'));
      if (!name || !vehicleClass || !platform || !powerUnit || !drivetrain || !interiorTier || !safetyTier || !qualityTarget) {
        return next(new AppError('All design choices are required', 400, 'BAD_REQUEST'));
      }
      if (!VEHICLE_CLASSES.includes(vehicleClass)) return next(new AppError('Invalid vehicle class', 400, 'BAD_REQUEST'));

      // Validate and normalize engineering priorities
      const engineeringPriorities: Record<string, number> = rawPriorities ?? DEFAULT_ENGINEERING_PRIORITIES;
      let prioritySum = 0;
      for (const val of Object.values(engineeringPriorities)) {
        if (typeof val !== 'number' || val < 0) {
          return next(new AppError('Engineering priorities must be positive numbers', 400, 'INVALID_PRIORITIES'));
        }
        prioritySum += val;
      }
      if (Math.abs(prioritySum - 100) > 2) {
        return next(new AppError(`Engineering priorities must sum to 100 (got ${prioritySum})`, 400, 'INVALID_PRIORITIES'));
      }

      const result = await db.transaction(async (trx) => {
        const { company, autoConfig } = await verifyManufacturingCompany(trx, userId, companyId);

        // Check model name uniqueness per company
        const existingModel = await trx('manufacturing_vehicle_models')
          .whereRaw('company_id = ? AND LOWER(name) = ?', [companyId, name.toLowerCase()])
          .first();
        if (existingModel) throw new AppError('A model with this name already exists', 400, 'NAME_TAKEN');

        const clock = await trx('world_clock').first();
        const currentYear = clock?.current_year ?? 1;
        const currentMonth   = clock?.current_month   || 1;
        const currentDay  = clock?.current_day  || 1;

        // Engineer context
        const engineerStaff = await trx('company_staff')
          .where({ company_id: companyId, role: 'automotive-engineer' }).first();
        const engineerCount = engineerStaff?.quantity || 0;

        // Load company knowledge
        const knowledgeRows = await trx('manufacturing_company_knowledge')
          .where({ company_id: companyId });
        const companyKnowledge: Record<string, number> = {};
        for (const row of knowledgeRows) {
          companyKnowledge[row.domain] = row.xp_points;
        }

        // Base dev cost from country config
        const BASE_DEV_COST = Number(autoConfig?.base_vehicle_dev_cost ?? 150000);

        // Build engineering design for engine
        const budgetAlloc: Record<string, number> = rawBudgetAlloc ?? {};
        // If no budget alloc supplied, distribute using defaults
        if (Object.keys(budgetAlloc).length === 0) {
          for (const bucket of BUDGET_BUCKETS) {
            budgetAlloc[bucket.id] = Math.round(BASE_DEV_COST * bucket.defaultPct);
          }
        } else {
          for (const val of Object.values(budgetAlloc)) {
            if (typeof val !== 'number' || val < 0) {
              throw new AppError('Budget allocations must be positive numbers', 400, 'INVALID_BUDGET');
            }
          }
        }

        const engineDesign: EngineeringDesign = {
          vehicleClass,
          platform,
          powerUnit,
          drivetrain,
          interiorTier,
          safetyTier,
          qualityTarget,
          priorities: engineeringPriorities,
          budgetAlloc,
          totalBudget: BASE_DEV_COST,
          appliedEngineeringPackage: appliedEngineeringPackage || undefined,
        };

        const engContext: EngineerContext = {
          engineerCount,
          engineerSkillLevel: Math.min(Math.floor(engineerCount / 2), 5),
          companyKnowledge,
          currentMonth,
          currentYear,
        };

        // Run the engineering engine
        const outcome = calculateEngineeringOutcome(engineDesign, engContext);

        const computedSegment = qualityTarget === 'budget' ? 'Economy'
          : qualityTarget === 'premium' ? 'Premium'
          : 'Mid-Range';
        const finalSegment = reqSegment || computedSegment;

        const baseMfgCost = outcome.finalScores.reliability; // placeholder — actual base cost formula
        // Compute manufacturing cost from component costs (same as before, adjusted by production cost mult)
        const platDef  = PLATFORMS.find(p => p.id === platform);
        const pwrDef   = POWER_UNITS.find(p => p.id === powerUnit);
        const drvDef   = DRIVETRAINS.find(p => p.id === drivetrain);
        const intDef   = INTERIOR_TIERS.find(p => p.id === interiorTier);
        const safDef   = SAFETY_TIERS.find(p => p.id === safetyTier);
        const qualDef  = QUALITY_TARGETS.find(p => p.id === qualityTarget);
        const rawCost  = ((platDef?.baseCost ?? 12000) + (pwrDef?.baseCost ?? 2500) + (drvDef?.baseCost ?? 0) + (intDef?.baseCost ?? 0) + (safDef?.baseCost ?? 0)) * (qualDef?.costMultiplier ?? 1.0);
        const manufacturingCostPerUnit = Math.round(rawCost * outcome.productionCostMultiplier);

        const finalSalePrice = salePrice && Number(salePrice) > 0
          ? Number(salePrice)
          : Math.round(manufacturingCostPerUnit * 1.5);

        // Deduct dev cost
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < outcome.effectiveDevCost) {
          throw new AppError(`Insufficient funds. Development requires ${outcome.effectiveDevCost.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }
        await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', outcome.effectiveDevCost);

        // Ledger entry for dev cost
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: currentYear,
          game_month: currentMonth,
          game_day: currentDay,
          entry_type: 'vehicle_development',
          amount: -outcome.effectiveDevCost,
          balance_after: Number(finances.available_cash) - outcome.effectiveDevCost,
          description: `Vehicle development started: ${name.trim()}`,
        });

        // Calculate stage completion months
        const engCompletes     = currentMonth + outcome.stageTimings.engineering;
        const protoCompletes   = engCompletes + outcome.stageTimings.prototype;
        const testingCompletes = protoCompletes + outcome.stageTimings.testing;
        const totalCompletes   = testingCompletes;

        // Year/month with overflow handling (12 months per year)
        const MONTHS_PER_YEAR = 12;
        const wrapMonth = (year: number, month: number) => {
          while (month > MONTHS_PER_YEAR) { month -= MONTHS_PER_YEAR; year++; }
          return { year, month };
        };
        const engEnd   = wrapMonth(currentYear, engCompletes);
        const protoEnd = wrapMonth(currentYear, protoCompletes);
        const testEnd  = wrapMonth(currentYear, testingCompletes);
        const finalEnd = wrapMonth(currentYear, totalCompletes);

        const [model] = await trx('manufacturing_vehicle_models').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          name: name.trim(),
          vehicle_class: vehicleClass,
          platform_type: platform,
          power_unit_type: powerUnit,
          drivetrain_type: drivetrain,
          interior_tier: interiorTier,
          safety_tier: safetyTier,
          production_quality: qualityTarget,
          manufacturing_cost_per_unit: manufacturingCostPerUnit,
          reliability_score:    outcome.finalScores.reliability,
          performance_score:    outcome.finalScores.performance,
          fuel_efficiency_score: outcome.finalScores.fuelEfficiency,
          appeal_score:         outcome.finalScores.appeal,
          cargo_score:          outcome.finalScores.cargo,
          safety_score:         outcome.finalScores.safety,
          target_segment: finalSegment,
          sale_price: finalSalePrice,
          development_cost_discount: Math.min(engineerCount * 0.05, 0.20),
          applied_engineering_package: appliedEngineeringPackage || null,
          status: 'active',
          development_status: 'in_development',
          // Phase 3 engineering fields
          engineering_priorities:     JSON.stringify(engineeringPriorities),
          engineering_budget_alloc:   JSON.stringify(budgetAlloc),
          engineering_complexity:     outcome.complexities.engineering,
          manufacturing_complexity:   outcome.complexities.manufacturing,
          assembly_complexity:        outcome.complexities.assembly,
          vehicle_weight_kg:          outcome.vehicleWeightKg,
          manufacturing_friendliness: outcome.manufacturingFriendliness,
          engineering_risk:           outcome.engineeringRisk,
          prototype_confidence:       outcome.prototypeConfidence,
          dev_stage:                  'engineering',
          planned_dev_time_months:      outcome.devTimeArcs,
          prototype_validation_result: null, // Populated after prototype stage completes
          engineering_assessment:     JSON.stringify(outcome.engineeringReport), // Note: this is actually the new assessment format returned from engine
          engineering_balance_rating: outcome.balanceFlags.length > 0 ? outcome.balanceFlags[0] : null,
          // Stage completion timings
          stage_engineering_completes_year: engEnd.year,
          stage_engineering_completes_month:   engEnd.month,
          stage_prototype_completes_year:   protoEnd.year,
          stage_prototype_completes_month:     protoEnd.month,
          stage_testing_completes_year:     testEnd.year,
          stage_testing_completes_month:       testEnd.month,
          // Overall completion
          created_at_world_year: currentYear,
          created_at_world_month:   currentMonth,
          created_at_world_day:  currentDay,
          development_started_at_year:   currentYear,
          development_started_at_month:     currentMonth,
          development_completes_at_year:  finalEnd.year,
          development_completes_at_month:    finalEnd.month,
        }).returning('*');

        return { model, devCostCharged: outcome.effectiveDevCost, devTimeArcs: outcome.devTimeArcs };
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/models/:modelId/launch
  public static async launchVehicleModel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, modelId } = req.params;

      if (!userId || !companyId || !modelId) return next(new AppError('Missing or invalid fields: userId, companyId, modelId', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const model = await trx('manufacturing_vehicle_models')
          .where({ id: modelId, company_id: companyId, status: 'active' })
          .first();
        if (!model) throw new AppError('Vehicle model not found', 404, 'NOT_FOUND');

        if (model.development_status === 'launched') {
          throw new AppError('This model is already launched', 400, 'ALREADY_LAUNCHED');
        }
        if (model.development_status === 'in_development') {
          throw new AppError('This model is still in development', 400, 'IN_DEVELOPMENT');
        }
        if (model.development_status === 'cancelled') {
          throw new AppError('This model has been cancelled and cannot be launched', 400, 'CANCELLED');
        }

        const clock2 = await trx('world_clock').first();
        const [updated] = await trx('manufacturing_vehicle_models')
          .where({ id: modelId })
          .update({
            development_status: 'launched',
            launched_year: clock2?.current_year || 1,
            launched_month: clock2?.current_month || 1,
            updated_at: trx.fn.now(),
          })
          .returning('*');

        const clock = await trx('world_clock').first();
        await trx('company_records').insert({
          world_instance_id: model.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `${model.name} was launched for production.`,
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1
        });

        return updated;
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /companies/:companyId/manufacturing/models/:modelId/price
  public static async updateModelPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, modelId } = req.params;
      const { salePrice } = req.body;

      if (!userId || !companyId || !modelId || salePrice === undefined) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }
      if (Number(salePrice) < 0) return next(new AppError('Sale price cannot be negative', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const model = await trx('manufacturing_vehicle_models').where({ id: modelId, company_id: companyId }).first();
        if (!model) throw new AppError('Vehicle model not found', 404, 'NOT_FOUND');

        await trx('manufacturing_vehicle_models')
          .where({ id: modelId })
          .update({ sale_price: salePrice, updated_at: trx.fn.now() });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/production/save-plan
  public static async saveProductionPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { lineId, modelId, qualitySetting, targetUnitsPerArc } = req.body;

      if (!userId || !companyId || !lineId) return next(new AppError('Missing or invalid fields: userId, companyId, lineId', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const line = await trx('manufacturing_production_lines').where({ id: lineId, company_id: companyId }).first();
        if (!line) throw new AppError('Production line not found', 404, 'NOT_FOUND');

        // Validate model belongs to company, is launched, and not discontinued
        if (modelId) {
          if (targetUnitsPerArc === undefined) throw new AppError('Missing targetUnitsPerArc for active production plan', 400, 'BAD_REQUEST');
          const model = await trx('manufacturing_vehicle_models').where({ id: modelId, company_id: companyId }).first();
          if (!model) throw new AppError('Vehicle model not found', 404, 'NOT_FOUND');
          if (model.development_status === 'discontinued') {
            throw new AppError('This vehicle model has been discontinued. It cannot be assigned to a new production plan.', 400, 'DISCONTINUED');
          }
          if (model.development_status !== 'launched') {
            throw new AppError('This vehicle model has not been launched yet. Launch it from the R\u0026D tab before assigning to production.', 400, 'NOT_LAUNCHED');
          }
        }

        // Get factory capacity — per-line cap = total factory capacity / max lines (from factory type)
        const factory = await trx('manufacturing_factories').where({ id: line.factory_id }).forUpdate().first();
        if (!factory) throw new AppError('Factory not found', 404, 'NOT_FOUND');
        
        const factoryType = await trx('manufacturing_factory_types').where({ id: factory.factory_type_id }).first();
        if (!factoryType) throw new AppError('Factory type not found', 404, 'NOT_FOUND');
        
        // After expansion, max_production_lines may have grown; use the factory type defaults as cap basis
        const totalCap = Number(factory.capacity_per_month ?? factoryType.base_capacity_per_month ?? 100);
        const lineCount = Number(factoryType.max_production_lines ?? 1);
        const PER_LINE_CAP = Math.ceil(totalCap / lineCount);
        if (targetUnitsPerArc && Number(targetUnitsPerArc) > PER_LINE_CAP) {
          throw new AppError(`Each production line cannot exceed ${PER_LINE_CAP} units/Month`, 400, 'EXCEEDS_LINE_CAP');
        }
        // Validate total across all lines does not exceed factory capacity
        if (targetUnitsPerArc && Number(targetUnitsPerArc) > 0) {
          const otherLines = await trx('manufacturing_production_lines')
            .where({ factory_id: line.factory_id })
            .whereNot({ id: lineId });
          const otherTotal = otherLines.reduce((sum: number, l: any) => sum + Number(l.target_units_per_month || 0), 0);
          if (otherTotal + Number(targetUnitsPerArc) > Number(factory.capacity_per_month)) {
            throw new AppError(`Total planned units across all lines cannot exceed factory capacity (${factory.capacity_per_month} units/Month). Other lines already plan ${otherTotal} units.`, 400, 'EXCEEDS_CAPACITY');
          }
        }

        await trx('manufacturing_production_lines').where({ id: lineId }).update({
          assigned_vehicle_model_id: modelId || null,
          quality_setting: qualitySetting || 'Standard',
          target_units_per_month: targetUnitsPerArc || 0,
          status: modelId && targetUnitsPerArc > 0 ? 'active' : 'idle',
          updated_at: trx.fn.now(),
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/staff/hire
  public static async hireStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { role, quantity: rawQty } = req.body;
      const quantity = Math.max(1, Math.floor(Number(rawQty ?? 1)));

      if (!userId || !companyId || !role) return next(new AppError('Missing or invalid fields: userId, companyId, role', 400, 'BAD_REQUEST'));

      const validRole = STAFF_ROLES.find(r => r.id === role);
      if (!validRole) return next(new AppError('Invalid staff role', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);
        const clock = await trx('world_clock').first();

        const existing = await trx('company_staff').where({ company_id: companyId, role }).forUpdate().first();
        if (existing) {
          await trx('company_staff').where({ id: existing.id }).update({
            quantity: existing.quantity + quantity,
            updated_at: trx.fn.now()
          });
        } else {
          await trx('company_staff').insert({ company_id: companyId, role, quantity });
        }

        await trx('company_records').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `Hired ${quantity} ${validRole.label}${quantity > 1 ? 's' : ''}.`,
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1,
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/staff/fire
  public static async fireStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { role, quantity: rawQty } = req.body;
      const quantity = Math.max(1, Math.floor(Number(rawQty ?? 1)));

      if (!userId || !companyId || !role) return next(new AppError('Missing or invalid fields: userId, companyId, role', 400, 'BAD_REQUEST'));

      const validRole = STAFF_ROLES.find(r => r.id === role);
      if (!validRole) return next(new AppError('Invalid staff role', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);
        const clock = await trx('world_clock').first();

        const existing = await trx('company_staff').where({ company_id: companyId, role }).forUpdate().first();
        if (!existing || existing.quantity <= 0) {
          throw new AppError('No staff in this role to dismiss', 400, 'BAD_REQUEST');
        }
        const dismissed = Math.min(quantity, existing.quantity);
        await trx('company_staff').where({ id: existing.id }).update({
          quantity: Math.max(0, existing.quantity - dismissed),
          updated_at: trx.fn.now()
        });

        await trx('company_records').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `Dismissed ${dismissed} ${validRole.label}${dismissed > 1 ? 's' : ''}.`,
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1,
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // ── Company Reputation/Awareness Helper ──────────────────────────────────────────
  public static async getCompanyAwarenessAndTrust(trx: any, companyId: string, countryId: string) {
    let domesticMarkets = await trx('manufacturing_region_markets')
      .whereRaw('LOWER(country_id) = LOWER(?)', [countryId || 'drennia'])
      .where(function(this: any) {
        this.where('status', 'active').orWhereNull('status').orWhere('status', '');
      });

    if (!domesticMarkets || domesticMarkets.length === 0) {
      domesticMarkets = await trx('manufacturing_region_markets')
        .whereRaw('LOWER(country_id) = LOWER(?)', ['drennia'])
        .where(function(this: any) {
          this.where('status', 'active').orWhereNull('status').orWhere('status', '');
        });
    }

    if (!domesticMarkets || domesticMarkets.length === 0) return { companyAwareness: 0, companyReputation: 0 };

    const companyBrands = await trx('manufacturing_brand_awareness').where({ company_id: companyId });
    const brandMap = new Map<string, any>();
    for (const b of companyBrands) {
      brandMap.set(b.region_market_id, b);
    }

    let totalPopulation = 0;
    let weightedAwarenessSum = 0;
    let weightedTrustSum = 0;

    for (const m of domesticMarkets) {
      const pop = Number(m.population) || 0;
      totalPopulation += pop;
      
      const b = brandMap.get(m.id);
      const awar = b ? Number(b.awareness) : 0;
      const trust = b ? Number(b.reputation) : 0;

      weightedAwarenessSum += (awar * pop);
      weightedTrustSum += (trust * pop);
    }

    if (totalPopulation === 0) return { companyAwareness: 0, companyReputation: 0 };

    return {
      companyAwareness: weightedAwarenessSum / totalPopulation,
      companyReputation: weightedTrustSum / totalPopulation,
    };
  }

  // ── Sales Simulation Helper ───────────────────────────────────────────────────
  public static simulateSalesDemand(
    marketAllocations: any[],
    brandMap: Map<string, { awareness: number, reputation: number }>,
    MARKETING_MULT: Record<string, number>,
    salesManagerBonusMap: Map<string, number>
  ) {
    const allocationsByMarket = new Map<string, any[]>();
    for (const alloc of marketAllocations) {
      if (!allocationsByMarket.has(alloc.region_market_id)) {
        allocationsByMarket.set(alloc.region_market_id, []);
      }
      allocationsByMarket.get(alloc.region_market_id)!.push(alloc);
    }

    const modelDemandsList: any[] = [];

    for (const [marketId, allocs] of allocationsByMarket.entries()) {
      const market = allocs[0];

      // Market Capacity Calculation (Total)
      const population = Number(market.population);
      const avgHouseholdSize = Number(market.avg_household_size) || 2.8;
      const totalHouseholds = Math.floor(population / avgHouseholdSize);
      
      const ownershipRate = Number(market.vehicle_ownership_rate) || 0.35;
      const vehicleHoldingHouseholds = Math.floor(totalHouseholds * ownershipRate);
      const nonVehicleHouseholds = Math.max(0, totalHouseholds - vehicleHoldingHouseholds);
      
      const replacementRate = Number(market.baseline_replacement_rate) || 0.003;
      const firstTimeRate = Number(market.first_time_buyer_rate) || 0.0005;
      
      const replacementBuyers = Math.floor(vehicleHoldingHouseholds * replacementRate);
      const firstTimeBuyers = Math.floor(nonVehicleHouseholds * firstTimeRate);
      
      const needIntensity = Number(market.purchase_need_intensity) || 1.0;
      const rawCapacity = (replacementBuyers + firstTimeBuyers) * needIntensity;
      const marketPurchaseCapacity = Math.floor(rawCapacity * Number(market.economic_multiplier));

      let combinedDemandTarget = 0;
      const modelDemands = [];

      for (const alloc of allocs) {
        const salePrice = Number(alloc.sale_price);

        const brandKey = `${alloc.company_id}_${market.region_market_id}`;
        const localBrand = brandMap.get(brandKey);
        const localAwareness = localBrand ? Number(localBrand.awareness) : 0;
        const localTrust = localBrand ? Number(localBrand.reputation) : 0;
        
        const awarenessMult = 0.35 + 0.65 * (localAwareness / 100);
        const trustMult = Math.max(0.20, localTrust / 100);
        const distMult = Number(market.distribution_strength) || 0.7;

        const mktTier = alloc.marketing_tier || 'none';
        const mktMult = MARKETING_MULT[mktTier] ?? 1.0;

        let totalRawBuyerInterest = 0;
        const segmentInterest: Record<string, number> = {};

        // NEW: Demographic Segment Loop
        for (const segmentKey of Object.keys(MARKET_SEGMENTS)) {
          const segment = MARKET_SEGMENTS[segmentKey];

          // 1. Segment Capacity
          const segmentCapacity = marketPurchaseCapacity * segment.populationShare;

          // 2. Segment Affordability
          const baseComfortRatio = Number(market.vehicle_price_comfort_ratio) || 0.8;
          const segmentBuyingPower = (segment.priceCeiling / 35000) * Number(market.average_income) * baseComfortRatio;
          
          const priceRatio = salePrice / Math.max(segmentBuyingPower, 1);
          const priceSens = segment.priceSensitivity;
          
          let affordability = priceRatio <= 1.0
            ? 1.0
            : Math.max(0, Math.exp(-priceSens * 2.0 * (priceRatio - 1.0)));

          // 3. Segment Fit (Using car scores and segment score weights)
          const relScore = (Number(alloc.reliability_score) / 65) * segment.scoreWeights.reliability;
          const perfScore = (Number(alloc.performance_score) / 65) * segment.scoreWeights.performance;
          const fuelScore = (Number(alloc.fuel_efficiency_score) / 65) * segment.scoreWeights.fuel_efficiency;
          const safeScore = (Number(alloc.safety_score ?? 50) / 65) * segment.scoreWeights.safety;
          const appScore = (Number(alloc.appeal_score) / 65) * segment.scoreWeights.appeal;
          const cargoScore = (Number(alloc.cargo_score || 30) / 65) * segment.scoreWeights.cargo_utility;

          const weightSum = segment.scoreWeights.reliability + segment.scoreWeights.performance + segment.scoreWeights.fuel_efficiency + segment.scoreWeights.safety + segment.scoreWeights.appeal + segment.scoreWeights.cargo_utility;
          const fitRaw = (relScore + perfScore + fuelScore + safeScore + appScore + cargoScore) / weightSum;

          // Target segment bonus
          const allocSegment = (alloc.target_segment || '').toLowerCase();
          const isTargetMatch = allocSegment === segment.id;
          
          const FIT_EXP = 4.0;
          let fitEff = Math.pow(fitRaw, FIT_EXP) * (isTargetMatch ? segment.targetFitBonus : 1.0);
          const appealNorm = Number(alloc.appeal_score) / 65;
          if (segment.minAppeal > 0 && appealNorm < segment.minAppeal) {
            fitEff *= Math.pow(appealNorm / segment.minAppeal, 2); // prestige gate
          }

          const VALUE_K = 1.6;
          const priceLevel = salePrice / segment.priceCeiling;
          const valueForMoney = Math.max(0, Math.min(1.15, (fitRaw + 0.15) / (priceLevel * VALUE_K + 0.15)));

          // Calculate raw interest for this specific segment
          const salesManagerBonus = salesManagerBonusMap.get(alloc.company_id) || 0;
          const segmentBaseInterest = segmentCapacity * affordability * fitEff * valueForMoney * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);
          const rawSegmentInt = Math.max(0, segmentBaseInterest);
          segmentInterest[segmentKey] = rawSegmentInt;
          totalRawBuyerInterest += rawSegmentInt;
        }

        const allocatedUnits = Number(alloc.units_allocated);
        const modelDemandTarget = Math.min(allocatedUnits, Math.floor(totalRawBuyerInterest));

        combinedDemandTarget += modelDemandTarget;

        modelDemands.push({
          alloc,
          affordability: 1.0, 
          fitMultiplier: 1.0, 
          awarenessMult, trustMult, distMult, mktMult,
          rawBuyerInterest: totalRawBuyerInterest, 
          segmentInterest,
          modelDemandTarget, mktTier,
          finalAssignedDemand: 0,
          totalHouseholds,
          marketPurchaseCapacity
        });
      }

      let capacityRatio = 1.0;
      if (combinedDemandTarget > marketPurchaseCapacity && marketPurchaseCapacity > 0) {
         capacityRatio = marketPurchaseCapacity / combinedDemandTarget;
      } else if (marketPurchaseCapacity === 0) {
         capacityRatio = 0.0;
      }

      modelDemands.sort((a,b) => a.alloc.vehicle_model_id.localeCompare(b.alloc.vehicle_model_id));

      let remainingFractions = 0;
      for (const md of modelDemands) {
         let finalDemand = md.modelDemandTarget;
         if (capacityRatio < 1.0) {
            const exactDemand = md.modelDemandTarget * capacityRatio;
            finalDemand = Math.floor(exactDemand);
            remainingFractions += (exactDemand - finalDemand);
         }
         md.finalAssignedDemand = finalDemand;
      }

      let wholeFractions = Math.floor(remainingFractions);
      for (let i = 0; i < wholeFractions && i < modelDemands.length; i++) {
         modelDemands[i].finalAssignedDemand += 1;
      }

      for (const md of modelDemands) {
        const alloc = md.alloc;
        const unitsSold = md.finalAssignedDemand;

        let mainReasonCode = 'Balanced';
        if (md.rawBuyerInterest < 1.0) mainReasonCode = 'Zero Demand';
        else if (md.awarenessMult < 0.3) mainReasonCode = 'Low Brand Awareness';
        else if (md.distMult < 0.5) mainReasonCode = 'Weak Distribution';
        else if (capacityRatio < 1.0) mainReasonCode = 'Market Capacity Capped (Cannibalised)';
        else if (unitsSold === Number(alloc.units_allocated) && unitsSold > 0) mainReasonCode = 'Sold Out';
        else if (unitsSold === 0 && Number(alloc.units_allocated) > 0) mainReasonCode = 'Zero Demand';

        const marketShare = Math.min(1, unitsSold / Math.max(1, md.rawBuyerInterest));
        
        modelDemandsList.push({
          ...md,
          unitsSold,
          mainReasonCode,
          marketShare,
          marketPurchaseCapacity,
          totalHouseholds,
          replacementBuyers,
          firstTimeBuyers
        });
      }
    }
    
    return modelDemandsList;
  }

  // POST /admin/manufacturing/process-company/:companyId
  

  private static async produceForCompany(trx: any, company: any, clock: any): Promise<ParticipantState> {
    const currentYear = clock?.current_year ?? 1;
    const currentMonth = clock?.current_month ?? 1;
    const currentDay = clock?.current_day ?? 1;
    const companyId = company.id;

    const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
    let runningCash = Number(finances.available_cash);

    console.log(`[produceForCompany] Month ${clock.current_month} Fetching factories for ${companyId}...`);
    const allFactoriesRaw = await trx('manufacturing_factories').where({ company_id: companyId });
    for (const factory of allFactoriesRaw) {
      if (factory.auto_condition_recovery && Number(factory.condition) < 100) {
        if (runningCash >= 20000) {
          runningCash -= 20000;
          const newCondition = Math.min(100.0, Number(factory.condition) + 5.0);
          await trx('manufacturing_factories').where({ id: factory.id }).update({
            condition: newCondition,
            updated_at: trx.fn.now()
          });
          factory.condition = newCondition;
          await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', 20000);
          await trx('company_ledger').insert({
            company_id: companyId, game_year: currentYear, game_month: currentMonth, game_day: currentDay,
            entry_type: 'maintenance', description: `Auto-Recovery (${factory.name})`, amount: -20000, balance_after: runningCash
          });
        }
      }
    }
    const allFactories = allFactoriesRaw.filter((f: any) => f.status !== 'closed');
    const factories = allFactories.filter((f: any) => f.status === 'active');
    console.log(`[produceForCompany] Month ${clock.current_month} Fetched factories for ${companyId}`);
    console.log(`[produceForCompany] Month ${clock.current_month} Fetching productionLines for ${companyId}...`); const productionLines = await trx('manufacturing_production_lines')
      .join('manufacturing_vehicle_models', 'manufacturing_production_lines.assigned_vehicle_model_id', 'manufacturing_vehicle_models.id')
      .where('manufacturing_production_lines.company_id', companyId)
      .where('manufacturing_production_lines.status', 'active')
      .whereNotNull('manufacturing_production_lines.assigned_vehicle_model_id')
      .where('manufacturing_production_lines.target_units_per_month', '>', 0)
      .whereNot('manufacturing_vehicle_models.development_status', 'discontinued')
      .select(
        'manufacturing_production_lines.*',
        'manufacturing_vehicle_models.name as model_name',
        'manufacturing_vehicle_models.vehicle_class',
        'manufacturing_vehicle_models.manufacturing_cost_per_unit',
        'manufacturing_vehicle_models.appeal_score',
        'manufacturing_vehicle_models.reliability_score',
        'manufacturing_vehicle_models.fuel_efficiency_score',
        'manufacturing_vehicle_models.cargo_score',
        'manufacturing_vehicle_models.manufacturing_friendliness',
        'manufacturing_vehicle_models.assembly_complexity',
        'manufacturing_vehicle_models.sale_price',
        'manufacturing_vehicle_models.id as model_id_ref'
      );

    console.log(`[produceForCompany] Month ${clock.current_month} Fetched productionLines for ${companyId}`); const staff = await trx('company_staff').where({ company_id: companyId });

    // ─── 0. Vehicle Development Updates (Phase 3B per-stage) ─────────────
    const developingModels = await trx('manufacturing_vehicle_models')
      .where({ company_id: companyId, status: 'active', development_status: 'in_development' });

    const knowledgeRows = await trx('manufacturing_company_knowledge').where({ company_id: companyId });
    const knowledgeXpMap: Record<string, number> = {};
    for (const k of knowledgeRows) knowledgeXpMap[k.domain] = Number(k.xp_points);

    const engRepForCulture = await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
    const cultureScore = Number(engRepForCulture?.engineering_culture_score ?? 0);

    for (const model of developingModels) {
      let devStage = model.dev_stage as string | null;

      // Variables to track completion dates for subsequent checks in case of cascading
      let engEndsYear = model.stage_engineering_completes_year ?? 1;
      let engEndsMonth = model.stage_engineering_completes_month ?? 1;
      let protoEndsYear = model.stage_prototype_completes_year ?? 1;
      let protoEndsMonth = model.stage_prototype_completes_month ?? 1;
      let testingEndsYear = model.stage_testing_completes_year ?? 1;
      let testingEndsMonth = model.stage_testing_completes_month ?? 1;
      let completesYear = model.development_completes_at_year ?? 1;
      let completesMonth = model.development_completes_at_month ?? 1;

      // Stage: engineering → prototype
      if (devStage === 'engineering' && (currentYear > engEndsYear || (currentYear === engEndsYear && currentMonth >= engEndsMonth))) {
        const bonuses = applyKnowledgeBonuses(knowledgeXpMap);
        const newReliability = Math.min(100, Number(model.reliability_score ?? 60) + bonuses.reliabilityBonus);
        const newMfgFriendliness = Math.min(100, Number(model.manufacturing_friendliness ?? 50) + bonuses.mfgFriendlinessBonus);
        const newConfidence = Math.min(100, Number(model.prototype_confidence ?? 50) + bonuses.prototypeConfidenceBonus);
        const newComplexity = Math.max(10, Number(model.engineering_complexity ?? 50) - bonuses.engineeringComplexityReduction);

        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({
          dev_stage: 'prototype', reliability_score: newReliability, manufacturing_friendliness: newMfgFriendliness, prototype_confidence: newConfidence, engineering_complexity: newComplexity, updated_at: trx.fn.now()
        });

        const bonusSummary = Object.entries(bonuses).filter(([, v]) => (v as number) > 0).map(([k, v]) => `${k.replace('Bonus','').replace('Reduction', '')}: +${(v as number).toFixed(1)}`).join(', ');
        await trx('company_records').insert({
          world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${model.name} has entered the Prototype stage.${bonusSummary ? ` Knowledge bonuses applied: ${bonusSummary}.` : ''}`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay
        });
        devStage = 'prototype';
      }

      // Stage: prototype → testing
      if (devStage === 'prototype' && (currentYear > protoEndsYear || (currentYear === protoEndsYear && currentMonth >= protoEndsMonth))) {
        const validation = evaluatePrototypeValidation(model);
        const currentCultureScore = Number(cultureScore || 0);
        const newCultureScore = applyEngineeringCulture(currentCultureScore, validation);
        const cultureDelta = newCultureScore - currentCultureScore;

        let extraCostCharged = 0;
        let extraArcMessage = '';

        if (!validation.passed && validation.extraCostPct > 0) {
          const baseCost = Number(model.engineering_complexity ?? 50) * 1000;
          extraCostCharged = Math.round(baseCost * validation.extraCostPct);
          if (extraCostCharged > 0) {
            runningCash -= extraCostCharged;
            await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', extraCostCharged);
            await trx('company_ledger').insert({ company_id: companyId, game_year: currentYear, game_month: currentMonth, game_day: currentDay, entry_type: 'expense', description: `Prototype validation failure costs: ${model.name}`, amount: -extraCostCharged, balance_after: runningCash });
          }
          extraArcMessage = ` Development extended by ${validation.extraArcs} month(s).`;
        }

        const MONTHS_PER_YEAR = 12;
        const wrapMonth = (year: number, month: number) => {
          while (month > MONTHS_PER_YEAR) { month -= MONTHS_PER_YEAR; year++; }
          return { year, month };
        };

        const testEnd = wrapMonth(model.stage_testing_completes_year ?? currentYear, (model.stage_testing_completes_month ?? (currentMonth + 1)) + validation.extraArcs);
        const finalEnd = wrapMonth(model.development_completes_at_year ?? currentYear, (model.development_completes_at_month ?? (currentMonth + 1)) + validation.extraArcs);

        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ 
          dev_stage: 'testing', 
          stage_testing_completes_year: testEnd.year,
          stage_testing_completes_month: testEnd.month, 
          development_completes_at_year: finalEnd.year,
          development_completes_at_month: finalEnd.month, 
          prototype_validation_result: JSON.stringify(validation), 
          updated_at: trx.fn.now() 
        });
        await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).update({ engineering_culture_score: newCultureScore, last_updated: trx.fn.now() }).catch(() => {});

        const validationSummary = validation.passed ? `Prototype validation ${validation.resultClass} (confidence: ${validation.confidenceScore}%).` : `Prototype validation ${validation.resultClass}: ${validation.issues[0]}.${extraArcMessage} Extra cost: ${extraCostCharged.toLocaleString()}.`;
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${model.name} — ${validationSummary}`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay });
        
        // Update cascade variables in case it was extended
        testingEndsYear = testEnd.year;
        testingEndsMonth = testEnd.month;
        completesYear = finalEnd.year;
        completesMonth = finalEnd.month;
        devStage = 'testing';
      }

      // Stage: testing → ready_to_launch
      if (devStage === 'testing' && (currentYear > testingEndsYear || (currentYear === testingEndsYear && currentMonth >= testingEndsMonth))) {
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'ready_to_launch', updated_at: trx.fn.now() });
        devStage = 'ready_to_launch';
      }

      // Final: ready_to_launch (this part generates permanent assessment at the end of testing)
      if (currentYear > completesYear || (currentYear === completesYear && currentMonth >= completesMonth)) {
        const assessment = calculateEngineeringAssessment(model);
        const balanceRating = calculateBalanceRating(model);
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ development_status: 'ready_to_launch', dev_stage: 'ready_to_launch', engineering_assessment: JSON.stringify(assessment), engineering_balance_rating: balanceRating, updated_at: trx.fn.now() });
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `Vehicle development completed: ${model.name}.`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay });
      }
    }

    // ─── 0.5 Engineering Programmes Updates ─────────────────────────────
    let approvedResearchNames: string[] = [];
    const activeProgramme = await trx('manufacturing_engineering_programmes').where({ company_id: companyId }).whereIn('status', ['engineering', 'validation']).first();

    const countryAutoConfig = await trx('manufacturing_country_auto_config').where({ country_id: company.country_id }).first() ?? {};
    const EXP_CAPACITY  = Number(countryAutoConfig.expanded_capacity_per_month ?? 200);
    const EXP_MAX_LINES = Number(countryAutoConfig.expanded_max_lines ?? 2);
    const EXP_LEASE     = Number(countryAutoConfig.expanded_lease_cost_per_month ?? 45000);
    const EXP_MAINT     = Number(countryAutoConfig.expanded_maintenance_per_month ?? 15000);
    const EXP_WORKERS   = Number(countryAutoConfig.expanded_worker_capacity ?? 80);
    const storageCostPerUnit = Number(countryAutoConfig.storage_cost_per_unit_per_month ?? 150);

    let expansionCompletedNote = '';
    const expandingFactory = factories.find((f: any) => f.expansion_status === 'construction_underway');
    if (expandingFactory) {
      const compYear = Number(expandingFactory.expansion_completion_year);
      const compMonth   = Number(expandingFactory.expansion_completion_month);
      const isComplete = currentYear > compYear || (currentYear === compYear && currentMonth >= compMonth);

      if (isComplete) {
        await trx('manufacturing_factories').where({ id: expandingFactory.id }).update({ expansion_status: 'expanded', capacity_per_month: EXP_CAPACITY, lease_cost_per_month: EXP_LEASE, maintenance_cost_per_month: EXP_MAINT, worker_capacity: EXP_WORKERS, updated_at: trx.fn.now() });

        for (let lineNum = 2; lineNum <= EXP_MAX_LINES; lineNum++) {
          const alreadyExists = await trx('manufacturing_production_lines').where({ factory_id: expandingFactory.id, line_number: lineNum }).first();
          if (!alreadyExists) {
            await trx('manufacturing_production_lines').insert({ world_instance_id: company.world_instance_id, company_id: companyId, factory_id: expandingFactory.id, line_number: lineNum, quality_setting: 'Standard', target_units_per_month: 0, status: 'idle' });
          }
        }

        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `Workshop expansion completed. ${EXP_MAX_LINES} production lines now available (capacity: ${EXP_CAPACITY} units/Month).`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay });
        expansionCompletedNote = ` Factory Expansion Completed: Expanded Workshop — ${EXP_MAX_LINES} production lines, ${EXP_CAPACITY} units per Month capacity.`;

        factories.forEach((f: any) => {
          if (f.id === expandingFactory.id) { f.capacity_per_month = EXP_CAPACITY; f.lease_cost_per_month = EXP_LEASE; f.maintenance_cost_per_month = EXP_MAINT; f.worker_capacity = EXP_WORKERS; }
        });
      }
    }

    if (activeProgramme) {
      const isAtLeastValidation = currentYear > activeProgramme.validation_arc_year || (currentYear === activeProgramme.validation_arc_year && currentMonth >= activeProgramme.validation_month);
      const isAtLeastCompletion = currentYear > activeProgramme.completion_arc_year || (currentYear === activeProgramme.completion_arc_year && currentMonth >= activeProgramme.completion_month);
      const progName = ENGINEERING_PROGRAMMES_CATALOG[activeProgramme.programme_id]?.name || activeProgramme.programme_id;

      if (isAtLeastCompletion) {
        await trx('manufacturing_engineering_programmes').where({ id: activeProgramme.id }).update({ status: 'approved', updated_at: trx.fn.now() });
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${progName} was approved for company use.`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay });
        approvedResearchNames.push(progName);
      } else if (isAtLeastValidation && activeProgramme.status === 'engineering') {
        await trx('manufacturing_engineering_programmes').where({ id: activeProgramme.id }).update({ status: 'validation', updated_at: trx.fn.now() });
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${progName} entered technical validation.`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay });
      }
    }

    const approvedStandards = await trx('manufacturing_engineering_programmes').where({ company_id: companyId, status: 'approved' });
    const hasAssemblyTimeStudy = approvedStandards.some((p: any) => p.programme_id === 'assembly-time');
    const hasSPC               = approvedStandards.some((p: any) => p.programme_id === 'spc');
    const hasDurabilityVal     = approvedStandards.some((p: any) => p.programme_id === 'durability-val');
    const hasSafetyArch        = approvedStandards.some((p: any) => p.programme_id === 'safety-arch');
    const hasEconomyTune       = approvedStandards.some((p: any) => p.programme_id === 'economy-tune');

    let totalUnitsProduced = 0;
    let totalProductionCosts = 0;
    let totalDefectiveUnits = 0;
    let totalPlannedUnits = 0;

    const modelTracking = new Map<string, any>();
    const ensureModelTracking = (modelId: string, costPerUnit: number) => {
      if (!modelTracking.has(modelId)) modelTracking.set(modelId, { unitsProduced:0, defectiveUnits:0, productionCost:0, defectLoss:0, unitsSold:0, salesRevenue:0, marketingCost:0, costPerUnit });
      return modelTracking.get(modelId)!;
    };
    let workerCount      = staff.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
    let supervisorCount  = staff.find((s: any) => s.role === 'production-supervisor')?.quantity || 0;
    let inspectorCount   = staff.find((s: any) => s.role === 'quality-inspector')?.quantity || 0;

    const activeLineCount = productionLines.filter((l: any) => factories.some((f: any) => String(f.id) === String(l.factory_id))).length;

    const companyComponents = await trx('manufacturing_component_inventory').where({ company_id: companyId }).forUpdate();
    const compInventory = {
      engine: companyComponents.find((c: any) => c.component_id === 'comp_engine')?.units_in_stock || 0,
      transmission: companyComponents.find((c: any) => c.component_id === 'comp_transmission')?.units_in_stock || 0,
      tyres: companyComponents.find((c: any) => c.component_id === 'comp_tyres')?.units_in_stock || 0,
      steel: companyComponents.find((c: any) => c.component_id === 'comp_steel')?.units_in_stock || 0,
      glass: companyComponents.find((c: any) => c.component_id === 'comp_glass')?.units_in_stock || 0,
      electronics: companyComponents.find((c: any) => c.component_id === 'comp_electronics')?.units_in_stock || 0,
    };
    
    const BOM = { engine: 1, transmission: 1, tyres: 4, steel: 1, glass: 1, electronics: 1 };
    const BOM_COST = 35 + 18 + (4) + 20 + 5 + 12;

    for (const factory of factories) {
      const factoryType = await trx('manufacturing_factory_types').where({ id: factory.factory_type_id }).first();
      const factoryCapacityPerArc    = Number(factory.capacity_per_month);
      const factoryWorkerCapacity    = Number(factoryType.worker_requirement);

      const factoryLines = productionLines.filter((l: any) => String(l.factory_id) === String(factory.id));

      for (const line of factoryLines) {
        const targetUnits = Number(line.target_units_per_month);
        totalPlannedUnits += targetUnits;

        const engProdMods = deriveProductionModifiers(line as any);
        const requiredWorkers = targetUnits > 0 ? Math.ceil((targetUnits / factoryCapacityPerArc) * (factoryWorkerCapacity * engProdMods.assemblyHoursModifier)) : 0;

        let laborEfficiency: number;
        let lackedWorkers = false;
        if (requiredWorkers === 0) {
          laborEfficiency = 1.0;
        } else if (workerCount === 0) {
          laborEfficiency = 0.0;
          lackedWorkers = true;
        } else {
          laborEfficiency = Math.min(1.0, workerCount / requiredWorkers);
          if (!company.is_npc) {
            workerCount = Math.max(0, workerCount - requiredWorkers);
          }
        }

        let supervisorBonus = 0.0;
        if (supervisorCount > 0) {
          supervisorBonus = 0.05;
          if (!company.is_npc) supervisorCount -= 1;
        }
        const conditionFactor = Number(factory.condition) / 100;
        let finalEfficiency = Math.min(1.0, laborEfficiency * conditionFactor * (1 + supervisorBonus));
        if (hasAssemblyTimeStudy) finalEfficiency = Math.min(1.0, finalEfficiency * 1.05);

        let unitsProduced: number;
        if (company.is_npc) {
          unitsProduced = targetUnits;
        } else if (lackedWorkers) {
          unitsProduced = 0;
        } else {
          unitsProduced = Math.floor(targetUnits * finalEfficiency);
        }

        let maxByComponents = 9999999;
        let lackedComponents = false;
        if (!company.is_npc) {
          maxByComponents = Math.floor(compInventory.engine / BOM.engine);
          maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.transmission / BOM.transmission));
          maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.tyres / BOM.tyres));
          maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.steel / BOM.steel));
          maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.glass / BOM.glass));
          maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.electronics / BOM.electronics));
          if (maxByComponents <= 0 && targetUnits > 0) lackedComponents = true;
        }

        if (unitsProduced > maxByComponents) unitsProduced = maxByComponents;
        
        if (unitsProduced <= 0) {
          if (!company.is_npc && targetUnits > 0) {
            let reason = "Unknown reason.";
            if (lackedWorkers) reason = "Insufficient factory workers assigned to company.";
            else if (lackedComponents) reason = "Insufficient components in inventory.";
            
            await trx('company_records').insert({
              world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business',
              summary: `Production halted on line ${line.id}: ${reason}`,
              created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay
            });
          }
          continue;
        }

        if (!company.is_npc) {
          compInventory.engine -= unitsProduced * BOM.engine;
          compInventory.transmission -= unitsProduced * BOM.transmission;
          compInventory.tyres -= unitsProduced * BOM.tyres;
          compInventory.steel -= unitsProduced * BOM.steel;
          compInventory.glass -= unitsProduced * BOM.glass;
          compInventory.electronics -= unitsProduced * BOM.electronics;
        }

        const qualityKey = line.quality_setting || 'Standard';
        let baseDefectRate = QUALITY_DEFECT_RATES[qualityKey as keyof typeof QUALITY_DEFECT_RATES] ?? 0.03;
        if (hasDurabilityVal) baseDefectRate = Math.max(0.005, baseDefectRate - 0.005); // durability-val: −0.5% base defect
        
        let effectiveInspectors = Math.min(inspectorCount, Math.floor((baseDefectRate - 0.005) / 0.005));
        if (effectiveInspectors < 0) effectiveInspectors = 0;
        let inspectorReduction = effectiveInspectors * 0.005;
        if (hasSPC && effectiveInspectors > 0) inspectorReduction += 0.005;
        
        if (!company.is_npc) {
           inspectorCount = Math.max(0, inspectorCount - effectiveInspectors);
        }

        const effectiveDefectRate = Math.max(0.005, (baseDefectRate - inspectorReduction) * engProdMods.defectModifier);
        const defectiveUnits = Math.floor(unitsProduced * effectiveDefectRate);
        const sellableUnits  = unitsProduced - defectiveUnits;
        totalDefectiveUnits += defectiveUnits;

        const costPerUnit    = Number(line.manufacturing_cost_per_unit);
        const rawAssemblyCost = Math.max(0, costPerUnit - BOM_COST);
        const assemblyCost   = Math.round(rawAssemblyCost * engProdMods.labourCostModifier);
        
        let finalProductionCost = 0;
        if (company.is_npc) {
           finalProductionCost = Math.max(0, Math.round((unitsProduced * assemblyCost + unitsProduced * BOM_COST) * engProdMods.productionCostModifier));
        } else {
           finalProductionCost = Math.max(0, Math.round((unitsProduced * assemblyCost + unitsProduced * BOM_COST) * engProdMods.productionCostModifier - unitsProduced * BOM_COST));
        }
        
        const defectLoss     = Math.round(defectiveUnits * costPerUnit * engProdMods.productionCostModifier);

        runningCash          -= finalProductionCost;
        totalProductionCosts += finalProductionCost;
        totalUnitsProduced   += (sellableUnits + defectiveUnits); // Track total produced including defects

        const mt = ensureModelTracking(line.model_id_ref, costPerUnit);
        mt.unitsProduced   += (sellableUnits + defectiveUnits); // Track total produced (sellable + defective)
        mt.defectiveUnits  += defectiveUnits;
        mt.productionCost  += finalProductionCost;
        mt.defectLoss      += defectLoss;
        if (!mt.engineeringNotes) mt.engineeringNotes = engProdMods.engineeringProductionNotes;

        const existingInventory = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: line.model_id_ref }).first();
        const inventoryValue     = sellableUnits * costPerUnit;
        const storageCostPerArc  = Math.round(sellableUnits * storageCostPerUnit);

        if (existingInventory) {
          await trx('manufacturing_inventory').where({ id: existingInventory.id }).update({ units_in_stock: Number(existingInventory.units_in_stock) + sellableUnits, inventory_value: Number(existingInventory.inventory_value) + inventoryValue, storage_cost_per_month: Number(existingInventory.storage_cost_per_month) + storageCostPerArc, updated_at: trx.fn.now() });
        } else {
          await trx('manufacturing_inventory').insert({ world_instance_id: company.world_instance_id, company_id: companyId, vehicle_model_id: line.model_id_ref, units_in_stock: sellableUnits, inventory_value: inventoryValue, storage_cost_per_month: storageCostPerArc });
        }
      }

      // durability-val: reduces condition decay from 2pts to 1pt per month
      const conditionDecay = hasDurabilityVal ? 1 : 2;
      await trx('manufacturing_factories').where({ id: factory.id }).update({ condition: Math.max(10, Number(factory.condition) - conditionDecay), updated_at: trx.fn.now() });
    }

    await trx('manufacturing_component_inventory').where({ company_id: companyId, component_id: 'comp_engine' }).update({ units_in_stock: compInventory.engine, updated_at: trx.fn.now() });
    await trx('manufacturing_component_inventory').where({ company_id: companyId, component_id: 'comp_transmission' }).update({ units_in_stock: compInventory.transmission, updated_at: trx.fn.now() });
    await trx('manufacturing_component_inventory').where({ company_id: companyId, component_id: 'comp_tyres' }).update({ units_in_stock: compInventory.tyres, updated_at: trx.fn.now() });
    await trx('manufacturing_component_inventory').where({ company_id: companyId, component_id: 'comp_steel' }).update({ units_in_stock: compInventory.steel, updated_at: trx.fn.now() });
    await trx('manufacturing_component_inventory').where({ company_id: companyId, component_id: 'comp_glass' }).update({ units_in_stock: compInventory.glass, updated_at: trx.fn.now() });
    await trx('manufacturing_component_inventory').where({ company_id: companyId, component_id: 'comp_electronics' }).update({ units_in_stock: compInventory.electronics, updated_at: trx.fn.now() });

    let totalStaffWages = 0;
    for (const staffMember of staff) {
      const roleConfig = STAFF_ROLES.find(r => r.id === staffMember.role);
      if (roleConfig && staffMember.quantity > 0) totalStaffWages += roleConfig.wagePerArc * staffMember.quantity;
    }
    const actualWagesPaid = totalStaffWages;
    runningCash -= actualWagesPaid;

    let totalLeaseCosts = 0;
    for (const factory of allFactories) totalLeaseCosts += Number(factory.lease_cost_per_month);
    runningCash -= totalLeaseCosts;

    let totalMaintenanceCosts = 0;
    for (const factory of factories) {
      const conditionPct = Number(factory.condition) / 100;
      const baseMaintCost = Math.round(Number(factory.maintenance_cost_per_month) * (2.0 - conditionPct));
      const factoryLines = productionLines.filter((l: any) => l.factory_id === factory.id);
      let avgMaintModifier = 1.0;
      if (factoryLines.length > 0) {
        let sumMods = 0;
        for (const line of factoryLines) sumMods += deriveProductionModifiers(line as any).maintenanceModifier;
        avgMaintModifier = sumMods / factoryLines.length;
      }
      totalMaintenanceCosts += Math.round(baseMaintCost * avgMaintModifier);
    }
    runningCash -= totalMaintenanceCosts;

    const allInventory = await trx('manufacturing_inventory').where({ company_id: companyId });
    let totalStorageCosts = 0;
    for (const inv of allInventory) {
      if (Number(inv.units_in_stock) > 0) totalStorageCosts += Number(inv.units_in_stock) * storageCostPerUnit;
    }
    runningCash -= totalStorageCosts;

    const activeAllocationCount = await trx('manufacturing_market_allocations').where('company_id', companyId).where('units_allocated', '>', 0).count('id as cnt').first();
    const activeMarketCount = Number(activeAllocationCount?.cnt ?? 0);

    const marketStatsMap = new Map<string, any>();

    return {
      company,
      runningCash,
      totalProductionCosts,
      totalDefectiveUnits,
      totalPlannedUnits,
      totalUnitsProduced,
      totalStaffWages,
      actualWagesPaid,
      totalLeaseCosts,
      totalMaintenanceCosts,
      totalStorageCosts,
      totalWarrantyReserveCost: 0,
      modelTracking,
      activeMarketCount,
      approvedResearchNames,
      approvedStandards,   // pass through so sell loop can apply score boosts
      marketStatsMap,
      staff
    };
  }

  private static async settleForCompany(trx: any, pState: ParticipantState, salesResults: any[], clock: any, brandMap: Map<string, any>): Promise<void> {
    const currentYear = clock?.current_year ?? 1;
    const currentMonth = clock?.current_month ?? 1;
    const currentDay = clock?.current_day ?? 1;
    const companyId = pState.company.id;
    const company = pState.company;

    const countryAutoConfig = await trx('manufacturing_country_auto_config').where({ country_id: company.country_id }).first() ?? {};
    const storageCostPerUnit = Number(countryAutoConfig.storage_cost_per_unit_per_month ?? 150);
    const MARKETING_COSTS: Record<string, number> = {
      none: 0,
      local: Number(countryAutoConfig.marketing_cost_local ?? 3500),
      regional: Number(countryAutoConfig.marketing_cost_regional ?? 12000),
      national: Number(countryAutoConfig.marketing_cost_national ?? 35000),
    };
    const tierRank: Record<string, number> = { 'none': 0, 'local': 1, 'regional': 2, 'national': 3 };

    let totalGrossRevenue = 0;
    let totalUnitsSold = 0;
    let totalMarketingCosts = 0;

    const highestMktTierPerMarket = new Map<string, string>();
    for (const md of salesResults) {
       const mId = md.alloc.region_market_id;
       const t = md.mktTier || 'none';
       if (!highestMktTierPerMarket.has(mId) || tierRank[t] > tierRank[highestMktTierPerMarket.get(mId)!]) {
           highestMktTierPerMarket.set(mId, t);
       }
    }
    
    for (const [mId, t] of highestMktTierPerMarket.entries()) {
       const cost = MARKETING_COSTS[t] ?? 0;
       totalMarketingCosts += cost;
       pState.runningCash -= cost;
       const modelsInMarket = salesResults.filter(r => r.alloc.region_market_id === mId);
       if (modelsInMarket.length > 0 && cost > 0) {
           const splitCost = Math.round(cost / modelsInMarket.length);
           for (const md of modelsInMarket) {
               const mt = pState.modelTracking.get(md.alloc.vehicle_model_id);
               if (mt) mt.marketingCost += splitCost;
           }
       }
    }

    for (const md of salesResults) {
      const alloc = md.alloc;
      const mainReasonCode = md.mainReasonCode;
      const marketPurchaseCapacity = md.marketPurchaseCapacity;
      const totalHouseholds = md.totalHouseholds;

      const invRecord = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: alloc.vehicle_model_id }).first();
      const actualStock = invRecord ? Number(invRecord.units_in_stock) : 0;
      const unitsSold = Math.min(md.unitsSold, actualStock);

      if (unitsSold > 0) {
        const revenue = Math.round(unitsSold * Number(alloc.sale_price));
        totalGrossRevenue += revenue;
        totalUnitsSold += unitsSold;
        pState.runningCash += revenue;

        const mt = pState.modelTracking.get(alloc.vehicle_model_id);
        if (mt) {
           mt.unitsSold += unitsSold;
           mt.salesRevenue += revenue;
        }


        if (invRecord) {
          const newStock = Math.max(0, actualStock - unitsSold);
          const costPerUnit = Number(alloc.manufacturing_cost_per_unit);
          await trx('manufacturing_inventory').where({ id: invRecord.id }).update({
            units_in_stock: newStock, inventory_value: Math.max(0, newStock * costPerUnit), storage_cost_per_month: newStock * storageCostPerUnit, updated_at: trx.fn.now()
          });
        }

        // LAYER 2: Reset units_allocated to monthly_target after each settle.
        // This prevents the "draining to zero" bug where sales reduce the allocation
        // permanently. Layer 1's proportional cap handles inventory limits each tick.
        const resetTarget = Number(alloc.monthly_target ?? alloc.units_allocated ?? 0);
        await trx('manufacturing_market_allocations').where({ id: alloc.id }).update({
          units_allocated: resetTarget,
          updated_at: trx.fn.now()
        });
      }

      const marketShare = Math.min(1, unitsSold / Math.max(1, md.rawBuyerInterest));
      await trx('manufacturing_sales_results').insert({
        world_instance_id: company.world_instance_id, company_id: companyId, vehicle_model_id: alloc.vehicle_model_id, region_market_id: alloc.region_market_id,
        world_year: currentYear, world_month: currentMonth, units_sold: unitsSold, sale_price: alloc.sale_price, revenue: unitsSold * Number(alloc.sale_price),
        market_share_estimate: marketShare, addressable_households: totalHouseholds, market_purchase_capacity: marketPurchaseCapacity,
        affordability_multiplier: Math.round(md.affordability * 10000) / 10000, vehicle_market_fit_multiplier: Math.round(md.fitMultiplier * 10000) / 10000,
        awareness_multiplier: Math.round(md.awarenessMult * 10000) / 10000, trust_multiplier: Math.round(md.trustMult * 10000) / 10000,
        distribution_multiplier: Math.round(md.distMult * 10000) / 10000, marketing_multiplier: Math.round(md.mktMult * 10000) / 10000,
        raw_buyer_interest: Math.round(md.rawBuyerInterest * 10000) / 10000, final_assigned_demand: md.finalAssignedDemand, main_reason_code: mainReasonCode
      });

      if (!pState.marketStatsMap.has(alloc.region_market_id)) {
        pState.marketStatsMap.set(alloc.region_market_id, {
          marketPurchaseCapacity: marketPurchaseCapacity,
          awarenessSensitivity: Number(alloc.brand_awareness_sensitivity) || 1.0,
          trustSensitivity: Number(alloc.brand_trust_sensitivity) || 1.0,
          distStrength: Number(alloc.distribution_strength) || 0.7,
          totalUnitsSold: 0,
          weightedReliabilitySum: 0,
          weightedDefectRateSum: 0,
        });
      }
      const ms = pState.marketStatsMap.get(alloc.region_market_id);
      
      if (unitsSold > 0) {
         ms.totalUnitsSold += unitsSold;
         ms.weightedReliabilitySum += (unitsSold * Number(alloc.reliability_score));
         const mtForDefects = pState.modelTracking.get(alloc.vehicle_model_id);
         const defectRate = (mtForDefects && (mtForDefects.unitsProduced + mtForDefects.defectiveUnits) > 0)
            ? (mtForDefects.defectiveUnits / (mtForDefects.unitsProduced + mtForDefects.defectiveUnits))
            : 0;
         ms.weightedDefectRateSum += (unitsSold * defectRate);
      }
    }

    const totalUnitsUnsold = pState.totalUnitsProduced - totalUnitsSold;

    let totalWarrantyReserveCost = 0;
    for (const [mId, mt] of pState.modelTracking) {
      if (mt.unitsSold <= 0) continue;
      const mModel = await trx('manufacturing_vehicle_models').select('reliability_score', 'manufacturing_cost_per_unit').where({ id: mId }).first();
      if (!mModel) continue;
      const warrantyModifiers = deriveWarrantyReserve(mModel as any);
      const wReservePerUnit = warrantyModifiers.warrantyReservePerUnit(Number(mModel.manufacturing_cost_per_unit ?? 0));
      const wReserveTotal = wReservePerUnit * mt.unitsSold;
      totalWarrantyReserveCost += wReserveTotal;
    }
    if (totalWarrantyReserveCost > 0) {
      pState.runningCash -= totalWarrantyReserveCost;
      pState.totalWarrantyReserveCost = totalWarrantyReserveCost;
    }

    // Use actualWagesPaid (not totalStaffWages) to match cash movement and arc report
    const netProfit = totalGrossRevenue - pState.totalProductionCosts - pState.actualWagesPaid - pState.totalLeaseCosts - pState.totalMaintenanceCosts - pState.totalStorageCosts - totalMarketingCosts - totalWarrantyReserveCost;

    let finalNetProfit = netProfit;
    let taxPaid = 0;

    // Look up the state by its ID (headquarters_state_id is the state code like 'drennia-drennport')
    // We strip the country prefix if it exists to match the code in pol_states (which is just 'ironvale', 'drennport', etc.)
    const rawStateId = company.headquarters_state_id || '';
    const stateCode = rawStateId.replace(new RegExp(`^${company.country_id || ''}-`), '');

    const stateObj = await trx('pol_states')
      .where({ code: stateCode })
      .first();
    
    // Fallback: if not found by code, try to match by ID in case headquarters_state_id is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawStateId);
    const stateLookup = stateObj || (isUuid ? 
      await trx('pol_states').where({ id: rawStateId }).first() : null);

    if (stateLookup) {
      const policy = await trx('pol_state_policy').where({ state_id: stateLookup.id }).first();
      const taxRate = Number(policy?.industry_tax_rate || 0);
      if (taxRate > 0 && finalNetProfit > 0) {
        taxPaid = Math.round(finalNetProfit * taxRate);
        finalNetProfit -= taxPaid;
        pState.runningCash -= taxPaid;

        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: currentYear,
          game_month: currentMonth,
          game_day: currentDay,
          entry_type: 'tax',
          amount: -taxPaid,
          balance_after: pState.runningCash,
          description: `State Industry Tax (${(taxRate * 100).toFixed(1)}%) on profit`,
        });
      }
    }

    for (const [mId, mt] of pState.modelTracking) {
      const mInv = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: mId }).first();
      const endingInventory = mInv ? Number(mInv.units_in_stock) : 0;
      const storageCost = endingInventory * storageCostPerUnit;
      const directContribution = Math.round(mt.salesRevenue - mt.productionCost - mt.marketingCost - storageCost);
      const mModel = await trx('manufacturing_vehicle_models').where({ id: mId }).first();
      if (!mModel) continue;
      await trx.raw(`
        INSERT INTO manufacturing_model_snapshots
          (world_instance_id, company_id, model_id, world_year, world_month, units_produced, defective_units, units_sold, ending_inventory, sales_revenue, production_cost, defect_loss, marketing_cost, storage_cost, direct_contribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (company_id, model_id, world_year, world_month) DO NOTHING
      `, [
        company.world_instance_id, companyId, mId, currentYear, currentMonth, mt.unitsProduced, mt.defectiveUnits, mt.unitsSold, endingInventory, mt.salesRevenue, mt.productionCost, mt.defectLoss, mt.marketingCost, storageCost, directContribution,
      ]);
    }

    // Calculate True Book Value (Cash - Debt + Total Inventory Value + Fixed Assets + Intangibles)
    const inventoryQuery = await trx('manufacturing_inventory')
      .join('manufacturing_vehicle_models', 'manufacturing_inventory.vehicle_model_id', 'manufacturing_vehicle_models.id')
      .where('manufacturing_inventory.company_id', companyId)
      .select('manufacturing_inventory.units_in_stock', 'manufacturing_vehicle_models.manufacturing_cost_per_unit');
    
    let totalInventoryValue = 0;
    for (const item of inventoryQuery) {
      totalInventoryValue += Number(item.units_in_stock) * Number(item.manufacturing_cost_per_unit);
    }

    // Fixed Assets (Factories)
    const factoryQuery = await trx('manufacturing_factories').where({ company_id: companyId, status: 'active' }).select('capacity_per_month', 'expansion_cost');
    let totalFactoryValue = 0;
    for (const f of factoryQuery) {
      totalFactoryValue += Number(f.capacity_per_month || 0) * 50000 + Number(f.expansion_cost || 0);
    }

    // Intangibles (Brand Awareness & Reputation)
    const brandQuery = await trx('manufacturing_brand_awareness').where({ company_id: companyId }).select('awareness', 'reputation');
    let totalBrandValue = 0;
    for (const b of brandQuery) {
      totalBrandValue += (Number(b.awareness || 0) * Number(b.reputation || 0)) * 10000;
    }

    // Intangibles (Engineering Reputation)
    const engQuery = await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
    let totalEngineeringValue = 0;
    if (engQuery) {
      totalEngineeringValue = (Number(engQuery.reliability_rep || 0) + Number(engQuery.mfg_efficiency_rep || 0)) * 1000000;
    }
    
    const financesForBookVal = await trx('company_finances').where({ company_id: companyId }).first();
    const trueBookValue = Math.max(0, pState.runningCash - Number(financesForBookVal?.debt || 0) + totalInventoryValue + totalFactoryValue + totalBrandValue + totalEngineeringValue);

    await trx('company_finances')
      .where({ company_id: companyId })
      .update({ available_cash: pState.runningCash, last_arc_profit: finalNetProfit, company_value: trueBookValue, updated_at: trx.fn.now() });

    if (totalUnitsSold > 0) {
      await trx('companies').where({ id: companyId }).update({ reputation: trx.raw('LEAST(100, reputation + 1)'), updated_at: trx.fn.now() });
    }

    let localBrandReportLines: string[] = [];
    const engRepForTrust = await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
    const repReliabilityScore = Number(engRepForTrust?.reliability_rep ?? 0);
    const repMfgScore = Number(engRepForTrust?.mfg_efficiency_rep ?? 0);
    const repTrustSensBonus = repReliabilityScore >= 70 ? 0.15 : repReliabilityScore >= 50 ? 0.07 : 0;
    const repMfgDefectBonus = repMfgScore >= 70 ? 0.002 : 0;

    for (const [marketId, ms] of pState.marketStatsMap.entries()) {
      const mktTier = highestMktTierPerMarket.get(marketId) || 'none';
      const mktMarketingSpend = MARKETING_COSTS[mktTier] ?? 0;
      const totalMarketSold = ms.totalUnitsSold;
      const deliveryExposure = Math.min(1.0, totalMarketSold / Math.max(ms.marketPurchaseCapacity, 1));

      const existingArcResult = await trx('manufacturing_market_brand_arc_results').where({ company_id: companyId, region_market_id: marketId, world_month: currentMonth }).first();
      if (existingArcResult) continue;

      const currBrand = await trx('manufacturing_brand_awareness').where({ company_id: companyId, region_market_id: marketId }).first();
      let oldAwareness = 0; let oldTrust = 0; let isNewRow = true;
      if (currBrand) { oldAwareness = Number(currBrand.awareness); oldTrust = Number(currBrand.reputation); isNewRow = false; }

      const deliveryAwarenessGain = Math.min(1.0, deliveryExposure * 20);
      const brandKey = `${companyId}_${marketId}`;
      // Calculate marketing-driven awareness boost from the marketing spend at this tier
      const marketingBoost = awarenessGain(mktMarketingSpend);
      const boosted = Math.min(100, oldAwareness + marketingBoost + deliveryAwarenessGain);
      const newAwareness = Math.round(Math.min(100, Math.max(0, boosted)));
      const awarenessDelta = newAwareness - oldAwareness;
      let primaryAwarenessReason = 'None';
      if (marketingBoost > 0.5) primaryAwarenessReason = 'Marketing Campaign';
      else if (deliveryAwarenessGain > 0.1) primaryAwarenessReason = 'Market Presence';

      let trustDelta = 0; let primaryTrustReason = 'None'; let wReliability = 0; let wDefectRate = 0;
      if (totalMarketSold > 0) {
        wReliability = ms.weightedReliabilitySum / totalMarketSold;
        wDefectRate = ms.weightedDefectRateSum / totalMarketSold;
        const qualityConfidence = Math.min(1.0, Math.max(0.0, (0.75 * (wReliability / 100) + 0.25 * (1 - wDefectRate))));
        const effectiveTrustSens = ms.trustSensitivity + repTrustSensBonus;
        const targetTrust = qualityConfidence * 100 * effectiveTrustSens;
        const trustMomentum = (targetTrust - oldTrust) * 0.15;
        trustDelta = trustMomentum;
        primaryTrustReason = trustMomentum > 0 ? 'Quality Momentum' : 'Quality Issues';
      } else {
        trustDelta = oldTrust > 0 ? -Math.max(0.5, oldTrust * 0.05) : 0;
        primaryTrustReason = 'No Sales';
      }
      
      const newTrust = Math.round(Math.min(100, Math.max(0, oldTrust + trustDelta)));
      if (isNewRow) {
        await trx('manufacturing_brand_awareness').insert({ company_id: companyId, region_market_id: marketId, awareness: newAwareness, reputation: newTrust });
      } else {
        await trx('manufacturing_brand_awareness').where({ id: currBrand.id }).update({ awareness: newAwareness, reputation: newTrust, updated_at: trx.fn.now() });
      }

      await trx('manufacturing_market_brand_arc_results').insert({
        company_id: companyId, region_market_id: marketId, world_month: currentMonth,
        awareness_before: oldAwareness, awareness_after: newAwareness, awareness_delta: Math.round(awarenessDelta), market_marketing_spend: mktMarketingSpend,
        effective_marketing_tier: mktTier, trust_before: oldTrust, trust_after: newTrust,
        trust_delta: Math.round(trustDelta), weighted_reliability: Math.round(wReliability), weighted_defect_rate: wDefectRate,
        primary_awareness_reason: primaryAwarenessReason, primary_trust_reason: primaryTrustReason, total_units_sold: totalMarketSold
      });

      localBrandReportLines.push(`Market ${marketId.split('_').pop()}: Awareness ${newAwareness.toFixed(1)}% (${awarenessDelta >= 0 ? '+' : ''}${awarenessDelta.toFixed(1)}), Trust ${newTrust.toFixed(1)}% (${trustDelta >= 0 ? '+' : ''}${trustDelta.toFixed(1)})`);
    }

    if (localBrandReportLines.length > 0) {
      await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `Local Brand Updates:\n${localBrandReportLines.join('\n')}`, created_at_world_year: currentYear, created_at_world_month: currentMonth, created_at_world_day: currentDay });
    }

    if (totalUnitsSold > 0 && pState.activeMarketCount > 0) {
      const currentRelRep = Number(engRepForTrust?.reliability_rep ?? 0);
      const currentMfgRep = Number(engRepForTrust?.mfg_efficiency_rep ?? 0);
      let totalWRel = 0; let totalWDefect = 0; let globalTotalSold = 0;
      for (const ms of pState.marketStatsMap.values()) {
        globalTotalSold += ms.totalUnitsSold;
        totalWRel += ms.weightedReliabilitySum;
        totalWDefect += ms.weightedDefectRateSum;
      }
      
      const globalAvgReliability = totalWRel / globalTotalSold;
      const globalAvgDefectRate = totalWDefect / globalTotalSold;
      const targetRelRep = globalAvgReliability;
      const relRepDelta = (targetRelRep - currentRelRep) * 0.05;
      const newRelRep = Math.max(0, Math.min(100, currentRelRep + relRepDelta));
      const targetMfgRep = Math.max(0, 100 - (globalAvgDefectRate * 1000));
      const mfgRepDelta = (targetMfgRep - currentMfgRep) * 0.05;
      const newMfgRep = Math.max(0, Math.min(100, currentMfgRep + mfgRepDelta));
      
      if (engRepForTrust) {
        await trx('manufacturing_engineering_reputation').where({ id: engRepForTrust.id }).update({ reliability_rep: newRelRep, mfg_efficiency_rep: newMfgRep, last_updated: trx.fn.now() });
      } else {
        await trx('manufacturing_engineering_reputation').insert({ world_instance_id: company.world_instance_id, company_id: companyId, reliability_rep: newRelRep, mfg_efficiency_rep: newMfgRep, engineering_culture_score: 0 });
      }
    }

    const staffCountTotal = pState.staff.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const scaleFactor = Math.min(1.0, staffCountTotal / 1000);
    if (pState.approvedResearchNames.length > 0) {
       for (const rName of pState.approvedResearchNames) {
          await ManufacturingController.addCompanyKnowledge(trx, companyId, 'engineering_processes', 500);
       }
    }
    if (pState.totalUnitsProduced > 0) {
       const xpGain = Math.round(50 + (pState.totalUnitsProduced * 0.05 * scaleFactor));
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'production_efficiency', xpGain);
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'quality_control', xpGain);
    }
    if (totalUnitsSold > 0) {
       const xpGain = Math.round(50 + (totalUnitsSold * 0.05 * scaleFactor));
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'market_analysis', xpGain);
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'supply_chain', xpGain);
    }

    const costSummary = `Wages: ${pState.actualWagesPaid.toLocaleString()} | Lease: ${pState.totalLeaseCosts.toLocaleString()} | Maintenance: ${pState.totalMaintenanceCosts.toLocaleString()} | Storage: ${pState.totalStorageCosts.toLocaleString()} | Marketing: ${totalMarketingCosts.toLocaleString()} | Warranty Reserve: ${totalWarrantyReserveCost.toLocaleString()}`;
    
    let modelLines = '';
    for (const [mId, mt] of pState.modelTracking) {
      const mModel = await trx('manufacturing_vehicle_models').select('name').where({ id: mId }).first();
      modelLines += `\n- ${mModel?.name || mId}: ${mt.unitsProduced.toLocaleString()} produced (${mt.defectiveUnits.toLocaleString()} defective, defect loss: ${mt.defectLoss.toLocaleString()}), ${mt.unitsSold.toLocaleString()} sold. Revenue: ${mt.salesRevenue.toLocaleString()}, Cost: ${mt.productionCost.toLocaleString()}`;
      if (mt.engineeringNotes) {
         const notes = Array.isArray(mt.engineeringNotes) ? mt.engineeringNotes.join(' ') : mt.engineeringNotes;
         if (notes.length > 0) {
            modelLines += `\n  (Engineering notes: ${notes})`;
         }
      }
    }

    const reportData = {
      world_instance_id: company.world_instance_id, company_id: companyId, world_year: currentYear, world_month: currentMonth, world_day: 1,
      planned_units: pState.totalPlannedUnits, units_produced: pState.totalUnitsProduced, defective_units: pState.totalDefectiveUnits,
      units_sold: totalUnitsSold, units_unsold: Math.max(0, pState.totalUnitsProduced - totalUnitsSold),
      gross_revenue: totalGrossRevenue, sales_revenue: totalGrossRevenue, net_profit: netProfit, ending_cash: pState.runningCash,
      production_costs: pState.totalProductionCosts, staff_wages: pState.actualWagesPaid, factory_lease_costs: pState.totalLeaseCosts,
      factory_maintenance_costs: pState.totalMaintenanceCosts, inventory_storage_costs: pState.totalStorageCosts, marketing_costs: totalMarketingCosts,
      summary: `Production: ${pState.totalUnitsProduced.toLocaleString()} units (${pState.totalDefectiveUnits.toLocaleString()} defects).\nSales: ${totalUnitsSold.toLocaleString()} units.\n\nFinancials:\nGross Revenue: ${totalGrossRevenue.toLocaleString()}\nNet Profit: ${netProfit.toLocaleString()}\n\nOverheads:\n${costSummary}\n\nVehicle Breakdown:${modelLines}`
    };
    await trx('manufacturing_arc_reports').insert(reportData);

    if (company.is_npc) {
        const modelStates = new Map<string, any>();
        for (const md of salesResults) {
            const mId = md.alloc.vehicle_model_id;
            const ms = Math.min(1, md.unitsSold / Math.max(1, md.rawBuyerInterest));
            if (!modelStates.has(mId)) {
                modelStates.set(mId, { mId, units: 0, ms: 0, count: 0, rc: md.mainReasonCode });
            }
            const curr = modelStates.get(mId);
            curr.units += md.unitsSold;
            curr.ms += ms;
            curr.count += 1;
            if (md.mainReasonCode !== 'Zero Demand') curr.rc = md.mainReasonCode;
        }
        for (const s of modelStates.values()) {
            const avgMs = s.count > 0 ? s.ms / s.count : 0;
            await trx.raw(`
               INSERT INTO manufacturing_npc_state (company_id, vehicle_model_id, last_market_share, last_units_sold, zero_demand_streak, updated_at)
               VALUES (?, ?, ?, ?, ?, NOW())
               ON CONFLICT (company_id, vehicle_model_id) DO UPDATE SET
               last_units_sold = ?, zero_demand_streak = CASE WHEN ? = 'Zero Demand' THEN manufacturing_npc_state.zero_demand_streak + 1 ELSE 0 END, updated_at = NOW()
            `, [companyId, s.mId, avgMs, s.units, 0, s.units, s.rc]);
        }
    }
  }

  /**
   * Shared month pipeline for one country: NPC decisions -> production ->
   * pooled sales -> settlement -> politics hook.
   * Used by both the admin process-company endpoint and the world tick system.
   * Returns processedCompanies = 0 (no throw) when the month is already processed.
   */
  public static async processCountryMonth(trx: any, countryId: string, clock: any): Promise<{ processedCompanies: number }> {
        const currentYear = clock?.current_year ?? 1;
        const currentMonth = clock?.current_month ?? 1;

        // Obtain a row lock on the country to strictly serialize country-level processing and prevent double-processing
        await trx('countries').where({ id: countryId }).forUpdate().first();

        // 1. RESOLVE PARTICIPANTS — every manufacturing company in this country (players + NPCs)
        const allCompanies = await trx('companies')
          .where({ country_id: countryId, industry_id: 'manufacturing', status: 'active' });

        const participants: any[] = [];
        const processedCompanyIds = new Set<string>();

        for (const comp of allCompanies) {
           const existingReport = await trx('manufacturing_arc_reports')
             .where({ company_id: comp.id, world_year: currentYear, world_month: currentMonth })
             .first();
             
           participants.push(comp);
           if (existingReport) {
             processedCompanyIds.add(comp.id);
           }
        }
        
        if (processedCompanyIds.size === participants.length) {
           return { processedCompanies: 0 };
        }

        // 2. DECIDE (NPCs only)
        (global as any).tickProgress = `Processing country: ${countryId} - Step 2: Decide (NPCs)`;
        for (const company of participants) {
           if (company.is_npc && !processedCompanyIds.has(company.id)) {
              await runNpcBrainForCompany(trx, company.id, currentYear, currentMonth);
           }
        }

        // 3. PRODUCE (per participant)
        (global as any).tickProgress = `Processing country: ${countryId} - Step 3: Produce`;
        const participantStates = [];
        for (const company of participants) {
           const pState = await ManufacturingController.produceForCompany(trx, company, clock);
           participantStates.push(pState);
        }

        // 4. SELL (pooled, per market)
        const allMarketAllocations = [];
        for (const company of participants) {
           const marketAllocations = await trx('manufacturing_market_allocations')
             .join('manufacturing_vehicle_models', 'manufacturing_market_allocations.vehicle_model_id', 'manufacturing_vehicle_models.id')
             .join('manufacturing_region_markets', 'manufacturing_market_allocations.region_market_id', 'manufacturing_region_markets.id')
             .where('manufacturing_market_allocations.company_id', company.id)
             .where('manufacturing_market_allocations.units_allocated', '>', 0)
             .whereIn('manufacturing_vehicle_models.development_status', ['launched', 'discontinued'])
             .select(
               'manufacturing_market_allocations.*',
               'manufacturing_vehicle_models.name as model_name',
               'manufacturing_vehicle_models.vehicle_class',
               'manufacturing_vehicle_models.target_segment',
               'manufacturing_vehicle_models.sale_price',
               'manufacturing_vehicle_models.manufacturing_cost_per_unit',
               'manufacturing_vehicle_models.reliability_score',
               'manufacturing_vehicle_models.performance_score',
               'manufacturing_vehicle_models.fuel_efficiency_score',
               'manufacturing_vehicle_models.appeal_score',
               'manufacturing_vehicle_models.cargo_score',
               'manufacturing_region_markets.population',
               'manufacturing_region_markets.average_income',
               'manufacturing_region_markets.economic_multiplier',
               'manufacturing_region_markets.preference_compact',
               'manufacturing_region_markets.preference_sedan',
               'manufacturing_region_markets.preference_utility_van',
               'manufacturing_region_markets.competition_level',
               'manufacturing_region_markets.market_tier',
               'manufacturing_region_markets.distribution_strength',
               'manufacturing_region_markets.avg_household_size',
               'manufacturing_region_markets.vehicle_ownership_rate',
               'manufacturing_region_markets.baseline_replacement_rate',
               'manufacturing_region_markets.first_time_buyer_rate',
               'manufacturing_region_markets.purchase_need_intensity',
               'manufacturing_region_markets.vehicle_price_comfort_ratio',
               'manufacturing_region_markets.price_sensitivity',
               'manufacturing_region_markets.preference_economy',
               'manufacturing_region_markets.preference_standard',
               'manufacturing_region_markets.preference_premium',
               'manufacturing_region_markets.vehicle_attribute_weights',
               'manufacturing_region_markets.brand_awareness_sensitivity',
               'manufacturing_region_markets.brand_trust_sensitivity'
             );

             // ── LAYER 1: Proportional Inventory Cap ──────────────────────────
             // Sync each allocation's units_allocated to the player's monthly_target,
             // then proportionally cap by actual inventory so the demand engine sees
             // accurate supply. The DB is NOT updated here — only in-memory objects.
             const modelInventoryCache = new Map<string, number>();
             for (const alloc of marketAllocations) {
               // Reset to the player's standing monthly target (fall back to units_allocated if column missing)
               alloc.units_allocated = Number(alloc.monthly_target ?? alloc.units_allocated ?? 0);

               const modelId = alloc.vehicle_model_id;
               if (!modelInventoryCache.has(modelId)) {
                 const invRow = await trx('manufacturing_inventory')
                   .where({ company_id: company.id, vehicle_model_id: modelId })
                   .first();
                 modelInventoryCache.set(modelId, invRow ? Number(invRow.units_in_stock) : 0);
               }
             }

             // Group by model, then proportionally distribute inventory
             const allocationsByModel = new Map<string, any[]>();
             for (const alloc of marketAllocations) {
               if (!allocationsByModel.has(alloc.vehicle_model_id)) {
                 allocationsByModel.set(alloc.vehicle_model_id, []);
               }
               allocationsByModel.get(alloc.vehicle_model_id)!.push(alloc);
             }
             for (const [modelId, modelAllocs] of allocationsByModel.entries()) {
               const totalInventory = modelInventoryCache.get(modelId) ?? 0;
               const totalTargeted = modelAllocs.reduce((s, a) => s + Number(a.units_allocated), 0);
               if (totalTargeted > 0 && totalInventory < totalTargeted) {
                 // Inventory is scarce — distribute proportionally
                 for (const alloc of modelAllocs) {
                   const proportion = Number(alloc.units_allocated) / totalTargeted;
                   alloc.units_allocated = Math.floor(totalInventory * proportion);
                 }
               } else if (totalTargeted > 0) {
                 // Inventory sufficient — cap each alloc at its monthly target (already set above)
               }
             }
             // ─────────────────────────────────────────────────────────────────

             // ── Engineering Programme Score Boosts ───────────────────────────
             // Apply economy-tune (+5 fuel efficiency, +2 appeal) and
             // safety-arch (+8 reliability) as in-memory bonuses to alloc objects
             // so simulateSalesDemand uses the boosted scores.
             const pState = participantStates.find((ps: any) => ps.company.id === company.id);
             if (pState) {
               const hasEcoTune   = pState.approvedStandards.some((p: any) => p.programme_id === 'economy-tune');
               const hasSafetyAr  = pState.approvedStandards.some((p: any) => p.programme_id === 'safety-arch');
               if (hasEcoTune || hasSafetyAr) {
                 for (const alloc of marketAllocations) {
                   if (hasEcoTune) {
                     alloc.fuel_efficiency_score = Math.min(100, Number(alloc.fuel_efficiency_score ?? 60) + 5);
                     alloc.appeal_score          = Math.min(100, Number(alloc.appeal_score ?? 50) + 2);
                   }
                   if (hasSafetyAr) {
                     alloc.reliability_score = Math.min(100, Number(alloc.reliability_score ?? 60) + 8);
                   }
                 }
               }
             }
             // ─────────────────────────────────────────────────────────────────

             allMarketAllocations.push(...marketAllocations.filter((a: any) => a.units_allocated > 0));
        }

        const brandMap = new Map<string, any>();
        for (const company of participants) {
           const brandData = await trx('manufacturing_brand_awareness').where({ company_id: company.id });
           for (const b of brandData) {
              const key = `${company.id}_${b.region_market_id}`;
              brandMap.set(key, b);
           }
        }

        const MARKETING_MULT: Record<string, number> = { none: 1.0, local: 1.15, regional: 1.30, national: 1.50 };
        const companySalesManagerBonus = new Map<string, number>();
        for (const pState of participantStates) {
           const salesManagerCount = pState.staff.find((s: any) => s.role === 'sales-manager')?.quantity || 0;
           const usefulSalesManagers = Math.min(salesManagerCount, pState.activeMarketCount);
           companySalesManagerBonus.set(pState.company.id, Math.min(usefulSalesManagers * 0.04, 0.16));
        }

        (global as any).tickProgress = `Processing country: ${countryId} - Step 4: Simulate Sales Demand`;
        const pooledSalesResults = ManufacturingController.simulateSalesDemand(
          allMarketAllocations,
          brandMap,
          MARKETING_MULT,
          companySalesManagerBonus
        );


        // 5. SETTLE (per participant)
        (global as any).tickProgress = `Processing country: ${countryId} - Step 5: Settle`;
        for (const pState of participantStates) {
           const compResults = pooledSalesResults.filter((r: any) => r.alloc.company_id === pState.company.id);
           await ManufacturingController.settleForCompany(trx, pState, compResults, clock, brandMap);
        }

        // Process Political Month Hook
        (global as any).tickProgress = `Processing country: ${countryId} - Step 6: Politics Hook`;
        const activeState = await trx('pol_states')
          .where({ country_id: countryId, is_active: true })
          .first();
        if (activeState) {
          // Politics runs on a MONOTONIC arc (absolute month), not the calendar
          // month, so cycle scheduling / AP refresh compare against the same base.
          await processPoliticalArc(trx, activeState.id, worldClockToArc(clock));
        }

        return { processedCompanies: participants.length };
  } // End of processCountryMonth

  // POST /admin/manufacturing/process-company/:companyId
  // Admin force-processing of a single country's month (kept for testing).
  // Note: character aging is handled by the world tick service, not here.
  public static async processManufacturingArc(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      if (!companyId) return next(new AppError('Missing or invalid fields: companyId', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const playerCompany = await trx('companies').where({ id: companyId }).first();
        if (!playerCompany) throw new AppError('Company not found', 404, 'NOT_FOUND');
        if (playerCompany.industry_id !== 'manufacturing') throw new AppError('Not a manufacturing company', 400, 'WRONG_INDUSTRY');

        const clock = await trx('world_clock').first();
        const outcome = await ManufacturingController.processCountryMonth(trx, playerCompany.country_id, clock);
        if (outcome.processedCompanies === 0) {
          throw new AppError(`This month (Year ${clock?.current_year ?? 1}, month ${clock?.current_month ?? 1}) is already processed for this region`, 400, 'ALREADY_PROCESSED');
        }

        return { message: 'Month processed successfully for region', processedCompanies: outcome.processedCompanies };
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      next(error);
    }
  } // End of processManufacturingArc

  public static async forceUnstuckAllVehicles(trx: any, clock: any) {
    const currentYear = clock?.current_year ?? 1;
    const currentMonth = clock?.current_month ?? 1;
    const currentDay = clock?.current_day ?? 1;

    const developingModels = await trx('manufacturing_vehicle_models')
      .where({ status: 'active', development_status: 'in_development' });

    let fixedCount = 0;
    for (const model of developingModels) {
      const companyId = model.company_id;
      const company = await trx('companies').where({ id: companyId }).first();
      if (!company) continue;

      const knowledgeRows = await trx('manufacturing_company_knowledge').where({ company_id: companyId });
      const knowledgeXpMap: Record<string, number> = {};
      for (const k of knowledgeRows) knowledgeXpMap[k.domain] = Number(k.xp_points);

      const engRepForCulture = await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
      const cultureScore = Number(engRepForCulture?.engineering_culture_score ?? 0);

      let devStage = model.dev_stage as string | null;
      const initialStage = devStage;
      let runningCash = (await trx('company_finances').where({ company_id: companyId }).first())?.available_cash ?? 0;

      let engEndsYear = model.stage_engineering_completes_year ?? 1;
      let engEndsMonth = model.stage_engineering_completes_month ?? 1;
      let protoEndsYear = model.stage_prototype_completes_year ?? 1;
      let protoEndsMonth = model.stage_prototype_completes_month ?? 1;
      let testingEndsYear = model.stage_testing_completes_year ?? 1;
      let testingEndsMonth = model.stage_testing_completes_month ?? 1;
      let completesYear = model.development_completes_at_year ?? 1;
      let completesMonth = model.development_completes_at_month ?? 1;

      if (devStage === 'engineering' && (currentYear > engEndsYear || (currentYear === engEndsYear && currentMonth >= engEndsMonth))) {
        const bonuses = applyKnowledgeBonuses(knowledgeXpMap);
        const newReliability = Math.min(100, Number(model.reliability_score ?? 60) + bonuses.reliabilityBonus);
        const newMfgFriendliness = Math.min(100, Number(model.manufacturing_friendliness ?? 50) + bonuses.mfgFriendlinessBonus);
        const newConfidence = Math.min(100, Number(model.prototype_confidence ?? 50) + bonuses.prototypeConfidenceBonus);
        const newComplexity = Math.max(10, Number(model.engineering_complexity ?? 50) - bonuses.engineeringComplexityReduction);
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'prototype', reliability_score: newReliability, manufacturing_friendliness: newMfgFriendliness, prototype_confidence: newConfidence, engineering_complexity: newComplexity, updated_at: trx.fn.now() });
        devStage = 'prototype';
      }

      if (devStage === 'prototype' && (currentYear > protoEndsYear || (currentYear === protoEndsYear && currentMonth >= protoEndsMonth))) {
        const validation = evaluatePrototypeValidation(model);
        const currentCultureScore = Number(cultureScore || 0);
        const newCultureScore = applyEngineeringCulture(currentCultureScore, validation);
        if (!validation.passed && validation.extraCostPct > 0) {
          const baseCost = Number(model.engineering_complexity ?? 50) * 1000;
          const extraCostCharged = Math.round(baseCost * validation.extraCostPct);
          if (extraCostCharged > 0) {
            runningCash -= extraCostCharged;
            await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', extraCostCharged);
          }
        }
        const MONTHS_PER_YEAR = 12;
        const wrapMonth = (year: number, month: number) => { while (month > MONTHS_PER_YEAR) { month -= MONTHS_PER_YEAR; year++; } return { year, month }; };
        const testEnd = wrapMonth(model.stage_testing_completes_year ?? currentYear, (model.stage_testing_completes_month ?? (currentMonth + 1)) + validation.extraArcs);
        const finalEnd = wrapMonth(model.development_completes_at_year ?? currentYear, (model.development_completes_at_month ?? (currentMonth + 1)) + validation.extraArcs);
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'testing', stage_testing_completes_year: testEnd.year, stage_testing_completes_month: testEnd.month, development_completes_at_year: finalEnd.year, development_completes_at_month: finalEnd.month, prototype_validation_result: JSON.stringify(validation), updated_at: trx.fn.now() });
        testingEndsYear = testEnd.year; testingEndsMonth = testEnd.month;
        completesYear = finalEnd.year; completesMonth = finalEnd.month;
        devStage = 'testing';
      }

      if (devStage === 'testing' && (currentYear > testingEndsYear || (currentYear === testingEndsYear && currentMonth >= testingEndsMonth))) {
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'ready_to_launch', updated_at: trx.fn.now() });
        devStage = 'ready_to_launch';
      }

      if (currentYear > completesYear || (currentYear === completesYear && currentMonth >= completesMonth)) {
        const assessment = calculateEngineeringAssessment(model);
        const balanceRating = calculateBalanceRating(model);
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ development_status: 'ready_to_launch', dev_stage: 'ready_to_launch', engineering_assessment: JSON.stringify(assessment), engineering_balance_rating: balanceRating, updated_at: trx.fn.now() });
        devStage = 'ready_to_launch';
      }

      if (devStage !== initialStage) {
        fixedCount++;
      }
    }
    return fixedCount;
  }


  // PATCH /companies/:companyId/manufacturing/production/lines/:lineId/pause
  public static async pauseProductionLine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, lineId } = req.params;
      if (!userId || !companyId || !lineId) return next(new AppError('Missing or invalid fields: userId, companyId, lineId', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const line = await trx('manufacturing_production_lines')
          .where({ id: lineId, company_id: companyId }).first();
        if (!line) throw new AppError('Production line not found', 404, 'NOT_FOUND');
        if (line.status !== 'active') throw new AppError('Only active production lines can be paused', 400, 'BAD_REQUEST');

        await trx('manufacturing_production_lines')
          .where({ id: lineId })
          .update({ status: 'paused', updated_at: trx.fn.now() });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /companies/:companyId/manufacturing/production/lines/:lineId/resume
  public static async resumeProductionLine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, lineId } = req.params;
      if (!userId || !companyId || !lineId) return next(new AppError('Missing or invalid fields: userId, companyId, lineId', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const line = await trx('manufacturing_production_lines')
          .where({ id: lineId, company_id: companyId }).first();
        if (!line) throw new AppError('Production line not found', 404, 'NOT_FOUND');
        if (line.status !== 'paused') throw new AppError('Only paused production lines can be resumed', 400, 'BAD_REQUEST');
        if (!line.assigned_vehicle_model_id) throw new AppError('No model assigned — configure a production plan first', 400, 'NO_MODEL');

        await trx('manufacturing_production_lines')
          .where({ id: lineId })
          .update({ status: 'active', updated_at: trx.fn.now() });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
  // GET /companies/:companyId/manufacturing/markets
  public static async getMarkets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      if (!userId || !companyId) return next(new AppError('Missing or invalid fields: userId, companyId', 400, 'BAD_REQUEST'));

      const { company } = await verifyManufacturingCompany(db, userId, companyId);

      // All markets for this company's country
      let markets = await db('manufacturing_region_markets')
        .whereRaw('LOWER(country_id) = LOWER(?)', [company.country_id || 'drennia'])
        .where(function() {
          this.where('status', 'active').orWhereNull('status').orWhere('status', '');
        })
        .orderBy('population', 'desc');

      if (!markets || markets.length === 0) {
        markets = await db('manufacturing_region_markets')
          .whereRaw('LOWER(country_id) = LOWER(?)', ['drennia'])
          .where(function() {
            this.where('status', 'active').orWhereNull('status').orWhere('status', '');
          })
          .orderBy('population', 'desc');
      }

      // All allocations for this company
      const allocations = await db('manufacturing_market_allocations')
        .where({ company_id: companyId });

      // Brand awareness per market
      const brandData = await db('manufacturing_brand_awareness')
        .where({ company_id: companyId });

      // Latest sales results
      const recentSales = await db('manufacturing_sales_results')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(50);

      // Latest brand results
      const recentBrandResults = await db('manufacturing_market_brand_arc_results')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(50);

      const { companyAwareness, companyReputation } = await ManufacturingController.getCompanyAwarenessAndTrust(db, companyId, company.country_id);

      const staff = await db('company_staff').where({ company_id: companyId });
      const salesManagerCount = staff.find((s: any) => s.role === 'sales-manager')?.quantity || 0;
      
      const activeAllocationCount = await db('manufacturing_market_allocations')
        .where('company_id', companyId)
        .where('units_allocated', '>', 0)
        .count('id as cnt')
        .first();
      const activeMarketCount = Number(activeAllocationCount?.cnt ?? 0);
      const usefulSalesManagers = Math.min(salesManagerCount, activeMarketCount);
      const salesManagerBonus  = Math.min(usefulSalesManagers * 0.04, 0.16);

      const MARKETING_MULT: Record<string, number> = {
        none: 1.0, local: 1.15, regional: 1.30, national: 1.50,
      };

      const joinedAllocations = await db('manufacturing_market_allocations')
        .join('manufacturing_vehicle_models', 'manufacturing_market_allocations.vehicle_model_id', 'manufacturing_vehicle_models.id')
        .join('manufacturing_region_markets', 'manufacturing_market_allocations.region_market_id', 'manufacturing_region_markets.id')
        .where('manufacturing_market_allocations.company_id', companyId)
        .where('manufacturing_market_allocations.units_allocated', '>', 0)
        .whereIn('manufacturing_vehicle_models.development_status', ['launched', 'discontinued'])
        .select(
            'manufacturing_market_allocations.*',
            'manufacturing_vehicle_models.name as model_name',
            'manufacturing_vehicle_models.vehicle_class',
            'manufacturing_vehicle_models.target_segment',
            'manufacturing_vehicle_models.sale_price',
            'manufacturing_vehicle_models.manufacturing_cost_per_unit',
            'manufacturing_vehicle_models.reliability_score',
            'manufacturing_vehicle_models.performance_score',
            'manufacturing_vehicle_models.fuel_efficiency_score',
            'manufacturing_vehicle_models.appeal_score',
            'manufacturing_vehicle_models.cargo_score',
            'manufacturing_region_markets.population',
            'manufacturing_region_markets.average_income',
            'manufacturing_region_markets.economic_multiplier',
            'manufacturing_region_markets.preference_compact',
            'manufacturing_region_markets.preference_sedan',
            'manufacturing_region_markets.preference_utility_van',
            'manufacturing_region_markets.competition_level',
            'manufacturing_region_markets.market_tier',
            'manufacturing_region_markets.distribution_strength',
            'manufacturing_region_markets.avg_household_size',
            'manufacturing_region_markets.vehicle_ownership_rate',
            'manufacturing_region_markets.baseline_replacement_rate',
            'manufacturing_region_markets.first_time_buyer_rate',
            'manufacturing_region_markets.purchase_need_intensity',
            'manufacturing_region_markets.vehicle_price_comfort_ratio',
            'manufacturing_region_markets.price_sensitivity',
            'manufacturing_region_markets.preference_economy',
            'manufacturing_region_markets.preference_standard',
            'manufacturing_region_markets.preference_premium',
            'manufacturing_region_markets.vehicle_attribute_weights'
        );

      const brandMap = new Map<string, any>();
      for (const b of brandData) {
        brandMap.set(`${companyId}_${b.region_market_id}`, b);
      }

      const salesBonusMap = new Map<string, number>();
      salesBonusMap.set(companyId, salesManagerBonus);

      // Apply Layer 1 proportional inventory cap to the forecast so the player sees
      // the same effective supply numbers as the real tick will use.
      const forecastInventoryCache = new Map<string, number>();
      for (const alloc of joinedAllocations) {
        alloc.units_allocated = Number(alloc.monthly_target ?? alloc.units_allocated ?? 0);
        if (!forecastInventoryCache.has(alloc.vehicle_model_id)) {
          const invRow = await db('manufacturing_inventory')
            .where({ company_id: companyId, vehicle_model_id: alloc.vehicle_model_id })
            .first();
          forecastInventoryCache.set(alloc.vehicle_model_id, invRow ? Number(invRow.units_in_stock) : 0);
        }
      }
      const forecastByModel = new Map<string, any[]>();
      for (const alloc of joinedAllocations) {
        if (!forecastByModel.has(alloc.vehicle_model_id)) forecastByModel.set(alloc.vehicle_model_id, []);
        forecastByModel.get(alloc.vehicle_model_id)!.push(alloc);
      }
      for (const [modelId, modelAllocs] of forecastByModel.entries()) {
        const totalInv = forecastInventoryCache.get(modelId) ?? 0;
        const totalTarget = modelAllocs.reduce((s, a) => s + Number(a.units_allocated), 0);
        if (totalTarget > 0 && totalInv < totalTarget) {
          for (const alloc of modelAllocs) {
            alloc.units_allocated = Math.floor(totalInv * (Number(alloc.units_allocated) / totalTarget));
          }
        }
      }

      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations.filter((a: any) => a.units_allocated > 0),
          brandMap,
          MARKETING_MULT,
          salesBonusMap
      );

      res.status(200).json({ markets, allocations, brandData, recentSales, recentBrandResults, forecast, companyAwareness, companyReputation });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/markets/allocate
  public static async setAllocation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { vehicleModelId, regionMarketId, unitsAllocated, marketingTier } = req.body;

      if (!userId || !companyId || !vehicleModelId || !regionMarketId) {
        return next(new AppError('vehicleModelId, regionMarketId required', 400, 'BAD_REQUEST'));
      }

      const validTiers = ['none', 'local', 'regional', 'national'];
      if (marketingTier && !validTiers.includes(marketingTier)) {
        return next(new AppError('Invalid marketing tier', 400, 'BAD_REQUEST'));
      }

      const units = Number(unitsAllocated ?? 0);
      if (units < 0) return next(new AppError('Units cannot be negative', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);

        // Model must be launched and belong to this company
        const model = await trx('manufacturing_vehicle_models')
          .where({ id: vehicleModelId, company_id: companyId, status: 'active', development_status: 'launched' })
          .first();
        if (!model) throw new AppError('Model not found or not launched', 404, 'NOT_FOUND');

        // Market must exist
        const market = await trx('manufacturing_region_markets')
          .where({ id: regionMarketId, status: 'active' })
          .first();
        if (!market) throw new AppError('Market not found', 404, 'NOT_FOUND');

        // COUNTRY BOUNDARY — market must belong to the same country as the company
        if (market.country_id !== company.country_id) {
          throw new AppError('This market does not belong to your company\'s country', 403, 'CROSS_COUNTRY');
        }

        // Cannot over-allocate: total allocated for this model across all markets
        // = current stock in inventory
        const inventory = await trx('manufacturing_inventory')
          .where({ company_id: companyId, vehicle_model_id: vehicleModelId })
          .forUpdate()
          .first();
        const totalStock = Number(inventory?.units_in_stock ?? 0);

        // Current allocations for this model excluding the current record
        const otherAllocations = await trx('manufacturing_market_allocations')
          .where({ company_id: companyId, vehicle_model_id: vehicleModelId })
          .whereNot({ region_market_id: regionMarketId })
          .sum('units_allocated as total')
          .first();
        const othersTotal = Number(otherAllocations?.total ?? 0);

        // Fetch existing allocation to allow reducing it if state is bugged
        const existing = await trx('manufacturing_market_allocations')
          .where({ company_id: companyId, vehicle_model_id: vehicleModelId, region_market_id: regionMarketId })
          .first();
        const currentAlloc = existing ? Number(existing.units_allocated) : 0;

        // NOTE: We intentionally removed the strict real-time stock limits here. 
        // This allows allocations to act as "Standing Orders" or target max sales,
        // preventing the problem where newly manufactured cars are unallocatable for the month.
        // The simulation engine inside simulateSalesDemand / settleForCompany 
        // strictly uses Math.min(unitsSold, inventory) to prevent ghost cars.

        if (existing) {
          await trx('manufacturing_market_allocations').where({ id: existing.id }).update({
            units_allocated: units,
            // monthly_target: units, // Disabled to prevent crash on prod DB without migration 0047
            marketing_tier: marketingTier ?? existing.marketing_tier,
            updated_at: trx.fn.now(),
          });
        } else {
          await trx('manufacturing_market_allocations').insert({
            world_instance_id: company.world_instance_id,
            company_id: companyId,
            vehicle_model_id: vehicleModelId,
            region_market_id: regionMarketId,
            units_allocated: units,
            // monthly_target: units, // Disabled to prevent crash on prod DB without migration 0047
            marketing_tier: marketingTier ?? 'none',
          });
        }


      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /companies/:companyId/manufacturing/markets/allocations/:allocId
  public static async removeAllocation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, allocId } = req.params;
      if (!userId || !companyId || !allocId) return next(new AppError('Missing or invalid fields: userId, companyId, allocId', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);
        const alloc = await trx('manufacturing_market_allocations').where({ id: allocId, company_id: companyId }).first();
        if (!alloc) throw new AppError('Allocation not found', 404, 'NOT_FOUND');
        await trx('manufacturing_market_allocations').where({ id: allocId }).delete();
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
  // POST /companies/:companyId/manufacturing/programmes/start
  public static async startEngineeringProgramme(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;
      const { programmeId } = req.body;

      if (!userId || !companyId || !programmeId) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      const progDef = ENGINEERING_PROGRAMMES_CATALOG[programmeId];
      if (!progDef) return next(new AppError('Unknown engineering programme', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company, currencySymbol: progSym, autoConfig } = await verifyManufacturingCompany(trx, userId, companyId);

        // 1. Check if already active
        const activeProg = await trx('manufacturing_engineering_programmes')
          .where({ company_id: companyId })
          .whereIn('status', ['engineering', 'validation'])
          .forUpdate()
          .first();
        if (activeProg) {
          throw new AppError(`Your engineering team is currently committed to ${ENGINEERING_PROGRAMMES_CATALOG[activeProg.programme_id]?.name || activeProg.programme_id}. Complete the active programme before approving another one.`, 400, 'ACTIVE_PROGRAMME');
        }

        // 2. Check if already approved
        const approvedProg = await trx('manufacturing_engineering_programmes')
          .where({ company_id: companyId, programme_id: programmeId, status: 'approved' })
          .forUpdate()
          .first();
        if (approvedProg) {
          throw new AppError('Programme already approved', 400, 'ALREADY_APPROVED');
        }

        // 3. Check prereqs
        if (progDef.prereq) {
          const prereqStatus = await trx('manufacturing_engineering_programmes')
            .where({ company_id: companyId, programme_id: progDef.prereq, status: 'approved' })
            .first();
          if (!prereqStatus) {
            const prereqName = ENGINEERING_PROGRAMMES_CATALOG[progDef.prereq]?.name || progDef.prereq;
            throw new AppError(`Complete ${prereqName} before approving this programme.`, 400, 'PREREQ_NOT_MET');
          }
        }

        // 4. Check Automotive Engineers
        const engStaff = await trx('company_staff')
          .where({ company_id: companyId, role: 'automotive-engineer' })
          .first();
        const engCount = engStaff?.quantity || 0;

        if (engCount < progDef.minEng) {
          throw new AppError(`This programme requires at least ${progDef.minEng} Automotive Engineers.`, 400, 'INSUFFICIENT_STAFF');
        }

        // 5. Check Cash
        
        // Extract budget and duration from config, fallback to defaults if missing
        const progConfig = autoConfig?.engineering_programmes_config?.[programmeId] ?? {};
        const progBudget = Number(progConfig.budget ?? progDef.budget ?? 200000);
        const progBaseDuration = Number(progConfig.baseDuration ?? progDef.baseDuration ?? 2);

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < progBudget) {
          throw new AppError(`Insufficient company funds. Requires ${progSym}${progBudget.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }

        // Calculate timing
        let durationArcs = progBaseDuration;
        if (engCount < progDef.recEng) {
          durationArcs += 1;
        }

        const clock = await trx('world_clock').first();
        const startYear = clock?.current_year ?? 1;
        const startMonth = clock?.current_month ?? 1;

        // Validation happens in the middle/end depending on logic.
        // User requested: Validation on month reached, Approved on completion.
        // Let's say Validation takes 1 month, Engineering takes the rest.
        // So validationArc = startMonth + durationArcs - 1
        // completionArc = startMonth + durationArcs
        
        let completionMonthTotal = startMonth + durationArcs;
        let validationMonthTotal = completionMonthTotal - 1;

        let compYear = startYear + Math.floor((completionMonthTotal - 1) / 12);
        let compMonth = ((completionMonthTotal - 1) % 12) + 1;

        let valYear = startYear + Math.floor((validationMonthTotal - 1) / 12);
        let valMonth = ((validationMonthTotal - 1) % 12) + 1;

        // Deduct budget
        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', progBudget)
          .returning('*');

        // Create Programme
        await trx('manufacturing_engineering_programmes').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          programme_id: programmeId,
          status: 'engineering',
          approved_budget: progBudget,
          started_arc_year: startYear,
          started_month: startMonth,
          validation_arc_year: valYear,
          validation_month: valMonth,
          completion_arc_year: compYear,
          completion_month: compMonth
        });

        // Ledger
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: startYear,
          game_month: startMonth,
          game_day: clock?.current_day ?? 1,
          entry_type: 'business',
          description: `Research Budget Allocation — ${progDef.name}`,
          amount: -progBudget,
          balance_after: updatedFinances.available_cash,
        });

        // Records
        await trx('company_records').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `Engineering programme started: ${progDef.name}`,
          created_at_world_year: startYear,
          created_at_world_month: startMonth,
          created_at_world_day: clock?.current_day ?? 1,
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/factories/:factoryId/expand
  public static async startFactoryExpansion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, factoryId } = req.params;

      if (!userId || !companyId || !factoryId) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      const result = await db.transaction(async (trx) => {
        const { company, currencySymbol, autoConfig } = await verifyManufacturingCompany(trx, userId, companyId);

        // Load expansion cost and duration from country config
        const EXPANSION_COST = Number(autoConfig?.expansion_cost ?? 500000);
        const EXPANSION_DURATION_ARCS = Number(autoConfig?.expansion_duration_months ?? 2);

        // Load the factory
        const factory = await trx('manufacturing_factories')
          .where({ id: factoryId, company_id: companyId, status: 'active' })
          .forUpdate()
          .first();
        if (!factory) throw new AppError('Factory not found', 404, 'NOT_FOUND');

        // Must be a Small Workshop
        if (factory.factory_type_id !== 'small-workshop') {
          throw new AppError('Only a Small Workshop can be expanded with this option', 400, 'WRONG_TYPE');
        }

        // Must not already be expanding or expanded
        if (factory.expansion_status === 'construction_underway') {
          throw new AppError('Your workshop expansion is already underway. The second production line will be available after construction completes.', 400, 'ALREADY_UNDERWAY');
        }
        if (factory.expansion_status === 'expanded') {
          throw new AppError('Your company already operates an Expanded Workshop.', 400, 'ALREADY_EXPANDED');
        }

        // Check funds
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < EXPANSION_COST) {
          throw new AppError(`Insufficient company funds. Requires ${currencySymbol}${EXPANSION_COST.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }

        // Deduct cost immediately
        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', EXPANSION_COST)
          .returning('*');

        const clock = await trx('world_clock').first();
        const startYear = clock?.current_year ?? 1;
        const startMonth = clock?.current_month ?? 1;

        // Calculate completion month (EXPANSION_DURATION_ARCS months from now, wrapping year at 12)
        const rawCompletionMonth = startMonth + EXPANSION_DURATION_ARCS;
        let compYear = startYear + Math.floor((rawCompletionMonth - 1) / 12);
        let compMonth   = ((rawCompletionMonth - 1) % 12) + 1;

        // Day factory as under construction
        await trx('manufacturing_factories').where({ id: factoryId }).update({
          expansion_status:             'construction_underway',
          expansion_started_year:      startYear,
          expansion_started_month:      startMonth,
          expansion_completion_year:   compYear,
          expansion_completion_month:   compMonth,
          expansion_cost:               EXPANSION_COST,
          updated_at:                   trx.fn.now(),
        });

        // Ledger entry
        await trx('company_ledger').insert({
          company_id: companyId,
          game_year:  startYear,
          game_month:    startMonth,
          game_day:   clock?.current_day ?? 1,
          entry_type:  'factory_expansion',
          description: 'Factory Expansion Investment — Second Production Line',
          amount:      -EXPANSION_COST,
          balance_after: updatedFinances.available_cash,
        });

        // Company record
        await trx('company_records').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: 'Workshop expansion started: Second Production Line.',
          created_at_world_year: startYear,
          created_at_world_month:   startMonth,
          created_at_world_day:  clock?.current_day ?? 1,
        });

        return {
          expansionStatus: 'construction_underway',
          startedYear:    startYear,
          startedArc:      startMonth,
          completionYear: compYear,
          completionArc:   compMonth,
          availableCash:   updatedFinances.available_cash,
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/factories/:factoryId/recover-condition
  public static async recoverFactoryCondition(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, factoryId } = req.params;

      if (!userId || !companyId || !factoryId) {
        return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      }

      const RECOVERY_COST = 20000;
      const RECOVERY_AMOUNT = 5.0;

      const result = await db.transaction(async (trx) => {
        const { company, currencySymbol } = await verifyManufacturingCompany(trx, userId, companyId);

        const factory = await trx('manufacturing_factories').where({ id: factoryId, company_id: companyId }).forUpdate().first();
        if (!factory) throw new AppError('Factory not found', 404, 'NOT_FOUND');
        if (factory.status !== 'active') throw new AppError(`Factory is ${factory.status}. Cannot recover condition.`, 400, 'INVALID_STATUS');
        if (Number(factory.condition) >= 100) throw new AppError('Factory condition is already at 100%', 400, 'BAD_REQUEST');

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < RECOVERY_COST) {
          throw new AppError(`Insufficient funds. Requires ${currencySymbol}${RECOVERY_COST.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', RECOVERY_COST)
          .returning('*');

        const newCondition = Math.min(100.0, Number(factory.condition) + RECOVERY_AMOUNT);
        await trx('manufacturing_factories').where({ id: factoryId }).update({
          condition: newCondition,
          updated_at: trx.fn.now(),
        });

        const clock = await trx('world_clock').first();
        const startYear = clock?.current_year ?? 1;
        const startMonth = clock?.current_month ?? 1;

        await trx('company_ledger').insert({
          company_id: companyId, game_year: startYear, game_month: startMonth, game_day: clock?.current_day ?? 1,
          entry_type: 'maintenance', description: `Manual Factory Recovery (${factory.name})`, amount: -RECOVERY_COST, balance_after: updatedFinances.available_cash,
        });

        return {
          condition: newCondition,
          availableCash: updatedFinances.available_cash,
        };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/factories/:factoryId/toggle-auto-recovery
  public static async toggleFactoryAutoRecovery(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, factoryId } = req.params;
      
      if (!userId || !companyId || !factoryId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const factory = await trx('manufacturing_factories').where({ id: factoryId, company_id: companyId }).forUpdate().first();
        if (!factory) throw new AppError('Factory not found', 404, 'NOT_FOUND');

        const newValue = !factory.auto_condition_recovery;
        await trx('manufacturing_factories').where({ id: factoryId }).update({
          auto_condition_recovery: newValue,
          updated_at: trx.fn.now(),
        });
        return { auto_condition_recovery: newValue };
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /companies/:companyId/manufacturing/markets/:marketId/marketing
  public static async setMarketingTier(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, marketId } = req.params;
      const { vehicleModelId, marketingTier } = req.body;

      if (!userId || !companyId || !marketId || !vehicleModelId || !marketingTier) {
        return next(new AppError('vehicleModelId, marketingTier required', 400, 'BAD_REQUEST'));
      }
      const validTiers = ['none', 'local', 'regional', 'national'];
      if (!validTiers.includes(marketingTier)) return next(new AppError('Invalid marketing tier', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);
        await trx('manufacturing_market_allocations')
          .where({ company_id: companyId, vehicle_model_id: vehicleModelId, region_market_id: marketId })
          .update({ marketing_tier: marketingTier, updated_at: trx.fn.now() });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
  // POST /companies/:companyId/manufacturing/models/:modelId/facelift
  public static async createFacelift(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, modelId } = req.params;
      const { name, qualityTarget, salePrice, targetSegment, appliedEngineeringPackage } = req.body;

      if (!userId || !companyId || !modelId) return next(new AppError('Missing or invalid fields: userId, companyId, modelId', 400, 'BAD_REQUEST'));
      if (!name || !qualityTarget) {
        return next(new AppError('Name and Quality Target are required', 400, 'BAD_REQUEST'));
      }

      const result = await db.transaction(async (trx) => {
        const { company, currencySymbol, autoConfig } = await verifyManufacturingCompany(trx, userId, companyId);

        // Fetch original model
        const sourceModel = await trx('manufacturing_vehicle_models')
          .where({ id: modelId, company_id: companyId })
          .whereNot({ status: 'deleted' })
          .first();
        
        if (!sourceModel) throw new AppError('Source model not found', 404, 'NOT_FOUND');
        if (sourceModel.development_status !== 'launched' && sourceModel.development_status !== 'discontinued') {
          throw new AppError('Only launched or discontinued models can be facelifted', 400, 'BAD_REQUEST');
        }

        // Check name uniqueness
        const existingModel = await trx('manufacturing_vehicle_models')
          .whereRaw('company_id = ? AND LOWER(name) = ?', [companyId, name.toLowerCase()])
          .first();
        if (existingModel) throw new AppError('A model with this name already exists', 400, 'NAME_TAKEN');

        const clock = await trx('world_clock').first();
        const currentYear = clock?.current_year ?? 1;
        const currentMonth = clock?.current_month ?? 1;
        const currentDay = clock?.current_day ?? 1;

        // Facelift dev cost = base_vehicle_dev_cost * facelift_cost_fraction (from country config)
        const BASE_DEV_COST = Number(autoConfig?.base_vehicle_dev_cost ?? 150000);
        const BASE_FACELIFT_COST = Math.round(BASE_DEV_COST * Number(autoConfig?.facelift_cost_fraction ?? 0.6));

        const engineerStaff = await trx('company_staff')
          .where({ company_id: companyId, role: 'automotive-engineer' }).first();
        const engineerCount = engineerStaff?.quantity || 0;
        const devCostDiscount = Math.min(engineerCount * 0.05, 0.20);
        
        const companyKnowledge = await trx('manufacturing_company_knowledge')
          .where({ company_id: companyId });
        const knowledgeMap: Record<string, number> = {};
        for (const k of companyKnowledge) {
          knowledgeMap[k.domain] = k.xp_points;
        }

        const engPriorities = typeof sourceModel.engineering_priorities === 'string'
          ? JSON.parse(sourceModel.engineering_priorities)
          : (sourceModel.engineering_priorities || {});
        
        const engBudgetAlloc = typeof sourceModel.engineering_budget_alloc === 'string'
          ? JSON.parse(sourceModel.engineering_budget_alloc)
          : (sourceModel.engineering_budget_alloc || {});

        const engineDesign = {
          vehicleClass: sourceModel.vehicle_class,
          platform: sourceModel.platform_type,
          powerUnit: sourceModel.power_unit_type,
          drivetrain: sourceModel.drivetrain_type,
          interiorTier: sourceModel.interior_tier,
          safetyTier: sourceModel.safety_tier,
          qualityTarget,
          priorities: engPriorities,
          budgetAlloc: engBudgetAlloc,
          totalBudget: BASE_DEV_COST,
          appliedEngineeringPackage: appliedEngineeringPackage || undefined
        };

        const engContext = {
          engineerCount,
          engineerSkillLevel: Math.min(5, Math.floor(engineerCount / 20)),
          companyKnowledge: knowledgeMap,
          currentMonth,
          currentYear
        };

        const outcome = calculateEngineeringOutcome(engineDesign, engContext);

        // Compute base manufacturing cost (Phase 3 logic)
        let baseCost = 0;
        baseCost += PLATFORMS[sourceModel.platform_type]?.baseCost || 0;
        baseCost += POWER_UNITS[sourceModel.power_unit_type]?.baseCost || 0;
        baseCost += DRIVETRAINS[sourceModel.drivetrain_type]?.baseCost || 0;
        baseCost += INTERIOR_TIERS[sourceModel.interior_tier]?.baseCost || 0;
        baseCost += SAFETY_TIERS[sourceModel.safety_tier]?.baseCost || 0;
        
        let manufacturingCostPerUnit = Math.round(baseCost * (QUALITY_TARGETS[qualityTarget]?.costMultiplier || 1.0));
        manufacturingCostPerUnit = Math.round(manufacturingCostPerUnit * outcome.productionCostMultiplier);

        const computedSegment = qualityTarget === 'budget' ? 'Economy'
          : qualityTarget === 'premium' ? 'Premium'
          : 'Mid-Range';
        const finalSegment = targetSegment || computedSegment;
        
        const finalSalePrice = salePrice && Number(salePrice) > 0
          ? Number(salePrice)
          : Math.round(manufacturingCostPerUnit * 1.5);

        const finalDevCost = Math.round(BASE_FACELIFT_COST * (1 - devCostDiscount));

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < finalDevCost) {
          throw new AppError(`Insufficient company funds. Requires ${currencySymbol}${finalDevCost.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', finalDevCost)
          .returning('*');

        // Year/month with overflow handling
        const wrapMonth = (year: number, month: number) => {
          while (month > 12) { month -= 12; year++; }
          return { year, month };
        };
        const endTimeline = wrapMonth(currentYear, currentMonth + 1); // Facelift is fast (1 month total)

        const [newModel] = await trx('manufacturing_vehicle_models').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          name: name.trim(),
          vehicle_class: sourceModel.vehicle_class,
          platform_type: sourceModel.platform_type,
          power_unit_type: sourceModel.power_unit_type,
          drivetrain_type: sourceModel.drivetrain_type,
          interior_tier: sourceModel.interior_tier,
          safety_tier: sourceModel.safety_tier,
          production_quality: qualityTarget,
          manufacturing_cost_per_unit: manufacturingCostPerUnit,
          reliability_score: outcome.finalScores.reliability,
          performance_score: outcome.finalScores.performance,
          fuel_efficiency_score: outcome.finalScores.fuelEfficiency,
          appeal_score: outcome.finalScores.appeal,
          cargo_score: outcome.finalScores.cargo,
          safety_score: outcome.finalScores.safety,
          target_segment: finalSegment,
          sale_price: finalSalePrice,
          development_cost_discount: devCostDiscount,
          applied_engineering_package: appliedEngineeringPackage || null,
          status: 'active',
          development_status: 'in_development',
          development_type: 'facelift',
          facelift_source_model_id: sourceModel.id,
          // Phase 3 fields
          engineering_priorities:     JSON.stringify(engPriorities),
          engineering_budget_alloc:   JSON.stringify(engBudgetAlloc),
          engineering_complexity:     outcome.complexities.engineering,
          manufacturing_complexity:   outcome.complexities.manufacturing,
          assembly_complexity:        outcome.complexities.assembly,
          vehicle_weight_kg:          outcome.vehicleWeightKg,
          manufacturing_friendliness: outcome.manufacturingFriendliness,
          engineering_risk:           outcome.engineeringRisk,
          prototype_confidence:       outcome.prototypeConfidence,
          dev_stage:                  'engineering',
          planned_dev_time_months:    1,
          prototype_validation_result: null,
          engineering_assessment:     JSON.stringify(outcome.engineeringReport),
          engineering_balance_rating: outcome.balanceFlags.length > 0 ? outcome.balanceFlags[0] : null,
          // Timeline
          created_at_world_year: currentYear,
          created_at_world_month: currentMonth,
          created_at_world_day: currentDay,
          development_started_at_year: currentYear,
          development_started_at_month: currentMonth,
          stage_engineering_completes_year: endTimeline.year,
          stage_engineering_completes_month: endTimeline.month,
          stage_prototype_completes_year: endTimeline.year,
          stage_prototype_completes_month: endTimeline.month,
          stage_testing_completes_year: endTimeline.year,
          stage_testing_completes_month: endTimeline.month,
          development_completes_at_year: endTimeline.year,
          development_completes_at_month: endTimeline.month,
        }).returning('*');

        await trx('company_ledger').insert({
          company_id: companyId,
          game_year: clock?.current_year ?? 1,
          game_month: clock?.current_month ?? 1,
          game_day: clock?.current_day ?? 1,
          entry_type: 'business',
          description: `Vehicle Facelift R&D — ${newModel.name}`,
          amount: -finalDevCost,
          balance_after: updatedFinances.available_cash,
        });

        await trx('company_records').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `Vehicle Facelift development started: ${newModel.name}`,
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1,
        });

        return newModel;
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /companies/:companyId/manufacturing/models/:modelId/discontinue
  public static async discontinueModel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, modelId } = req.params;

      if (!userId || !companyId || !modelId) return next(new AppError('Missing or invalid fields: userId, companyId, modelId', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);

        const model = await trx('manufacturing_vehicle_models')
          .where({ id: modelId, company_id: companyId })
          .first();
        
        if (!model) throw new AppError('Vehicle model not found', 404, 'NOT_FOUND');
        if (model.development_status !== 'launched') {
          throw new AppError('Only launched models can be discontinued', 400, 'BAD_REQUEST');
        }

        const clock = await trx('world_clock').first();

        await trx('manufacturing_vehicle_models')
          .where({ id: modelId })
          .update({
            development_status: 'discontinued',
            discontinued_year: clock?.current_year ?? 1,
            discontinued_arc: clock?.current_month ?? 1,
            updated_at: trx.fn.now()
          });

        // Pause any production lines currently assigned to this model
        await trx('manufacturing_production_lines')
          .where({ company_id: companyId, assigned_vehicle_model_id: modelId, status: 'active' })
          .update({
            status: 'paused',
            updated_at: trx.fn.now()
          });

        await trx('company_records').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `Vehicle Model Discontinued: ${model.name}. Production halted, but remaining inventory can be sold.`,
          created_at_world_year: clock?.current_year ?? 1,
          created_at_world_month: clock?.current_month ?? 1,
          created_at_world_day: clock?.current_day ?? 1,
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // GET /companies/:companyId/manufacturing/models/snapshots
  public static async getModelSnapshots(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;

      if (!userId || !companyId) return next(new AppError('Missing or invalid fields: userId, companyId', 400, 'BAD_REQUEST'));

      await verifyManufacturingCompany(db, userId, companyId);

      const snapshots = await db('manufacturing_model_snapshots')
        .where({ company_id: companyId })
        .orderBy('world_year', 'desc')
        .orderBy('world_month', 'desc');

      res.status(200).json({ snapshots });
    } catch (error) {
      next(error);
    }
  }

  // ── Phase 3: Engineering Report ────────────────────────────────────────────

  // GET /companies/:companyId/manufacturing/models/:modelId/engineering-report
  public static async getEngineeringReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, modelId } = req.params;

      if (!userId || !companyId || !modelId) return next(new AppError('Missing or invalid fields: userId, companyId, modelId', 400, 'BAD_REQUEST'));

      await verifyManufacturingCompany(db, userId, companyId);

      const model = await db('manufacturing_vehicle_models')
        .where({ id: modelId, company_id: companyId })
        .select(
          'id', 'name', 'vehicle_class', 'platform_type', 'power_unit_type',
          'drivetrain_type', 'interior_tier', 'safety_tier', 'production_quality',
          'engineering_priorities', 'engineering_budget_alloc',
          'engineering_complexity', 'manufacturing_complexity', 'assembly_complexity',
          'vehicle_weight_kg', 'manufacturing_friendliness',
          'engineering_risk', 'prototype_confidence',
          'dev_stage', 'planned_dev_time_months', 'balance_flags', 'engineering_report',
          'development_status', 'reliability_score', 'performance_score',
          'fuel_efficiency_score', 'appeal_score', 'cargo_score', 'safety_score'
        )
        .first();

      if (!model) return next(new AppError('Vehicle model not found', 404, 'NOT_FOUND'));

      // Parse JSON fields
      const report = {
        ...model,
        engineering_priorities: typeof model.engineering_priorities === 'string'
          ? JSON.parse(model.engineering_priorities) : (model.engineering_priorities ?? {}),
        engineering_budget_alloc: typeof model.engineering_budget_alloc === 'string'
          ? JSON.parse(model.engineering_budget_alloc) : (model.engineering_budget_alloc ?? {}),
        balance_flags: typeof model.balance_flags === 'string'
          ? JSON.parse(model.balance_flags) : (model.balance_flags ?? []),
        engineering_report: typeof model.engineering_report === 'string'
          ? JSON.parse(model.engineering_report) : (model.engineering_report ?? {}),
      };

      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  // ── Phase 3: Company Knowledge ─────────────────────────────────────────────

  // GET /companies/:companyId/manufacturing/knowledge
  public static async getCompanyKnowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId } = req.params;

      if (!userId || !companyId) return next(new AppError('Missing or invalid fields: userId, companyId', 400, 'BAD_REQUEST'));
      await verifyManufacturingCompany(db, userId, companyId);

      const knowledgeRows = await db('manufacturing_company_knowledge')
        .where({ company_id: companyId });

      const result = KNOWLEDGE_DOMAINS.map(domain => {
        const row = knowledgeRows.find((r: any) => r.domain === domain.id);
        const xp = row?.xp_points ?? 0;
        let level = 0;
        for (let i = KNOWLEDGE_LEVEL_XP.length - 1; i >= 0; i--) {
          if (xp >= KNOWLEDGE_LEVEL_XP[i]) { level = i; break; }
        }
        const nextLevelXp = KNOWLEDGE_LEVEL_XP[Math.min(level + 1, KNOWLEDGE_LEVEL_XP.length - 1)];
        return {
          domain: domain.id,
          label: domain.label,
          desc: domain.desc,
          xp,
          level,
          nextLevelXp,
          progressPct: nextLevelXp > 0 ? Math.round(((xp - (KNOWLEDGE_LEVEL_XP[level] ?? 0)) / (nextLevelXp - (KNOWLEDGE_LEVEL_XP[level] ?? 0))) * 100) : 100,
        };
      });

      res.status(200).json({ knowledge: result });
    } catch (error) {
      next(error);
    }
  }

  // ── Phase 3: Award Knowledge XP (called after model completes dev) ─────────

  public static async awardModelKnowledgeXp(trx: any, companyId: string, worldInstanceId: string, model: any) {
    try {
      const priorities: Record<string, number> = typeof model.engineering_priorities === 'string'
        ? JSON.parse(model.engineering_priorities)
        : (model.engineering_priorities ?? {});

      const xpAwards = calcKnowledgeXp({
        vehicleClass: model.vehicle_class,
        platform: model.platform_type,
        powerUnit: model.power_unit_type,
        safetyTier: model.safety_tier,
        engineeringPriorities: priorities,
        engineingComplexity: Number(model.engineering_complexity ?? 50),
      });

      for (const [domain, xp] of Object.entries(xpAwards)) {
        const existing = await trx('manufacturing_company_knowledge')
          .where({ company_id: companyId, domain })
          .first();

        if (existing) {
          const newXp = existing.xp_points + xp;
          let level = 0;
          for (let i = KNOWLEDGE_LEVEL_XP.length - 1; i >= 0; i--) {
            if (newXp >= KNOWLEDGE_LEVEL_XP[i]) { level = i; break; }
          }
          await trx('manufacturing_company_knowledge')
            .where({ company_id: companyId, domain })
            .update({ xp_points: newXp, level, last_updated: trx.fn.now() });
        } else {
          const level = xp >= KNOWLEDGE_LEVEL_XP[1] ? 1 : 0;
          await trx('manufacturing_company_knowledge').insert({
            world_instance_id: worldInstanceId,
            company_id: companyId,
            domain,
            xp_points: xp,
            level,
          });
        }
      }

      // Update engineering reputation
      const repRecord = await trx('manufacturing_engineering_reputation')
        .where({ company_id: companyId }).first();

      const relPri  = priorities['reliability']    ?? 0;
      const perfPri = priorities['performance']     ?? 0;
      const fuelPri = priorities['fuel_economy']    ?? 0;
      const comfPri = priorities['comfort']         ?? 0;
      const practPri = priorities['practicality']   ?? 0;
      const mfgPri  = priorities['mfg_simplicity']  ?? 0;

      if (repRecord) {
        const prev = repRecord;
        const n = (prev.projects_completed ?? 0) + 1;
        // Rolling average for reputation scores
        await trx('manufacturing_engineering_reputation')
          .where({ company_id: companyId })
          .update({
            reliability_rep:     ((Number(prev.reliability_rep) * (n - 1)) + relPri) / n,
            performance_rep:     ((Number(prev.performance_rep) * (n - 1)) + perfPri) / n,
            fuel_efficiency_rep: ((Number(prev.fuel_efficiency_rep) * (n - 1)) + fuelPri) / n,
            comfort_rep:         ((Number(prev.comfort_rep) * (n - 1)) + comfPri) / n,
            practicality_rep:    ((Number(prev.practicality_rep) * (n - 1)) + practPri) / n,
            mfg_efficiency_rep:  ((Number(prev.mfg_efficiency_rep) * (n - 1)) + mfgPri) / n,
            projects_completed: n,
            last_updated: trx.fn.now(),
          });
      } else {
        await trx('manufacturing_engineering_reputation').insert({
          world_instance_id: worldInstanceId,
          company_id: companyId,
          reliability_rep:     relPri,
          performance_rep:     perfPri,
          fuel_efficiency_rep: fuelPri,
          comfort_rep:         comfPri,
          practicality_rep:    practPri,
          mfg_efficiency_rep:  mfgPri,
          projects_completed:  1,
        });
      }
    } catch (err) {
      // Non-fatal — log but don't fail the month
      console.error('[Engineering Knowledge] Failed to award XP:', err);
    }
  }
}
