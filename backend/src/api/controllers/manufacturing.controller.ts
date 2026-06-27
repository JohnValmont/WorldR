import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
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
async function verifyManufacturingCompany(trx: any, userId: string, companyId: string) {
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
export class ManufacturingController {

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
      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
        .orderBy('world_orbit', 'desc')
        .orderBy('world_arc', 'desc');

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
        .orderBy('world_orbit', 'desc')
        .orderBy('world_arc', 'desc')
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
        for (let i = KNOWLEDGE_LEVEL_XP.length - 1; i >= 0; i--) {
          if (xp >= KNOWLEDGE_LEVEL_XP[i]) { level = i; break; }
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
        await trx('company_finances')
          .where({ company_id: companyId })
          .update({
            available_cash: Number(finances.available_cash) - totalCost,
            updated_at: trx.fn.now()
          });

        // Add to inventory
        const existingInventory = await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: component_id })
          .first();

        if (existingInventory) {
          await trx('manufacturing_component_inventory')
            .where({ id: existingInventory.id })
            .update({
              units_in_stock: existingInventory.units_in_stock + units,
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
        const currentOrbit = clock?.current_orbit || 1;
        const currentArc = clock?.current_arc || 1;
        const currentMark = clock?.current_mark || 1;

        // Record history
        await trx('manufacturing_procurement_history').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          component_id: component_id,
          units_ordered: units,
          unit_cost: component.base_cost,
          total_cost: totalCost,
          world_orbit: currentOrbit,
          world_arc: currentArc,
          world_mark: currentMark
        });
        
        // Add ledger entry
        await trx('company_ledger').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          world_orbit: currentOrbit,
          world_arc: currentArc,
          world_mark: currentMark,
          category: 'expense',
          subcategory: 'procurement',
          amount: totalCost,
          description: `Procured ${units} units of ${component.name}`
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

      if (!userId || !companyId || !factoryTypeId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const { company, currencySymbol } = await verifyManufacturingCompany(trx, userId, companyId);

        const factoryType = await trx('manufacturing_factory_types').where({ id: factoryTypeId }).first();
        if (!factoryType) throw new AppError('Factory type not found', 404, 'NOT_FOUND');
        if (factoryType.status === 'locked') throw new AppError('This factory type is not yet available', 400, 'LOCKED');

        // Check if company already has a factory of this type
        const existingFactory = await trx('manufacturing_factories')
          .where({ company_id: companyId, factory_type_id: factoryTypeId, status: 'active' })
          .first();
        if (existingFactory) throw new AppError('You already have an active factory of this type', 400, 'DUPLICATE');

        const leaseCost = Number(factoryType.base_lease_cost_per_arc);
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
          lease_cost_per_arc: factoryType.base_lease_cost_per_arc,
          maintenance_cost_per_arc: factoryType.base_maintenance_per_arc,
          capacity_per_arc: factoryType.base_capacity_per_arc,
          machine_level: 1,
          condition: 100.00,
          status: 'active',
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
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
            target_units_per_arc: 0,
            status: 'idle',
          }).returning('*');
          lines.push(line);
        }

        // Ledger entry
        await trx('company_ledger').insert({
          company_id: companyId,
          game_orbit: clock?.current_orbit || 1,
          game_arc: clock?.current_arc || 1,
          game_mark: clock?.current_mark || 1,
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

      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      if (!name || !vehicleClass || !platform || !powerUnit || !drivetrain || !interiorTier || !safetyTier || !qualityTarget) {
        return next(new AppError('All design choices are required', 400, 'BAD_REQUEST'));
      }
      if (!VEHICLE_CLASSES.includes(vehicleClass)) return next(new AppError('Invalid vehicle class', 400, 'BAD_REQUEST'));

      // Validate and normalize engineering priorities
      const engineeringPriorities: Record<string, number> = rawPriorities ?? DEFAULT_ENGINEERING_PRIORITIES;
      const prioritySum = Object.values(engineeringPriorities).reduce((s, v) => s + Number(v), 0);
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
        const currentOrbit = clock?.current_orbit || 1;
        const currentArc   = clock?.current_arc   || 1;
        const currentMark  = clock?.current_mark  || 1;

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
          currentArc,
          currentOrbit,
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
          game_orbit: currentOrbit,
          game_arc: currentArc,
          game_mark: currentMark,
          entry_type: 'vehicle_development',
          amount: -outcome.effectiveDevCost,
          balance_after: Number(finances.available_cash) - outcome.effectiveDevCost,
          description: `Vehicle development started: ${name.trim()}`,
        });

        // Calculate stage completion arcs
        const engCompletes     = currentArc + outcome.stageTimings.engineering;
        const protoCompletes   = engCompletes + outcome.stageTimings.prototype;
        const testingCompletes = protoCompletes + outcome.stageTimings.testing;
        const totalCompletes   = testingCompletes;

        // Orbit/arc with overflow handling
        const ARCS_PER_ORBIT = 8;
        const wrapArc = (orbit: number, arc: number) => {
          while (arc > ARCS_PER_ORBIT) { arc -= ARCS_PER_ORBIT; orbit++; }
          return { orbit, arc };
        };
        const engEnd   = wrapArc(currentOrbit, engCompletes);
        const protoEnd = wrapArc(currentOrbit, protoCompletes);
        const testEnd  = wrapArc(currentOrbit, testingCompletes);
        const finalEnd = wrapArc(currentOrbit, totalCompletes);

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
          planned_dev_time_arcs:      outcome.devTimeArcs,
          prototype_validation_result: null, // Populated after prototype stage completes
          engineering_assessment:     JSON.stringify(outcome.engineeringReport), // Note: this is actually the new assessment format returned from engine
          engineering_balance_rating: outcome.balanceFlags.length > 0 ? outcome.balanceFlags[0] : null,
          // Stage completion timings
          stage_engineering_completes_orbit: engEnd.orbit,
          stage_engineering_completes_arc:   engEnd.arc,
          stage_prototype_completes_orbit:   protoEnd.orbit,
          stage_prototype_completes_arc:     protoEnd.arc,
          stage_testing_completes_orbit:     testEnd.orbit,
          stage_testing_completes_arc:       testEnd.arc,
          // Overall completion
          created_at_world_orbit: currentOrbit,
          created_at_world_arc:   currentArc,
          created_at_world_mark:  currentMark,
          development_started_at_orbit:   currentOrbit,
          development_started_at_arc:     currentArc,
          development_completes_at_orbit:  finalEnd.orbit,
          development_completes_at_arc:    finalEnd.arc,
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

      if (!userId || !companyId || !modelId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
            launched_orbit: clock2?.current_orbit || 1,
            launched_arc: clock2?.current_arc || 1,
            updated_at: trx.fn.now(),
          })
          .returning('*');

        const clock = await trx('world_clock').first();
        await trx('company_records').insert({
          world_instance_id: model.world_instance_id,
          company_id: companyId,
          record_type: 'business',
          summary: `${model.name} was launched for production.`,
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1
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

      if (!userId || !companyId || !lineId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const line = await trx('manufacturing_production_lines').where({ id: lineId, company_id: companyId }).first();
        if (!line) throw new AppError('Production line not found', 404, 'NOT_FOUND');

        // Validate model belongs to company, is launched, and not discontinued
        if (modelId) {
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
        const factory = await trx('manufacturing_factories').where({ id: line.factory_id }).first();
        const factoryType = await trx('manufacturing_factory_types').where({ id: factory?.factory_type_id }).first();
        // After expansion, max_production_lines may have grown; use the factory type default as cap basis
        const totalCap = Number(factory?.capacity_per_arc ?? factoryType?.base_capacity_per_arc ?? 100);
        const lineCount = Number(factoryType?.max_production_lines ?? 1);
        const PER_LINE_CAP = Math.ceil(totalCap / lineCount);
        if (targetUnitsPerArc && Number(targetUnitsPerArc) > PER_LINE_CAP) {
          throw new AppError(`Each production line cannot exceed ${PER_LINE_CAP} units/Arc`, 400, 'EXCEEDS_LINE_CAP');
        }
        // Validate total across all lines does not exceed factory capacity
        if (targetUnitsPerArc && Number(targetUnitsPerArc) > 0) {
          const otherLines = await trx('manufacturing_production_lines')
            .where({ factory_id: line.factory_id })
            .whereNot({ id: lineId });
          const otherTotal = otherLines.reduce((sum: number, l: any) => sum + Number(l.target_units_per_arc || 0), 0);
          if (otherTotal + Number(targetUnitsPerArc) > Number(factory.capacity_per_arc)) {
            throw new AppError(`Total planned units across all lines cannot exceed factory capacity (${factory.capacity_per_arc} units/Arc). Other lines already plan ${otherTotal} units.`, 400, 'EXCEEDS_CAPACITY');
          }
        }

        await trx('manufacturing_production_lines').where({ id: lineId }).update({
          assigned_vehicle_model_id: modelId || null,
          quality_setting: qualitySetting || 'Standard',
          target_units_per_arc: targetUnitsPerArc || 0,
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

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const validRole = STAFF_ROLES.find(r => r.id === role);
      if (!validRole) return next(new AppError('Invalid staff role', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);
        const clock = await trx('world_clock').first();

        const existing = await trx('company_staff').where({ company_id: companyId, role }).first();
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
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
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

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const validRole = STAFF_ROLES.find(r => r.id === role);
      if (!validRole) return next(new AppError('Invalid staff role', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);
        const clock = await trx('world_clock').first();

        const existing = await trx('company_staff').where({ company_id: companyId, role }).first();
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
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
        });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // ── Company Reputation/Awareness Helper ──────────────────────────────────────────
  public static async getCompanyAwarenessAndTrust(trx: any, companyId: string, countryId: string) {
    const domesticMarkets = await trx('manufacturing_region_markets')
      .where({ country_id: countryId, status: 'active' });

    if (domesticMarkets.length === 0) return { companyAwareness: 0, companyReputation: 0 };

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
    salesManagerBonus: number
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

      // Market Capacity Calculation
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

      let attrWeights = { reliability: 1, performance: 1, fuel_efficiency: 1, safety: 1, appeal: 1, cargo_utility: 1 };
      if (market.vehicle_attribute_weights) {
        try {
          attrWeights = typeof market.vehicle_attribute_weights === 'string' 
            ? JSON.parse(market.vehicle_attribute_weights) 
            : market.vehicle_attribute_weights;
        } catch (e) {}
      }

      for (const alloc of allocs) {
        const salePrice = Number(alloc.sale_price);
        const comfortRatio = Number(market.vehicle_price_comfort_ratio) || 0.8;
        const priceComfortAmount = Number(market.average_income) * comfortRatio;
        
        const priceRatio = salePrice / Math.max(priceComfortAmount, 1);
        const priceSens = Number(market.price_sensitivity) || 0.7;
        
        let affordability = 1.0;
        if (priceRatio > 1.0) {
           affordability = Math.max(0.05, 1.0 - ((priceRatio - 1.0) * priceSens));
        } else {
           affordability = Math.min(1.10, 1.0 + ((1.0 - priceRatio) * (priceSens * 0.5)));
        }
        
        let classPref = 0.33;
        if (alloc.vehicle_class === 'Compact Car') classPref = Number(market.preference_compact);
        else if (alloc.vehicle_class === 'Sedan') classPref = Number(market.preference_sedan);
        else if (alloc.vehicle_class === 'Utility Van') classPref = Number(market.preference_utility_van);
        
        let segmentPref = 0.33;
        if (alloc.target_segment === 'Economy') segmentPref = Number(market.preference_economy) || 0.33;
        else if (alloc.target_segment === 'Standard') segmentPref = Number(market.preference_standard) || 0.33;
        else if (alloc.target_segment === 'Premium') segmentPref = Number(market.preference_premium) || 0.33;

        const scores = [
          (Number(alloc.reliability_score) / 65) * (attrWeights.reliability || 1.0),
          (Number(alloc.performance_score) / 65) * (attrWeights.performance || 1.0),
          (Number(alloc.fuel_efficiency_score) / 65) * (attrWeights.fuel_efficiency || 1.0),
          (65 / 65) * (attrWeights.safety || 1.0), 
          (Number(alloc.appeal_score) / 65) * (attrWeights.appeal || 1.0),
          (Number(alloc.cargo_score || 30) / 65) * (attrWeights.cargo_utility || 1.0),
        ];
        const avgAttr = scores.reduce((a,b)=>a+b, 0) / scores.length;
        
        const classMult = classPref / 0.33;
        const segmentMult = segmentPref / 0.33;
        let rawFit = (classMult * 0.4) + (segmentMult * 0.4) + (avgAttr * 0.2);
        let fitMultiplier = Math.max(0.20, Math.min(1.15, rawFit));

        // ── Phase 3B Step 2: Score-driven demand modifiers ───────────────
        const marketMods = deriveMarketModifiers(alloc as any);
        
        // Fuel efficiency: economy/budget segment gets an extra boost from high fuel score
        if (alloc.target_segment === 'Economy' || Number(market.preference_economy) > 0.45) {
          fitMultiplier = Math.min(1.25, fitMultiplier * marketMods.fuelEconomyBoost);
        }
        // Appeal/comfort: premium segment gets extra boost from high appeal score
        if (alloc.target_segment === 'Premium' || alloc.target_segment === 'Executive') {
          fitMultiplier = Math.min(1.25, fitMultiplier * marketMods.appealBoost);
        }
        // Cargo/practicality: utility van and family segment get extra boost from high cargo score
        if (alloc.vehicle_class === 'Utility Van' || alloc.target_segment === 'Family') {
          fitMultiplier = Math.min(1.25, fitMultiplier * marketMods.cargoBoost);
        }
        // Clamp after all modifiers
        fitMultiplier = Math.max(0.20, Math.min(1.25, fitMultiplier));

        const localBrand = brandMap.get(market.id);
        const localAwareness = localBrand ? Number(localBrand.awareness) : 0;
        const localTrust = localBrand ? Number(localBrand.reputation) : 0;
        
        const awarenessMult = Math.max(0.10, localAwareness / 100);
        const trustMult = Math.max(0.20, localTrust / 100);
        const distMult = Number(market.distribution_strength) || 0.7;

        const mktTier = alloc.marketing_tier || 'none';
        const mktMult = MARKETING_MULT[mktTier] ?? 1.0;

        const baseInterest = marketPurchaseCapacity * affordability * fitMultiplier * awarenessMult * trustMult * distMult * mktMult * (1 + salesManagerBonus);
        const rawBuyerInterest = Math.max(0, baseInterest);
        const allocatedUnits = Number(alloc.units_allocated);
        const modelDemandTarget = Math.min(allocatedUnits, Math.floor(rawBuyerInterest));

        combinedDemandTarget += modelDemandTarget;

        modelDemands.push({
          alloc,
          affordability, fitMultiplier, awarenessMult, trustMult, distMult, mktMult,
          rawBuyerInterest, modelDemandTarget, mktTier,
          finalAssignedDemand: 0
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
        const mktTier = md.mktTier;
        const unitsSold = md.finalAssignedDemand;

        let mainReasonCode = 'Balanced';
        if (md.affordability < 0.3) mainReasonCode = 'Too Expensive';
        else if (md.fitMultiplier < 0.6) mainReasonCode = 'Poor Market Fit';
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
  public static async processManufacturingArc(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      if (!companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const company = await trx('companies').where({ id: companyId }).first();
        if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');
        if (company.industry_id !== 'manufacturing') throw new AppError('Not a manufacturing company', 400, 'WRONG_INDUSTRY');

        const clock = await trx('world_clock').first();
        const currentOrbit = clock?.current_orbit || 1;
        const currentArc = clock?.current_arc || 1;
        const currentMark = clock?.current_mark || 1;

        // TODO: This entire Arc process is correctly wrapped in a single database transaction (trx).
        // Ensure the strict pipeline order (Production -> Inventory -> Sales -> Financials -> Local Brand Calculations -> Brand DB updates -> Arc Results -> Reports)
        // is never broken, so that if any write fails, the entire Arc rolls back safely.

        // Check for duplicate arc processing
        const existingReport = await trx('manufacturing_arc_reports')
          .where({ company_id: companyId, world_orbit: currentOrbit, world_arc: currentArc })
          .first();
        if (existingReport) {
          throw new AppError(`Arc ${currentOrbit}.${currentArc} already processed for this company`, 400, 'ALREADY_PROCESSED');
        }

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        let runningCash = Number(finances.available_cash);

        // Load factories
        const factories = await trx('manufacturing_factories')
          .where({ company_id: companyId, status: 'active' });

        // Load production lines with assigned models — skip discontinued models
        const productionLines = await trx('manufacturing_production_lines')
          .join('manufacturing_vehicle_models', 'manufacturing_production_lines.assigned_vehicle_model_id', 'manufacturing_vehicle_models.id')
          .where('manufacturing_production_lines.company_id', companyId)
          .where('manufacturing_production_lines.status', 'active')
          .whereNotNull('manufacturing_production_lines.assigned_vehicle_model_id')
          .where('manufacturing_production_lines.target_units_per_arc', '>', 0)
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

        // Load staff
        const staff = await trx('company_staff').where({ company_id: companyId });

        // ─── 0. Vehicle Development Updates (Phase 3B per-stage) ─────────────
        const developingModels = await trx('manufacturing_vehicle_models')
          .where({ company_id: companyId, status: 'active', development_status: 'in_development' });

        // Load company knowledge XP for bonus calculations
        const knowledgeRows = await trx('manufacturing_company_knowledge')
          .where({ company_id: companyId });
        const knowledgeXpMap: Record<string, number> = {};
        for (const k of knowledgeRows) knowledgeXpMap[k.domain] = Number(k.xp_points);

        // Load engineering reputation for culture score
        const engRepForCulture = await trx('manufacturing_engineering_reputation')
          .where({ company_id: companyId }).first();
        const cultureScore = Number(engRepForCulture?.engineering_culture_score ?? 0);

        for (const model of developingModels) {
          const devStage = model.dev_stage as string | null;

          // ── Stage: engineering → prototype ──────────────────────────────────
          const engEndsOrbit = model.stage_engineering_completes_orbit || 1;
          const engEndsArc   = model.stage_engineering_completes_arc   || 1;
          if (
            devStage === 'engineering' &&
            (currentOrbit > engEndsOrbit || (currentOrbit === engEndsOrbit && currentArc >= engEndsArc))
          ) {
            // Apply company knowledge bonuses permanently to stored scores
            const bonuses = applyKnowledgeBonuses(knowledgeXpMap);
            const newReliability = Math.min(100, Number(model.reliability_score ?? 60) + bonuses.reliabilityBonus);
            const newMfgFriendliness = Math.min(100, Number(model.manufacturing_friendliness ?? 50) + bonuses.mfgFriendlinessBonus);
            const newConfidence = Math.min(100, Number(model.prototype_confidence ?? 50) + bonuses.prototypeConfidenceBonus);
            const newComplexity = Math.max(10, Number(model.engineering_complexity ?? 50) - bonuses.engineeringComplexityReduction);

            await trx('manufacturing_vehicle_models').where({ id: model.id }).update({
              dev_stage: 'prototype',
              reliability_score: newReliability,
              manufacturing_friendliness: newMfgFriendliness,
              prototype_confidence: newConfidence,
              engineering_complexity: newComplexity,
              updated_at: trx.fn.now(),
            });

            const bonusSummary = Object.entries(bonuses)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${k.replace('Bonus','').replace('Reduction', '')}: +${v.toFixed(1)}`)
              .join(', ');
            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `${model.name} has entered the Prototype stage.${bonusSummary ? ` Knowledge bonuses applied: ${bonusSummary}.` : ''}`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark,
            });
            continue; // process one stage per arc
          }

          // ── Stage: prototype → testing ──────────────────────────────────────
          const protoEndsOrbit = model.stage_prototype_completes_orbit || 1;
          const protoEndsArc   = model.stage_prototype_completes_arc   || 1;
          if (
            devStage === 'prototype' &&
            (currentOrbit > protoEndsOrbit || (currentOrbit === protoEndsOrbit && currentArc >= protoEndsArc))
          ) {
            // Deterministic prototype validation
            const validation = evaluatePrototypeValidation(model);
            const currentCultureScore = Number(cultureScore || 0);
            const newCultureScore = applyEngineeringCulture(currentCultureScore, validation);
            const cultureDelta = newCultureScore - currentCultureScore;

            let extraCostCharged = 0;
            let extraArcMessage = '';

            // Charge extra development cost if validation failed
            if (!validation.passed && validation.extraCostPct > 0) {
              const baseCost = Number(model.engineering_complexity ?? 50) * 1000; // approximate
              extraCostCharged = Math.round(baseCost * validation.extraCostPct);
              if (extraCostCharged > 0) {
                runningCash -= extraCostCharged;
                await trx('company_finances').where({ company_id: companyId })
                  .decrement('available_cash', extraCostCharged);
                await trx('company_ledger').insert({
                  company_id: companyId,
                  game_orbit: currentOrbit,
                  game_arc: currentArc,
                  game_mark: currentMark,
                  entry_type: 'expense',
                  description: `Prototype validation failure costs: ${model.name}`,
                  amount: -extraCostCharged,
                  balance_after: runningCash
                });
              }
              extraArcMessage = ` Development extended by ${validation.extraArcs} arc(s).`;
            }

            // Extend testing completion arc if extra arcs needed
            const newTestingArc = (model.stage_testing_completes_arc || currentArc + 1) + validation.extraArcs;
            const newFinalArc = (model.development_completes_at_arc || currentArc + 1) + validation.extraArcs;

            await trx('manufacturing_vehicle_models').where({ id: model.id }).update({
              dev_stage: 'testing',
              stage_testing_completes_arc: newTestingArc,
              development_completes_at_arc: newFinalArc,
              prototype_validation_result: JSON.stringify(validation),
              updated_at: trx.fn.now(),
            });

            // Update engineering culture score
            await trx('manufacturing_engineering_reputation')
              .where({ company_id: companyId })
              .update({ engineering_culture_score: newCultureScore, last_updated: trx.fn.now() })
              .catch(() => {}); // non-fatal if reputation row doesn't exist yet

            const validationSummary = validation.passed
              ? `Prototype validation ${validation.resultClass} (confidence: ${validation.confidenceScore}%).`
              : `Prototype validation ${validation.resultClass}: ${validation.issues[0]}.${extraArcMessage} Extra cost: ${extraCostCharged.toLocaleString()}.`;
            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `${model.name} — ${validationSummary}`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark,
            });
            continue;
          }

          // ── Stage: testing → ready_to_launch ───────────────────────────────
          const testingEndsOrbit = model.stage_testing_completes_orbit || 1;
          const testingEndsArc   = model.stage_testing_completes_arc   || 1;
          if (
            devStage === 'testing' &&
            (currentOrbit > testingEndsOrbit || (currentOrbit === testingEndsOrbit && currentArc >= testingEndsArc))
          ) {
            await trx('manufacturing_vehicle_models').where({ id: model.id }).update({
              dev_stage: 'ready_to_launch',
              updated_at: trx.fn.now(),
            });
          }

          // ── Final: mark overall development complete ─────────────────────────
          const completesOrbit = model.development_completes_at_orbit || 1;
          const completesArc   = model.development_completes_at_arc   || 1;
          if (currentOrbit > completesOrbit || (currentOrbit === completesOrbit && currentArc >= completesArc)) {
            // Generate permanent assessment and balance rating at the end of development
            const assessment = calculateEngineeringAssessment(model);
            const balanceRating = calculateBalanceRating(model);
            
            await trx('manufacturing_vehicle_models').where({ id: model.id }).update({
              development_status: 'ready_to_launch',
              dev_stage: 'ready_to_launch',
              engineering_assessment: JSON.stringify(assessment),
              engineering_balance_rating: balanceRating,
              updated_at: trx.fn.now(),
            });
            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `Vehicle development completed: ${model.name}.`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark,
            });
          }
        }

        // ─── 0.5 Engineering Programmes Updates ─────────────────────────────
        let approvedResearchNames: string[] = [];
        const activeProgramme = await trx('manufacturing_engineering_programmes')
          .where({ company_id: companyId })
          .whereIn('status', ['engineering', 'validation'])
          .first();

        // ─── 0.6 Factory Expansion Check ─────────────────────────────────────
        // Load country config for expansion completion values
        const countryAutoConfig = await trx('manufacturing_country_auto_config')
          .where({ country_id: company.country_id }).first() ?? {};
        const EXP_CAPACITY  = Number(countryAutoConfig.expanded_capacity_per_arc     ?? 200);
        const EXP_MAX_LINES = Number(countryAutoConfig.expanded_max_lines             ?? 2);
        const EXP_LEASE     = Number(countryAutoConfig.expanded_lease_cost_per_arc    ?? 45000);
        const EXP_MAINT     = Number(countryAutoConfig.expanded_maintenance_per_arc   ?? 15000);
        const EXP_WORKERS   = Number(countryAutoConfig.expanded_worker_capacity       ?? 80);
        const storageCostPerUnit = Number(countryAutoConfig.storage_cost_per_unit_per_arc ?? 150);

        let expansionCompletedNote = '';
        const expandingFactory = factories.find((f: any) => f.expansion_status === 'construction_underway');
        if (expandingFactory) {
          const compOrbit = Number(expandingFactory.expansion_completion_orbit);
          const compArc   = Number(expandingFactory.expansion_completion_arc);
          const isComplete = currentOrbit > compOrbit || (currentOrbit === compOrbit && currentArc >= compArc);

          if (isComplete) {
            // Upgrade the factory row using country-configured post-expansion values
            await trx('manufacturing_factories').where({ id: expandingFactory.id }).update({
              expansion_status:        'expanded',
              capacity_per_arc:        EXP_CAPACITY,
              lease_cost_per_arc:      EXP_LEASE,
              maintenance_cost_per_arc: EXP_MAINT,
              worker_capacity:         EXP_WORKERS,
              updated_at:              trx.fn.now(),
            });

            // Create additional production lines (up to EXP_MAX_LINES)
            for (let lineNum = 2; lineNum <= EXP_MAX_LINES; lineNum++) {
              const alreadyExists = await trx('manufacturing_production_lines')
                .where({ factory_id: expandingFactory.id, line_number: lineNum }).first();
              if (!alreadyExists) {
                await trx('manufacturing_production_lines').insert({
                  world_instance_id: company.world_instance_id,
                  company_id: companyId,
                  factory_id: expandingFactory.id,
                  line_number: lineNum,
                  quality_setting: 'Standard',
                  target_units_per_arc: 0,
                  status: 'idle',
                });
              }
            }

            // Company record
            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `Workshop expansion completed. ${EXP_MAX_LINES} production lines now available (capacity: ${EXP_CAPACITY} units/Arc).`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark,
            });

            expansionCompletedNote = ` Factory Expansion Completed: Expanded Workshop — ${EXP_MAX_LINES} production lines, ${EXP_CAPACITY} units per Arc capacity.`;

            // Re-sync local factory list so cost calculations below use new values
            factories.forEach((f: any) => {
              if (f.id === expandingFactory.id) {
                f.capacity_per_arc       = EXP_CAPACITY;
                f.lease_cost_per_arc     = EXP_LEASE;
                f.maintenance_cost_per_arc = EXP_MAINT;
                f.worker_capacity        = EXP_WORKERS;
              }
            });
          }
        }

        if (activeProgramme) {
          const isAtLeastValidation = currentOrbit > activeProgramme.validation_arc_orbit || (currentOrbit === activeProgramme.validation_arc_orbit && currentArc >= activeProgramme.validation_arc_orbit);
          const isAtLeastCompletion = currentOrbit > activeProgramme.completion_arc_orbit || (currentOrbit === activeProgramme.completion_arc_orbit && currentArc >= activeProgramme.completion_arc_orbit);
          
          const progName = ENGINEERING_PROGRAMMES_CATALOG[activeProgramme.programme_id]?.name || activeProgramme.programme_id;

          if (isAtLeastCompletion) {
            await trx('manufacturing_engineering_programmes')
              .where({ id: activeProgramme.id })
              .update({ status: 'approved', updated_at: trx.fn.now() });

            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `${progName} was approved for company use.`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark
            });
            approvedResearchNames.push(progName);
          } else if (isAtLeastValidation && activeProgramme.status === 'engineering') {
            await trx('manufacturing_engineering_programmes')
              .where({ id: activeProgramme.id })
              .update({ status: 'validation', updated_at: trx.fn.now() });

            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `${progName} entered technical validation.`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark
            });
          }
        }

        // Load approved standards
        const approvedStandards = await trx('manufacturing_engineering_programmes')
          .where({ company_id: companyId, status: 'approved' });
        const hasAssemblyTimeStudy = approvedStandards.some((p: any) => p.programme_id === 'assembly-time');
        const hasSPC = approvedStandards.some((p: any) => p.programme_id === 'spc');

        // ─── 1. Production Phase ─────────────────────────────────────────────
        let totalUnitsProduced = 0;
        let totalProductionCosts = 0;
        let totalDefectiveUnits = 0;
        let totalPlannedUnits = 0;

        // Per-model tracking for snapshots
        const modelTracking = new Map<string, {
          unitsProduced: number; defectiveUnits: number; productionCost: number;
          defectLoss: number; unitsSold: number; salesRevenue: number;
          marketingCost: number; costPerUnit: number;
        }>();
        const ensureModelTracking = (modelId: string, costPerUnit: number) => {
          if (!modelTracking.has(modelId)) {
            modelTracking.set(modelId, { unitsProduced:0, defectiveUnits:0, productionCost:0, defectLoss:0, unitsSold:0, salesRevenue:0, marketingCost:0, costPerUnit });
          }
          return modelTracking.get(modelId)!;
        };

        // Workforce counts
        const workerCount      = staff.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
        const supervisorCount  = staff.find((s: any) => s.role === 'production-supervisor')?.quantity || 0;
        const inspectorCount   = staff.find((s: any) => s.role === 'quality-inspector')?.quantity || 0;

        // Arc-level tracking for report
        let arcWorkersRequired = 0;
        let arcSupervisorBonus = 0;
        let arcInspectorDefectReduction = 0;
        let arcProductionEfficiency = 1.0;

        // Count active production lines (for supervisor cap)
        const activeLineCount = productionLines.filter(
          (l: any) => factories.some((f: any) => String(f.id) === String(l.factory_id))
        ).length;

        // Load company component inventory
        const companyComponents = await trx('manufacturing_component_inventory')
          .where({ company_id: companyId })
          .forUpdate();
          
        const compInventory = {
          engine: companyComponents.find(c => c.component_id === 'comp_engine')?.units_in_stock || 0,
          transmission: companyComponents.find(c => c.component_id === 'comp_transmission')?.units_in_stock || 0,
          tyres: companyComponents.find(c => c.component_id === 'comp_tyres')?.units_in_stock || 0,
          steel: companyComponents.find(c => c.component_id === 'comp_steel')?.units_in_stock || 0,
          glass: companyComponents.find(c => c.component_id === 'comp_glass')?.units_in_stock || 0,
          electronics: companyComponents.find(c => c.component_id === 'comp_electronics')?.units_in_stock || 0,
        };
        
        // Define BOM (per vehicle)
        const BOM = { engine: 1, transmission: 1, tyres: 4, steel: 1, glass: 1, electronics: 1 };
        const BOM_COST = 3500 + 1800 + (400) + 2000 + 500 + 1200; // 9400

        for (const factory of factories) {
          const factoryType = await trx('manufacturing_factory_types').where({ id: factory.factory_type_id }).first();

          // Capacity & worker capacity from factory type
          const factoryCapacityPerArc    = Number(factory.capacity_per_arc);
          const factoryWorkerCapacity    = Number(factoryType.worker_requirement); // e.g. 40 for Small Workshop

          // Lines belonging to this factory
          const factoryLines = productionLines.filter((l: any) => String(l.factory_id) === String(factory.id));

          for (const line of factoryLines) {
            const targetUnits = Number(line.target_units_per_arc);
            totalPlannedUnits += targetUnits;

            // 🛠️ Phase 3B: Engineering production modifiers 🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️
            const engProdMods = deriveProductionModifiers(line as any);

            // 🛠️ Worker requirement formula 🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️
            // required_workers = ceil(targetUnits / factoryCapacity * (workerCapacity * assemblyHoursModifier))
            const requiredWorkers = targetUnits > 0
              ? Math.ceil((targetUnits / factoryCapacityPerArc) * (factoryWorkerCapacity * engProdMods.assemblyHoursModifier))
              : 0;
            arcWorkersRequired = Math.max(arcWorkersRequired, requiredWorkers);

            // Labor efficiency
            let laborEfficiency: number;
            if (requiredWorkers === 0) {
              laborEfficiency = 1.0; // no production planned
            } else if (workerCount === 0) {
              laborEfficiency = 0.0; // no workers, no production
            } else {
              laborEfficiency = Math.min(1.0, workerCount / requiredWorkers);
            }

            // Supervisor bonus (capped at 1 per active line)
            const usefulSupervisors = Math.min(supervisorCount, activeLineCount);
            const supervisorBonus   = usefulSupervisors > 0 ? 0.05 : 0.0;
            arcSupervisorBonus      = Math.max(arcSupervisorBonus, supervisorBonus);

            // Factory condition factor
            const conditionFactor = Number(factory.condition) / 100;

            // Final production efficiency
            let finalEfficiency = Math.min(1.0, laborEfficiency * conditionFactor * (1 + supervisorBonus));
            
            // Apply Assembly Line Balancing Standard
            if (hasAssemblyTimeStudy) {
              finalEfficiency = Math.min(1.0, finalEfficiency * 1.05);
            }
            
            arcProductionEfficiency = Math.min(arcProductionEfficiency, finalEfficiency);

            // Actual units produced (before component bottleneck)
            let unitsProduced: number;
            if (workerCount === 0 && requiredWorkers > 0) {
              unitsProduced = 0; // hard zero when no workers but production is planned
            } else {
              unitsProduced = Math.floor(targetUnits * finalEfficiency);
            }

            // Restrict by components
            let maxByComponents = Math.floor(compInventory.engine / BOM.engine);
            maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.transmission / BOM.transmission));
            maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.tyres / BOM.tyres));
            maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.steel / BOM.steel));
            maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.glass / BOM.glass));
            maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.electronics / BOM.electronics));

            if (unitsProduced > maxByComponents) {
               unitsProduced = maxByComponents;
            }

            if (unitsProduced <= 0) continue;

            // Deduct components from in-memory inventory
            compInventory.engine -= unitsProduced * BOM.engine;
            compInventory.transmission -= unitsProduced * BOM.transmission;
            compInventory.tyres -= unitsProduced * BOM.tyres;
            compInventory.steel -= unitsProduced * BOM.steel;
            compInventory.glass -= unitsProduced * BOM.glass;
            compInventory.electronics -= unitsProduced * BOM.electronics;

            const qualityKey = line.quality_setting || 'Standard';
            const baseDefectRate = QUALITY_DEFECT_RATES[qualityKey] ?? 0.03;


            let inspectorReduction = Math.min(inspectorCount * 0.005, baseDefectRate - 0.005);

            // Apply Statistical Process Control Standard
            if (hasSPC && inspectorCount > 0) {
              inspectorReduction += 0.005; // -0.5 percentage points
            }

            // Apply engineering manufacturing friendliness bonus to defect rate via multiplier
            const effectiveDefectRate = Math.max(
              0.005,
              (baseDefectRate - inspectorReduction) * engProdMods.defectModifier
            );
            arcInspectorDefectReduction = Math.max(arcInspectorDefectReduction, inspectorReduction);

            const defectiveUnits = Math.floor(unitsProduced * effectiveDefectRate);
            const sellableUnits  = unitsProduced - defectiveUnits;
            totalDefectiveUnits += defectiveUnits;

            // Production cost
            const costPerUnit    = Number(line.manufacturing_cost_per_unit);
            const rawAssemblyCost = Math.max(0, costPerUnit - BOM_COST);
            
            // Assembly cost multiplied by engineering labour complexity
            const assemblyCost   = Math.round(rawAssemblyCost * engProdMods.labourCostModifier);

            // Overall production cost modified by productionCostModifier
            const productionCost = Math.round((unitsProduced * assemblyCost + unitsProduced * BOM_COST) * engProdMods.productionCostModifier - unitsProduced * BOM_COST);
            const defectLoss     = Math.round(defectiveUnits * costPerUnit * engProdMods.productionCostModifier);

            runningCash          -= productionCost;
            totalProductionCosts += productionCost;
            totalUnitsProduced   += sellableUnits; // only sellable go to inventory

            // Track per-model (store engineering notes for arc report)
            const mt = ensureModelTracking(line.model_id_ref, costPerUnit);
            mt.unitsProduced   += sellableUnits;
            mt.defectiveUnits  += defectiveUnits;
            mt.productionCost  += productionCost;
            mt.defectLoss      += defectLoss;
            if (!(mt as any).engineeringNotes) {
              (mt as any).engineeringNotes = engProdMods.engineeringProductionNotes;
            }

            // ── Add sellable units to inventory ──────────────────────────────
            const existingInventory = await trx('manufacturing_inventory')
              .where({ company_id: companyId, vehicle_model_id: line.model_id_ref })
              .first();

            const inventoryValue     = sellableUnits * costPerUnit;
            const storageCostPerArc  = Math.round(sellableUnits * 150);

            if (existingInventory) {
              await trx('manufacturing_inventory').where({ id: existingInventory.id }).update({
                units_in_stock: existingInventory.units_in_stock + sellableUnits,
                inventory_value: Number(existingInventory.inventory_value) + inventoryValue,
                storage_cost_per_arc: Number(existingInventory.storage_cost_per_arc) + storageCostPerArc,
                updated_at: trx.fn.now(),
              });
            } else {
              await trx('manufacturing_inventory').insert({
                world_instance_id: company.world_instance_id,
                company_id: companyId,
                vehicle_model_id: line.model_id_ref,
                units_in_stock: sellableUnits,
                inventory_value: inventoryValue,
                storage_cost_per_arc: storageCostPerArc,
              });
            }
          }

          // Factory condition wear (2% per arc)
          await trx('manufacturing_factories').where({ id: factory.id }).update({
            condition: Math.max(10, Number(factory.condition) - 2),
            updated_at: trx.fn.now(),
          });
        }

        // Update company component inventory in DB
        await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: 'comp_engine' })
          .update({ units_in_stock: compInventory.engine, updated_at: trx.fn.now() });
        await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: 'comp_transmission' })
          .update({ units_in_stock: compInventory.transmission, updated_at: trx.fn.now() });
        await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: 'comp_tyres' })
          .update({ units_in_stock: compInventory.tyres, updated_at: trx.fn.now() });
        await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: 'comp_steel' })
          .update({ units_in_stock: compInventory.steel, updated_at: trx.fn.now() });
        await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: 'comp_glass' })
          .update({ units_in_stock: compInventory.glass, updated_at: trx.fn.now() });
        await trx('manufacturing_component_inventory')
          .where({ company_id: companyId, component_id: 'comp_electronics' })
          .update({ units_in_stock: compInventory.electronics, updated_at: trx.fn.now() });

        // ─── 2. Sales Phase ───────────────────────────────────────────────────
        // Process active market allocations. Sell from allocated inventory.
        let totalGrossRevenue = 0;
        let totalUnitsSold = 0;
        let totalMarketingCosts = 0;

        // Marketing costs from country config (loaded above with storageCostPerUnit)
        const MARKETING_COSTS: Record<string, number> = {
          none:     0,
          local:    Number(countryAutoConfig.marketing_cost_local    ?? 3500),
          regional: Number(countryAutoConfig.marketing_cost_regional ?? 12000),
          national: Number(countryAutoConfig.marketing_cost_national ?? 35000),
        };
        // Marketing demand multiplier (universal — not country-specific)
        const MARKETING_MULT: Record<string, number> = {
          none: 1.0, local: 1.15, regional: 1.30, national: 1.50,
        };


        // Sales Manager bonus
        const salesManagerCount = staff.find((s: any) => s.role === 'sales-manager')?.quantity || 0;
        // Load all active allocations for this company to count active markets
        const activeAllocationCount = await trx('manufacturing_market_allocations')
          .where('company_id', companyId)
          .where('units_allocated', '>', 0)
          .count('id as cnt')
          .first();
        const activeMarketCount = Number(activeAllocationCount?.cnt ?? 0);
        const usefulSalesManagers = Math.min(salesManagerCount, activeMarketCount);
        const salesManagerBonus  = Math.min(usefulSalesManagers * 0.04, 0.16);

        // Brand awareness per market
        const brandData = await trx('manufacturing_brand_awareness')
          .where({ company_id: companyId });
        
        const brandMap = new Map<string, any>();
        for (const b of brandData) {
          brandMap.set(b.region_market_id, b);
        }

        // Load all active allocations for this company
        const marketAllocations = await trx('manufacturing_market_allocations')
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

        // Run the sales simulation helper
        const modelDemandsList = ManufacturingController.simulateSalesDemand(
          marketAllocations,
          brandMap,
          MARKETING_MULT,
          salesManagerBonus
        );

        const marketStatsMap = new Map<string, any>();

        for (const md of modelDemandsList) {
          const alloc = md.alloc;
          const mktTier = md.mktTier;
          const unitsSold = md.unitsSold;
          const mainReasonCode = md.mainReasonCode;
          const marketPurchaseCapacity = md.marketPurchaseCapacity;
          const totalHouseholds = md.totalHouseholds;
          
          if (unitsSold <= 0) {
              const mktCost = MARKETING_COSTS[mktTier] ?? 0;
              totalMarketingCosts += mktCost;
              runningCash -= mktCost;
              if (mktCost > 0) {
                const mt2 = ensureModelTracking(alloc.vehicle_model_id, Number(alloc.manufacturing_cost_per_unit));
                mt2.marketingCost += mktCost;
              }
            } else {
              const revenue = Math.round(unitsSold * Number(alloc.sale_price));
              totalGrossRevenue += revenue;
              totalUnitsSold += unitsSold;
              runningCash += revenue;

              const mktCost = MARKETING_COSTS[mktTier] ?? 0;
              totalMarketingCosts += mktCost;
              runningCash -= mktCost;

              const mt3 = ensureModelTracking(alloc.vehicle_model_id, Number(alloc.manufacturing_cost_per_unit));
              mt3.unitsSold     += unitsSold;
              mt3.salesRevenue  += revenue;
              mt3.marketingCost += mktCost;

              const remainingAllocated = Number(alloc.units_allocated) - unitsSold;
              await trx('manufacturing_market_allocations')
                .where({ id: alloc.id })
                .update({ units_allocated: remainingAllocated, updated_at: trx.fn.now() });

              const invRecord = await trx('manufacturing_inventory')
                .where({ company_id: companyId, vehicle_model_id: alloc.vehicle_model_id })
                .first();
              if (invRecord) {
                const newStock = Math.max(0, Number(invRecord.units_in_stock) - unitsSold);
                const costPerUnit = Number(alloc.manufacturing_cost_per_unit);
                await trx('manufacturing_inventory').where({ id: invRecord.id }).update({
                  units_in_stock: newStock,
                  inventory_value: Math.max(0, newStock * costPerUnit),
                  storage_cost_per_arc: newStock * 150,
                  updated_at: trx.fn.now(),
                });
              }
            }

            const marketShare = Math.min(1, unitsSold / Math.max(1, md.rawBuyerInterest));
            await trx('manufacturing_sales_results').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              vehicle_model_id: alloc.vehicle_model_id,
              region_market_id: alloc.region_market_id,
              world_orbit: currentOrbit,
              world_arc: currentArc,
              units_sold: unitsSold,
              sale_price: alloc.sale_price,
              revenue: unitsSold * Number(alloc.sale_price),
              market_share_estimate: marketShare,
              addressable_households: totalHouseholds,
              market_purchase_capacity: marketPurchaseCapacity,
              affordability_multiplier: Math.round(md.affordability * 10000) / 10000,
              vehicle_market_fit_multiplier: Math.round(md.fitMultiplier * 10000) / 10000,
              awareness_multiplier: Math.round(md.awarenessMult * 10000) / 10000,
              trust_multiplier: Math.round(md.trustMult * 10000) / 10000,
              distribution_multiplier: Math.round(md.distMult * 10000) / 10000,
              marketing_multiplier: Math.round(md.mktMult * 10000) / 10000,
              raw_buyer_interest: Math.round(md.rawBuyerInterest * 10000) / 10000,
              final_assigned_demand: md.finalAssignedDemand,
              main_reason_code: mainReasonCode
            });

            // Aggregate for Phase 2 Local Brand Math
            if (!marketStatsMap.has(alloc.region_market_id)) {
              marketStatsMap.set(alloc.region_market_id, {
                marketName: md.alloc.name || md.alloc.region_market_id, // Actually, md.alloc doesn't have market name easily accessible unless I join it, but it's not strictly needed for math, but for records. Wait, getMarkets joins it? No, wait. We can query market names later or get it from `domesticMarkets`. Let's just track IDs for now.
                marketPurchaseCapacity: marketPurchaseCapacity,
                awarenessSensitivity: Number(alloc.brand_awareness_sensitivity) || 1.0,
                trustSensitivity: Number(alloc.brand_trust_sensitivity) || 1.0,
                distStrength: Number(alloc.distribution_strength) || 0.7,
                marketMarketingSpend: 0,
                highestMarketingTier: 'none',
                totalUnitsSold: 0,
                weightedReliabilitySum: 0,
                weightedDefectRateSum: 0,
              });
            }
            const ms = marketStatsMap.get(alloc.region_market_id);
            ms.marketMarketingSpend += (MARKETING_COSTS[mktTier] ?? 0);
            
            // Tier tracking for reporting
            const tierRank: Record<string, number> = { 'none': 0, 'local': 1, 'regional': 2, 'national': 3 };
            if (tierRank[mktTier] > tierRank[ms.highestMarketingTier]) {
                ms.highestMarketingTier = mktTier;
            }
            
            if (unitsSold > 0) {
               ms.totalUnitsSold += unitsSold;
               ms.weightedReliabilitySum += (unitsSold * Number(alloc.reliability_score));
               
               const mtForDefects = ensureModelTracking(alloc.vehicle_model_id, Number(alloc.manufacturing_cost_per_unit));
               const defectRate = (mtForDefects.unitsProduced + mtForDefects.defectiveUnits) > 0 
                  ? (mtForDefects.defectiveUnits / (mtForDefects.unitsProduced + mtForDefects.defectiveUnits))
                  : 0;
               ms.weightedDefectRateSum += (unitsSold * defectRate);
            }
          }

        const totalUnitsUnsold = totalUnitsProduced - totalUnitsSold;

        // ─── 3. Cost Deductions ──────────────────────────────────────────────
        // Staff wages
        let totalStaffWages = 0;
        for (const staffMember of staff) {
          const roleConfig = STAFF_ROLES.find(r => r.id === staffMember.role);
          if (roleConfig && staffMember.quantity > 0) {
            const wages = roleConfig.wagePerArc * staffMember.quantity;
            totalStaffWages += wages;
          }
        }

        // Clamp wages if company can't afford full payroll
        const availableBeforeWages = runningCash;
        const actualWagesPaid = Math.min(totalStaffWages, Math.max(0, availableBeforeWages));
        const wageShortfall = totalStaffWages - actualWagesPaid;
        runningCash -= actualWagesPaid;

        if (wageShortfall > 0) {
          // Resolve currency symbol for record message
          const wageCurrency = await trx('currencies').where({ id: company.currency_id }).first();
          const wageSym = wageCurrency?.symbol ?? '';
          await trx('company_records').insert({
            world_instance_id: company.world_instance_id,
            company_id: companyId,
            record_type: 'business',
            summary: `⚠ Wage shortfall: only ${wageSym}${actualWagesPaid.toLocaleString()} of ${wageSym}${totalStaffWages.toLocaleString()} wages paid this arc.`,
            created_at_world_orbit: currentOrbit,
            created_at_world_arc: currentArc,
            created_at_world_mark: currentMark,
          });
        }

        // Factory lease costs
        let totalLeaseCosts = 0;
        for (const factory of factories) {
          totalLeaseCosts += Number(factory.lease_cost_per_arc);
        }
        runningCash -= totalLeaseCosts;

        // Factory maintenance costs
        let totalMaintenanceCosts = 0;
        for (const factory of factories) {
          const baseMaintCost = Math.round(Number(factory.maintenance_cost_per_arc) * (Number(factory.condition) / 100));
          
          // Apply average engineering maintenance modifier based on active lines in this factory
          const factoryLines = productionLines.filter(l => l.factory_id === factory.id);
          let avgMaintModifier = 1.0;
          if (factoryLines.length > 0) {
            let sumMods = 0;
            for (const line of factoryLines) {
              sumMods += deriveProductionModifiers(line as any).maintenanceModifier;
            }
            avgMaintModifier = sumMods / factoryLines.length;
          }
          
          const maintCost = Math.round(baseMaintCost * avgMaintModifier);
          totalMaintenanceCosts += maintCost;
        }
        runningCash -= totalMaintenanceCosts;

        // Inventory storage costs — from country config (storageCostPerUnit loaded above)
        const allInventory = await trx('manufacturing_inventory').where({ company_id: companyId });
        let totalStorageCosts = 0;
        for (const inv of allInventory) {
          if (Number(inv.units_in_stock) > 0) {
            totalStorageCosts += Number(inv.units_in_stock) * storageCostPerUnit;
          }
        }
        runningCash -= totalStorageCosts;

        // ── Phase 3B Step 3: Warranty reserve deduction ────────────────────
        // Deduct a per-arc warranty reserve cost based on each model's reliability score.
        let totalWarrantyReserveCost = 0;
        for (const [mId, mt] of modelTracking) {
          if (mt.unitsSold <= 0) continue;
          const mModel = await trx('manufacturing_vehicle_models').select('reliability_score', 'manufacturing_cost_per_unit').where({ id: mId }).first();
          if (!mModel) continue;
          const warrantyModifiers = deriveWarrantyReserve(mModel as any);
          const wReservePerUnit = warrantyModifiers.warrantyReservePerUnit(Number(mModel.manufacturing_cost_per_unit ?? 0));
          const wReserveTotal = wReservePerUnit * mt.unitsSold;
          totalWarrantyReserveCost += wReserveTotal;
        }
        if (totalWarrantyReserveCost > 0) {
          runningCash -= totalWarrantyReserveCost;
        }

        const netProfit = totalGrossRevenue - totalProductionCosts - totalStaffWages - totalLeaseCosts - totalMaintenanceCosts - totalStorageCosts - totalMarketingCosts - totalWarrantyReserveCost;

        // ─── 3.5 Model Performance Snapshots ────────────────────────────────
        // One snapshot per model that had any activity this arc
        for (const [mId, mt] of modelTracking) {
          // Ending inventory for this model
          const mInv = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: mId }).first();
          const endingInventory = mInv ? Number(mInv.units_in_stock) : 0;
          // Storage cost = ending inventory * storageCostPerUnit (from country config)
          const storageCost = endingInventory * storageCostPerUnit;
          // Direct contribution = revenue - total production cost - defect loss - marketing - storage
          const directContribution = Math.round(
            mt.salesRevenue - mt.productionCost - mt.marketingCost - storageCost
          );
          // Upsert snapshot (do nothing on conflict — never overwrite historical data)
          const mModel = await trx('manufacturing_vehicle_models').where({ id: mId }).first();
          if (!mModel) continue;
          await trx.raw(`
            INSERT INTO manufacturing_model_snapshots
              (world_instance_id, company_id, model_id, world_orbit, world_arc,
               units_produced, defective_units, units_sold, ending_inventory,
               sales_revenue, production_cost, defect_loss, marketing_cost,
               storage_cost, direct_contribution)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (company_id, model_id, world_orbit, world_arc) DO NOTHING
          `, [
            company.world_instance_id, companyId, mId, currentOrbit, currentArc,
            mt.unitsProduced, mt.defectiveUnits, mt.unitsSold, endingInventory,
            mt.salesRevenue, mt.productionCost, mt.defectLoss, mt.marketingCost,
            storageCost, directContribution,
          ]);
        }


        // ─── 4. Finance Update ───────────────────────────────────────────────
        await trx('company_finances').where({ company_id: companyId }).update({
          available_cash: runningCash,
          last_arc_profit: netProfit,
          updated_at: trx.fn.now(),
        });

        // Update company reputation based on sales performance (slow, bounded 0–100)
        if (totalUnitsSold > 0) {
          await trx('companies').where({ id: companyId })
            .update({ reputation: db.raw('LEAST(100, reputation + 1)'), updated_at: trx.fn.now() });
        }

        // ─── Phase 2 + 3B: Local Brand Awareness, Trust, Engineering Reputation ─
        let localBrandReportLines: string[] = [];

        // Phase 3B Step 4: Load engineering reputation once for trust amplification
        const engRepForTrust = await trx('manufacturing_engineering_reputation')
          .where({ company_id: companyId }).first();
        const repReliabilityScore = Number(engRepForTrust?.reliability_rep ?? 0);
        const repMfgScore = Number(engRepForTrust?.mfg_efficiency_rep ?? 0);
        // Known-for-reliability companies get up to +15% trust sensitivity
        const repTrustSensBonus = repReliabilityScore >= 70 ? 0.15 : repReliabilityScore >= 50 ? 0.07 : 0;
        // Known-for-mfg-efficiency companies get additional defect rate reduction in trust calc
        const repMfgDefectBonus = repMfgScore >= 70 ? 0.002 : 0;

        for (const [marketId, ms] of marketStatsMap.entries()) {
          const mktMarketingSpend = ms.marketMarketingSpend;
          const totalMarketSold = ms.totalUnitsSold;
          const deliveryExposure = Math.min(1.0, totalMarketSold / Math.max(ms.marketPurchaseCapacity, 1));
          

          // Check for idempotency to avoid multi-triggering before making changes
          const existingArcResult = await trx('manufacturing_market_brand_arc_results')
             .where({ company_id: companyId, region_market_id: marketId, world_arc: currentArc })
             .first();
             
          if (existingArcResult) {
             continue;
          }

          // Get current market brand stats
          const currBrand = await trx('manufacturing_brand_awareness')
            .where({ company_id: companyId, region_market_id: marketId }).first();
            
          let oldAwareness = 0;
          let oldTrust = 0;
          let isNewRow = true;
          
          if (currBrand) {
            oldAwareness = Number(currBrand.awareness);
            oldTrust = Number(currBrand.reputation);
            isNewRow = false;
          }

          // AWARENESS MATH
          const countryMarketingNationalCost = MARKETING_COSTS['national'] || 1;
          const marketingIntensity = Math.min(1.25, mktMarketingSpend / Math.max(countryMarketingNationalCost, 1));
          const marketingAwarenessGain = 3.0 * Math.sqrt(marketingIntensity) * ms.awarenessSensitivity * ms.distStrength;
          const deliveryAwarenessGain = Math.min(1.0, deliveryExposure * 20);
          const awarenessDelta = Math.min(4.0, marketingAwarenessGain + deliveryAwarenessGain);
          const newAwareness = Math.min(100, Math.max(0, oldAwareness + awarenessDelta));
          
          let primaryAwarenessReason = 'None';
          if (marketingAwarenessGain > deliveryAwarenessGain && marketingAwarenessGain > 0.1) {
            primaryAwarenessReason = 'Marketing Campaigns';
          } else if (deliveryAwarenessGain >= marketingAwarenessGain && deliveryAwarenessGain > 0.1) {
            primaryAwarenessReason = 'Market Presence';
          }
          
          // TRUST MATH
          let trustDelta = 0;
          let primaryTrustReason = 'None';
          let wReliability = 0;
          let wDefectRate = 0;

          if (totalMarketSold > 0) {
            wReliability = ms.weightedReliabilitySum / totalMarketSold;
            wDefectRate = ms.weightedDefectRateSum / totalMarketSold;

            const qualityConfidence = Math.min(1.0, Math.max(0.0, (0.75 * (wReliability / 100) + 0.25 * (1 - wDefectRate))));

            // Phase 3B Step 4: Reliability trust multiplier
            const trustMods = deriveTrustModifiers({ reliability_score: wReliability }, engRepForTrust as any);

            // Apply engineering reputation trust bonus to trust sensitivity
            const effectiveTrustSensitivity = ms.trustSensitivity * trustMods.reputationTrustSensitivityBoost;

            // Apply mfg reputation bonus to defect rate (reduces effective defect in trust calc)
            const effectiveWDefectRate = Math.max(0, wDefectRate - trustMods.reputationDefectReduction);

            const trustDeliveryGain = Math.min(1.5, deliveryExposure * 15) * qualityConfidence * effectiveTrustSensitivity * trustMods.trustDeliveryMultiplier;
            const trustDefectPenalty = Math.min(2.5, 100 * deliveryExposure * effectiveWDefectRate) * trustMods.trustDefectMultiplier;

            trustDelta = Math.max(-2.5, Math.min(1.5, trustDeliveryGain - trustDefectPenalty));

            if (trustDefectPenalty > trustDeliveryGain && trustDefectPenalty > 0.1) {
               primaryTrustReason = 'Defective Products';
            } else if (trustDeliveryGain >= trustDefectPenalty && trustDeliveryGain > 0.1) {
               primaryTrustReason = 'Reliable Products';
            }
          }
          
          const newTrust = Math.min(100, Math.max(0, oldTrust + trustDelta));
          
          // Update manufacturing_brand_awareness
          if (isNewRow) {
             await trx('manufacturing_brand_awareness').insert({
                 company_id: companyId,
                 region_market_id: marketId,
                 awareness: Math.round(newAwareness),
                 reputation: Math.round(newTrust)
             });
          } else {
             await trx('manufacturing_brand_awareness')
                 .where({ company_id: companyId, region_market_id: marketId })
                 .update({
                     awareness: Math.round(newAwareness),
                     reputation: Math.round(newTrust),
                     updated_at: trx.fn.now()
                 });
          }
          
          // Insert manufacturing_market_brand_arc_results
          await trx('manufacturing_market_brand_arc_results').insert({
             company_id: companyId,
             region_market_id: marketId,
             world_arc: currentArc,
             awareness_before: Math.round(oldAwareness),
             awareness_delta: awarenessDelta,
             awareness_after: Math.round(newAwareness),
             trust_before: Math.round(oldTrust),
             trust_delta: trustDelta,
             trust_after: Math.round(newTrust),
             market_marketing_spend: mktMarketingSpend,
             effective_marketing_tier: ms.highestMarketingTier,
             total_units_sold: totalMarketSold,
             weighted_reliability: wReliability,
             weighted_defect_rate: wDefectRate,
             primary_awareness_reason: primaryAwarenessReason,
             primary_trust_reason: primaryTrustReason
          });

          // Helper to safely insert milestones
          const checkAndInsertMilestone = async (mType: string, summaryText: string, recordType: string = 'milestone') => {
             const exists = await trx('manufacturing_market_brand_milestones').where({ company_id: companyId, region_market_id: marketId, milestone_type: mType }).first();
             if (!exists) {
                const [rec] = await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: recordType, summary: summaryText, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark }).returning('*');
                await trx('manufacturing_market_brand_milestones').insert({
                   company_id: companyId,
                   region_market_id: marketId,
                   milestone_type: mType,
                   reached_world_arc: currentArc,
                   company_record_id: rec.id
                });
             }
          };

          // Milestone Company Records (Awareness)
          if (oldAwareness < 15 && newAwareness >= 15) await checkAndInsertMilestone('awareness_recognised', `Local brand awareness reached Recognised status in ${ms.marketName}.`);
          if (oldAwareness < 50 && newAwareness >= 50) await checkAndInsertMilestone('awareness_established', `Local brand awareness reached Established status in ${ms.marketName}.`);
          
          // Milestone Company Records (Trust)
          if (oldTrust < 20 && newTrust >= 20) await checkAndInsertMilestone('trust_developing', `Local brand trust became Developing in ${ms.marketName}.`);
          if (oldTrust < 60 && newTrust >= 60) await checkAndInsertMilestone('trust_trusted', `Local brand trust became Trusted in ${ms.marketName}.`);
          
          // Negative Trust Record (Ordinary Record)
          if (oldTrust - newTrust >= 1.0 && primaryTrustReason === 'Defective Products') {
              await trx('company_records').insert({
                 world_instance_id: company.world_instance_id,
                 company_id: companyId,
                 record_type: 'business',
                 summary: `Quality Warning: Trust declined in ${ms.marketName} due to defective products.`,
                 created_at_world_orbit: currentOrbit,
                 created_at_world_arc: currentArc,
                 created_at_world_mark: currentMark
              });
          }
              const oldAwarenessStr = Math.round(oldAwareness).toString();
              const newAwarenessStr = Math.round(newAwareness).toString();
              const oldTrustStr = Math.round(oldTrust).toString();
              const newTrustStr = Math.round(newTrust).toString();
                 
              localBrandReportLines.push(`Market: ${ms.marketName}\n` +
                `- Awareness: ${oldAwarenessStr} -> ${newAwarenessStr} (${primaryAwarenessReason})\n` +
                `- Trust: ${oldTrustStr} -> ${newTrustStr} (${primaryTrustReason})\n` +
                `- Marketing: ${ms.highestMarketingTier} (${mktMarketingSpend})\n` +
                `- Units Sold: ${totalMarketSold}\n` +
                `- Avg Reliability: ${Math.round(wReliability)}\n` +
                `- Avg Defect Rate: ${(wDefectRate * 100).toFixed(1)}%`);
        }


        // ─── 5. Ledger Entries ───────────────────────────────────────────────
        const ledgerEntries = [];
        if (totalGrossRevenue > 0) {
          ledgerEntries.push({
            entry_type: 'manufacturing_sales_revenue',
            description: `Arc ${currentOrbit}.${currentArc} — Vehicle Sales (${totalUnitsSold} units)`,
            amount: totalGrossRevenue,
          });
        }
        if (totalProductionCosts > 0) {
          ledgerEntries.push({
            entry_type: 'production_cost',
            description: `Arc ${currentOrbit}.${currentArc} — Production Costs (${totalUnitsProduced} units)`,
            amount: -totalProductionCosts,
          });
        }
        if (totalStaffWages > 0) {
          ledgerEntries.push({
            entry_type: 'manufacturing_staff_wage',
            description: `Arc ${currentOrbit}.${currentArc} — Staff Wages`,
            amount: -totalStaffWages,
          });
        }
        if (totalLeaseCosts > 0) {
          ledgerEntries.push({
            entry_type: 'factory_lease',
            description: `Arc ${currentOrbit}.${currentArc} — Factory Lease`,
            amount: -totalLeaseCosts,
          });
        }
        if (totalMaintenanceCosts > 0) {
          ledgerEntries.push({
            entry_type: 'factory_maintenance',
            description: `Arc ${currentOrbit}.${currentArc} — Factory Maintenance`,
            amount: -totalMaintenanceCosts,
          });
        }
        if (totalStorageCosts > 0) {
          ledgerEntries.push({
            entry_type: 'inventory_storage',
            description: `Arc ${currentOrbit}.${currentArc} — Inventory Storage`,
            amount: -totalStorageCosts,
          });
        }
        if (totalMarketingCosts > 0) {
          ledgerEntries.push({
            entry_type: 'marketing_expense',
            description: `Arc ${currentOrbit}.${currentArc} — Marketing Spend`,
            amount: -totalMarketingCosts,
          });
        }
        if (totalWarrantyReserveCost > 0) {
          ledgerEntries.push({
            entry_type: 'expense',
            description: `Arc ${currentOrbit}.${currentArc} — Warranty Reserve`,
            amount: -totalWarrantyReserveCost,
          });
        }

        let ledgerBalance = Number(finances.available_cash);
        for (const entry of ledgerEntries) {
          ledgerBalance += entry.amount;
          await trx('company_ledger').insert({
            company_id: companyId,
            game_orbit: currentOrbit,
            game_arc: currentArc,
            game_mark: currentMark,
            entry_type: entry.entry_type,
            description: entry.description,
            amount: entry.amount,
            balance_after: ledgerBalance,
          });
        }

        // ─── 6. Arc Report ───────────────────────────────────────────────────
        const efficiencyPct = Math.round(arcProductionEfficiency * 10000) / 10000;
        const defectReductionPct = Math.round(arcInspectorDefectReduction * 10000) / 10000;
        const workerNote = arcWorkersRequired > 0
          ? ` Workers: ${workerCount}/${arcWorkersRequired}.`
          : '';
        const defectNote = totalDefectiveUnits > 0 ? ` Defective: ${totalDefectiveUnits}.` : '';
        const approvedNote = approvedResearchNames.length > 0 ? ` Engineering Programme Approved: ${approvedResearchNames.join(', ')}.` : '';
        // Resolve currency symbol for arc summary
        const arcCurrency = await trx('currencies').where({ id: company.currency_id }).first();
        const arcSym = arcCurrency?.symbol ?? '';
        let summary = `Arc ${currentOrbit}.${currentArc}: Planned ${totalPlannedUnits}, produced ${totalUnitsProduced + totalDefectiveUnits} (${totalDefectiveUnits} defective). Sold ${totalUnitsSold}. Revenue ${arcSym}${totalGrossRevenue.toLocaleString()}. Net ${netProfit >= 0 ? '+' : ''}${arcSym}${netProfit.toLocaleString()}.${workerNote}${defectNote}${approvedNote}${expansionCompletedNote}`;
        if (localBrandReportLines.length > 0) {
           summary += '\n\n=== Local Brand Updates ===\n' + localBrandReportLines.join('\n');
        }

        const [report] = await trx('manufacturing_arc_reports').insert({
          world_instance_id: company.world_instance_id,
          company_id: companyId,
          world_orbit: currentOrbit,
          world_arc: currentArc,
          world_mark: currentMark,
          units_produced: totalUnitsProduced,
          units_sold: totalUnitsSold,
          units_unsold: totalUnitsUnsold,
          gross_revenue: totalGrossRevenue,
          sales_revenue: totalGrossRevenue,
          marketing_costs: totalMarketingCosts,
          production_costs: totalProductionCosts,
          staff_wages: totalStaffWages,
          factory_lease_costs: totalLeaseCosts,
          factory_maintenance_costs: totalMaintenanceCosts,
          inventory_storage_costs: totalStorageCosts,
          net_profit: netProfit,
          ending_cash: runningCash,
          // Workforce metrics
          planned_units: totalPlannedUnits,
          defective_units: totalDefectiveUnits,
          production_efficiency: efficiencyPct,
          factory_workers_required: arcWorkersRequired,
          factory_workers_available: workerCount,
          supervisor_bonus: arcSupervisorBonus,
          inspector_defect_reduction: defectReductionPct,
          sales_manager_bonus: salesManagerBonus,
          summary,
          factory_expansion_note: expansionCompletedNote || null,
          warranty_reserve_cost: totalWarrantyReserveCost || 0,
        }).returning('*');

        return { report, netProfit, endingCash: runningCash };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /companies/:companyId/manufacturing/production/lines/:lineId/pause
  public static async pauseProductionLine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { companyId, lineId } = req.params;
      if (!userId || !companyId || !lineId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
      if (!userId || !companyId || !lineId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const { company } = await verifyManufacturingCompany(db, userId, companyId);

      // All markets for this company's country
      const markets = await db('manufacturing_region_markets')
        .where({ country_id: company.country_id, status: 'active' })
        .orderBy('population', 'desc');

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
        brandMap.set(b.region_market_id, b);
      }

      const forecast = ManufacturingController.simulateSalesDemand(
          joinedAllocations,
          brandMap,
          MARKETING_MULT,
          salesManagerBonus
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
          .first();
        const totalStock = Number(inventory?.units_in_stock ?? 0);

        // Current allocations for this model excluding the current record
        const otherAllocations = await trx('manufacturing_market_allocations')
          .where({ company_id: companyId, vehicle_model_id: vehicleModelId })
          .whereNot({ region_market_id: regionMarketId })
          .sum('units_allocated as total')
          .first();
        const othersTotal = Number(otherAllocations?.total ?? 0);

        if (units + othersTotal > totalStock) {
          throw new AppError(
            `Cannot allocate ${units} units — only ${Math.max(0, totalStock - othersTotal)} available (${totalStock} in stock, ${othersTotal} allocated elsewhere)`,
            400, 'OVER_ALLOCATION'
          );
        }

        // Upsert allocation
        const existing = await trx('manufacturing_market_allocations')
          .where({ company_id: companyId, vehicle_model_id: vehicleModelId, region_market_id: regionMarketId })
          .first();

        if (existing) {
          await trx('manufacturing_market_allocations').where({ id: existing.id }).update({
            units_allocated: units,
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
      if (!userId || !companyId || !allocId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
          .first();
        if (activeProg) {
          throw new AppError(`Your engineering team is currently committed to ${ENGINEERING_PROGRAMMES_CATALOG[activeProg.programme_id]?.name || activeProg.programme_id}. Complete the active programme before approving another one.`, 400, 'ACTIVE_PROGRAMME');
        }

        // 2. Check if already approved
        const approvedProg = await trx('manufacturing_engineering_programmes')
          .where({ company_id: companyId, programme_id: programmeId, status: 'approved' })
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
        const progBudget = Number(progConfig.budget ?? 200000);
        const progBaseDuration = Number(progConfig.baseDuration ?? 2);

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
        const startOrbit = clock?.current_orbit || 1;
        const startArc = clock?.current_arc || 1;

        // Validation happens in the middle/end depending on logic.
        // User requested: Validation on arc reached, Approved on completion.
        // Let's say Validation takes 1 arc, Engineering takes the rest.
        // So validationArc = startArc + durationArcs - 1
        // completionArc = startArc + durationArcs
        
        let completionArcTotal = startArc + durationArcs;
        let validationArcTotal = completionArcTotal - 1;

        let compOrbit = startOrbit + Math.floor(completionArcTotal / 36);
        let compArc = completionArcTotal % 36;
        if (compArc === 0) { compArc = 36; compOrbit -= 1; }

        let valOrbit = startOrbit + Math.floor(validationArcTotal / 36);
        let valArc = validationArcTotal % 36;
        if (valArc === 0) { valArc = 36; valOrbit -= 1; }

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
          started_arc_orbit: startOrbit,
          started_arc: startArc,
          validation_arc_orbit: valOrbit,
          validation_arc: valArc,
          completion_arc_orbit: compOrbit,
          completion_arc: compArc
        });

        // Ledger
        await trx('company_ledger').insert({
          company_id: companyId,
          game_orbit: startOrbit,
          game_arc: startArc,
          game_mark: clock?.current_mark || 1,
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
          created_at_world_orbit: startOrbit,
          created_at_world_arc: startArc,
          created_at_world_mark: clock?.current_mark || 1,
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
        const EXPANSION_DURATION_ARCS = Number(autoConfig?.expansion_duration_arcs ?? 2);

        // Load the factory
        const factory = await trx('manufacturing_factories')
          .where({ id: factoryId, company_id: companyId, status: 'active' })
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
        const startOrbit = clock?.current_orbit || 1;
        const startArc   = clock?.current_arc   || 1;

        // Calculate completion arc (2 arcs from now, wrapping orbit at 36)
        const rawCompletionArc = startArc + EXPANSION_DURATION_ARCS;
        let compOrbit = startOrbit + Math.floor(rawCompletionArc / 36);
        let compArc   = rawCompletionArc % 36;
        if (compArc === 0) { compArc = 36; compOrbit -= 1; }

        // Mark factory as under construction
        await trx('manufacturing_factories').where({ id: factoryId }).update({
          expansion_status:             'construction_underway',
          expansion_started_orbit:      startOrbit,
          expansion_started_arc:        startArc,
          expansion_completion_orbit:   compOrbit,
          expansion_completion_arc:     compArc,
          expansion_cost:               EXPANSION_COST,
          updated_at:                   trx.fn.now(),
        });

        // Ledger entry
        await trx('company_ledger').insert({
          company_id: companyId,
          game_orbit:  startOrbit,
          game_arc:    startArc,
          game_mark:   clock?.current_mark || 1,
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
          created_at_world_orbit: startOrbit,
          created_at_world_arc:   startArc,
          created_at_world_mark:  clock?.current_mark || 1,
        });

        return {
          expansionStatus: 'construction_underway',
          startedOrbit:    startOrbit,
          startedArc:      startArc,
          completionOrbit: compOrbit,
          completionArc:   compArc,
          availableCash:   updatedFinances.available_cash,
        };
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

      if (!userId || !companyId || !modelId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
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

        // Recalculate scores with fixed base components + new quality/package
        let scores = calculateDesignScores({ 
          vehicleClass: sourceModel.vehicle_class, 
          platform: sourceModel.platform_type, 
          powerUnit: sourceModel.power_unit_type, 
          drivetrain: sourceModel.drivetrain_type, 
          interiorTier: sourceModel.interior_tier, 
          safetyTier: sourceModel.safety_tier, 
          qualityTarget 
        });

        // Apply engineering package modifiers
        if (appliedEngineeringPackage === 'economy-tune') {
          scores.fuelEfficiencyScore = Math.min(100, scores.fuelEfficiencyScore + 6);
          scores.performanceScore = Math.max(10, scores.performanceScore - 2);
          scores.manufacturingCostPerUnit = Math.round(scores.manufacturingCostPerUnit * 1.03);
        } else if (appliedEngineeringPackage === 'safety-arch') {
          scores.safetyScore = Math.min(100, (scores.safetyScore || 50) + 8);
          scores.manufacturingCostPerUnit = Math.round(scores.manufacturingCostPerUnit * 1.05);
        } else if (appliedEngineeringPackage === 'durability-val') {
          scores.reliabilityScore = Math.min(100, scores.reliabilityScore + 6);
          scores.manufacturingCostPerUnit = Math.round(scores.manufacturingCostPerUnit * 1.02);
        }

        const computedSegment = qualityTarget === 'budget' ? 'Economy'
          : qualityTarget === 'premium' ? 'Premium'
          : 'Mid-Range';
        const finalSegment = targetSegment || computedSegment;
        
        const finalSalePrice = salePrice && Number(salePrice) > 0
          ? Number(salePrice)
          : scores.manufacturingCostPerUnit * 1.5;

        const clock = await trx('world_clock').first();

        // Facelift dev cost = base_vehicle_dev_cost * facelift_cost_fraction (from country config)
        const BASE_FACELIFT_COST = Math.round(
          Number(autoConfig?.base_vehicle_dev_cost ?? 150000) *
          Number(autoConfig?.facelift_cost_fraction ?? 0.6)
        );

        const engineerStaff = await trx('company_staff')
          .where({ company_id: companyId, role: 'automotive-engineer' }).first();
        const engineerCount = engineerStaff?.quantity || 0;
        const devCostDiscount = Math.min(engineerCount * 0.05, 0.20);

        const finalDevCost = Math.round(BASE_FACELIFT_COST * (1 - devCostDiscount));

        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < finalDevCost) {
          throw new AppError(`Insufficient company funds. Requires ${currencySymbol}${finalDevCost.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
        }

        const [updatedFinances] = await trx('company_finances')
          .where({ company_id: companyId })
          .decrement('available_cash', finalDevCost)
          .returning('*');

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
          manufacturing_cost_per_unit: scores.manufacturingCostPerUnit,
          reliability_score: scores.reliabilityScore,
          performance_score: scores.performanceScore,
          fuel_efficiency_score: scores.fuelEfficiencyScore,
          appeal_score: scores.appealScore,
          cargo_score: scores.cargoScore,
          safety_score: scores.safetyScore || 50,
          target_segment: finalSegment,
          sale_price: finalSalePrice,
          development_cost_discount: devCostDiscount,
          applied_engineering_package: appliedEngineeringPackage || null,
          status: 'active',
          development_status: 'in_development',
          development_type: 'facelift',
          facelift_source_model_id: sourceModel.id,
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
          development_started_at_orbit: clock?.current_orbit || 1,
          development_started_at_arc: clock?.current_arc || 1,
          development_completes_at_orbit: clock?.current_orbit || 1,
          development_completes_at_arc: (clock?.current_arc || 1) + 1, // Facelift takes 1 Arc
        }).returning('*');

        await trx('company_ledger').insert({
          company_id: companyId,
          game_orbit: clock?.current_orbit || 1,
          game_arc: clock?.current_arc || 1,
          game_mark: clock?.current_mark || 1,
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
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
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

      if (!userId || !companyId || !modelId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
            discontinued_orbit: clock?.current_orbit || 1,
            discontinued_arc: clock?.current_arc || 1,
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
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
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

      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      await verifyManufacturingCompany(db, userId, companyId);

      const snapshots = await db('manufacturing_model_snapshots')
        .where({ company_id: companyId })
        .orderBy('world_orbit', 'desc')
        .orderBy('world_arc', 'desc');

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

      if (!userId || !companyId || !modelId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

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
          'dev_stage', 'planned_dev_time_arcs', 'balance_flags', 'engineering_report',
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

      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
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
      // Non-fatal — log but don't fail the arc
      console.error('[Engineering Knowledge] Failed to award XP:', err);
    }
  }
}
