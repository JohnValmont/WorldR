import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';

// ── Design Component Options (Bootstrap data) ─────────────────────────────────
const VEHICLE_CLASSES = ['Compact Car', 'Sedan', 'Utility Van'];

const PLATFORMS = [
  { id: 'economy',    label: 'Economy Platform',    desc: 'Low cost, lower appeal. Best for budget vehicles.' },
  { id: 'standard',  label: 'Standard Platform',   desc: 'Balanced cost and quality. Versatile.' },
  { id: 'heavy-duty',label: 'Heavy-Duty Platform', desc: 'High cargo capacity and reliability. Higher cost.' },
];

const POWER_UNITS = [
  { id: 'small-i4',    label: 'Small Inline-4',    desc: 'Fuel-efficient, low output, low cost.' },
  { id: 'standard-i4',label: 'Standard Inline-4',  desc: 'Balanced performance and economy.' },
  { id: 'v6',          label: 'V6 Engine',          desc: 'Strong performance. Higher cost, lower efficiency.' },
  { id: 'basic-electric', label: 'Basic Electric Motor', desc: 'Coming Soon — Locked', locked: true },
];

const DRIVETRAINS = [
  { id: 'fwd', label: 'Front-Wheel Drive',  desc: 'Lowest cost. Standard for compact and economy cars.' },
  { id: 'rwd', label: 'Rear-Wheel Drive',   desc: 'Better handling. Slight cost premium.' },
  { id: 'awd', label: 'All-Wheel Drive',    desc: 'Best traction. Higher cost and weight.' },
];

const INTERIOR_TIERS = [
  { id: 'basic',   label: 'Basic Interior',   desc: 'Functional. Low appeal, low cost.' },
  { id: 'comfort', label: 'Comfort Interior', desc: 'Mid-range fit. Notable appeal boost.' },
  { id: 'premium', label: 'Premium Interior', desc: 'High quality materials. Strong appeal.' },
];

const SAFETY_TIERS = [
  { id: 'standard', label: 'Standard Safety',  desc: 'Meets minimum regulations.' },
  { id: 'enhanced', label: 'Enhanced Safety',  desc: 'Better passenger protection.' },
  { id: 'advanced', label: 'Advanced Safety',  desc: 'Top-tier safety. Strong reliability and appeal bonus.' },
];

const QUALITY_TARGETS = [
  { id: 'budget',   label: 'Budget Quality',   desc: 'Cost-focused. Lower reliability but cheaper to make.' },
  { id: 'standard', label: 'Standard Quality', desc: 'Balanced production standard.' },
  { id: 'premium',  label: 'Premium Quality',  desc: 'High-spec production. Better reliability and appeal.' },
];

const STAFF_ROLES = [
  { id: 'factory-worker',     label: 'Factory Worker',      wagePerArc: 2800 },
  { id: 'engineer',           label: 'Engineer',            wagePerArc: 6500 },
  { id: 'quality-inspector',  label: 'Quality Inspector',   wagePerArc: 4200 },
  { id: 'admin-clerk',        label: 'Admin Clerk',         wagePerArc: 3000 },
];

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

  // === Manufacturing Cost Per Unit ===
  let baseCost = platform === 'economy' ? 8000 : platform === 'standard' ? 12000 : 18000;
  const engineCost = powerUnit === 'small-i4' ? 1500 : powerUnit === 'standard-i4' ? 2500 : 4500;
  const drivetrainCost = drivetrain === 'fwd' ? 0 : drivetrain === 'rwd' ? 500 : 2000;
  const interiorCost = interiorTier === 'basic' ? 0 : interiorTier === 'comfort' ? 1500 : 3500;
  const safetyCost = safetyTier === 'standard' ? 0 : safetyTier === 'enhanced' ? 1000 : 2500;
  const qualityMultiplier = qualityTarget === 'budget' ? 0.85 : qualityTarget === 'standard' ? 1.0 : 1.20;

  const manufacturingCostPerUnit = Math.round(
    (baseCost + engineCost + drivetrainCost + interiorCost + safetyCost) * qualityMultiplier
  );

  // === Reliability Score (0-100) ===
  let reliability = 50;
  if (safetyTier === 'enhanced') reliability += 10;
  if (safetyTier === 'advanced') reliability += 20;
  if (qualityTarget === 'premium') reliability += 15;
  if (qualityTarget === 'budget') reliability -= 10;
  if (platform === 'economy') reliability -= 5;
  if (platform === 'heavy-duty') reliability += 10;
  if (powerUnit === 'v6') reliability -= 5;
  reliability = Math.min(100, Math.max(10, reliability));

  // === Performance Score (0-100) ===
  let performance = 40;
  if (powerUnit === 'small-i4') performance += 0;
  if (powerUnit === 'standard-i4') performance += 10;
  if (powerUnit === 'v6') performance += 25;
  if (drivetrain === 'awd') performance += 5;
  if (drivetrain === 'rwd') performance += 5;
  if (platform === 'heavy-duty') performance -= 5;
  if (vehicleClass === 'Compact Car') performance += 5;
  performance = Math.min(100, Math.max(10, performance));

  // === Fuel Efficiency Score (0-100) ===
  let fuelEfficiency = 60;
  if (powerUnit === 'small-i4') fuelEfficiency += 15;
  if (powerUnit === 'v6') fuelEfficiency -= 15;
  if (drivetrain === 'awd') fuelEfficiency -= 10;
  if (platform === 'heavy-duty') fuelEfficiency -= 15;
  if (vehicleClass === 'Compact Car') fuelEfficiency += 8;
  if (vehicleClass === 'Utility Van') fuelEfficiency -= 10;
  fuelEfficiency = Math.min(100, Math.max(10, fuelEfficiency));

  // === Appeal Score (0-100) ===
  let appeal = 45;
  if (interiorTier === 'comfort') appeal += 15;
  if (interiorTier === 'premium') appeal += 30;
  if (safetyTier === 'enhanced') appeal += 5;
  if (safetyTier === 'advanced') appeal += 10;
  if (platform === 'standard') appeal += 5;
  if (platform === 'economy') appeal -= 10;
  if (qualityTarget === 'premium') appeal += 10;
  if (qualityTarget === 'budget') appeal -= 8;
  if (vehicleClass === 'Sedan') appeal += 8;
  appeal = Math.min(100, Math.max(10, appeal));

  // === Cargo Score (0-100) ===
  let cargo = 30;
  if (vehicleClass === 'Utility Van') cargo += 35;
  if (platform === 'heavy-duty') cargo += 25;
  if (drivetrain === 'awd') cargo += 5;
  if (vehicleClass === 'Compact Car') cargo -= 10;
  cargo = Math.min(100, Math.max(5, cargo));

  return {
    manufacturingCostPerUnit,
    reliabilityScore: reliability,
    performanceScore: performance,
    fuelEfficiencyScore: fuelEfficiency,
    appealScore: appeal,
    cargoScore: cargo,
  };
}

// ── Demand Calculation ────────────────────────────────────────────────────────
function calculateMarketDemand(market: any, model: any): number {
  const { population, average_income, economic_multiplier } = market;
  const { vehicle_class, appeal_score, sale_price } = model;

  // Base demand fraction: how many people in a market might buy a vehicle per arc
  // Rough: 1 in 300 people per arc buys a new car (annual ~4 per 1000 / 4 arcs)
  const baseDemandFraction = 0.0033;

  // Preference factor from market's vehicle class preferences
  let preferenceFactor = 1.0;
  if (vehicle_class === 'Compact Car') preferenceFactor = Number(market.preference_compact);
  else if (vehicle_class === 'Sedan') preferenceFactor = Number(market.preference_sedan);
  else if (vehicle_class === 'Utility Van') preferenceFactor = Number(market.preference_utility_van);

  // Income affordability factor: price vs income
  const averageAffordablePrice = Number(average_income) * 0.8;
  let affordabilityFactor = 1.0;
  if (Number(sale_price) > averageAffordablePrice) {
    const overpricedRatio = Number(sale_price) / averageAffordablePrice;
    affordabilityFactor = Math.max(0.05, 1 / (overpricedRatio * 1.5));
  }

  // Appeal modifier (appeal_score / 65 = 1.0 baseline)
  const appealFactor = Math.max(0.3, Number(appeal_score) / 65);

  const rawDemand = population * baseDemandFraction * preferenceFactor * affordabilityFactor * appealFactor * Number(economic_multiplier);

  return Math.floor(Math.max(0, rawDemand));
}

// ── Helper: Verify ownership ──────────────────────────────────────────────────
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

  return { character, company };
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
        vehicleClasses: VEHICLE_CLASSES,
        platforms: PLATFORMS,
        powerUnits: POWER_UNITS,
        drivetrains: DRIVETRAINS,
        interiorTiers: INTERIOR_TIERS,
        safetyTiers: SAFETY_TIERS,
        qualityTargets: QUALITY_TARGETS,
        staffRoles: STAFF_ROLES,
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

      const models = await db('manufacturing_vehicle_models')
        .where({ company_id: companyId, status: 'active' })
        .orderBy('created_at', 'desc');

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

      const staff = await db('company_staff').where({ company_id: companyId });

      const ledger = await db('company_ledger')
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc')
        .limit(50);

      const finances = await db('company_finances').where({ company_id: companyId }).first();

      // Get home state market
      const homeMarket = await db('manufacturing_region_markets')
        .where({ state_id: company.headquarters_state_id, status: 'active' })
        .first();

      const allMarkets = await db('manufacturing_region_markets')
        .where({ country_id: company.country_id, status: 'active' });

      res.status(200).json({
        factories,
        productionLines,
        models,
        inventory,
        latestReport,
        allReports,
        staff,
        ledger,
        finances,
        homeMarket,
        allMarkets,
        staffRoles: STAFF_ROLES,
      });
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
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);

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
          throw new AppError(`Insufficient funds. Factory lease requires ₯${leaseCost.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
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
      const { name, vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget, salePrice, targetSegment: reqSegment } = req.body;

      if (!userId || !companyId) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));
      if (!name || !vehicleClass || !platform || !powerUnit || !drivetrain || !interiorTier || !safetyTier || !qualityTarget) {
        return next(new AppError('All design choices are required', 400, 'BAD_REQUEST'));
      }
      if (!VEHICLE_CLASSES.includes(vehicleClass)) return next(new AppError('Invalid vehicle class', 400, 'BAD_REQUEST'));

      const scores = calculateDesignScores({ vehicleClass, platform, powerUnit, drivetrain, interiorTier, safetyTier, qualityTarget });

      const result = await db.transaction(async (trx) => {
        const { company } = await verifyManufacturingCompany(trx, userId, companyId);

        // Check model name uniqueness per company
        const existingModel = await trx('manufacturing_vehicle_models')
          .whereRaw('company_id = ? AND LOWER(name) = ?', [companyId, name.toLowerCase()])
          .first();
        if (existingModel) throw new AppError('A model with this name already exists', 400, 'NAME_TAKEN');

        const clock = await trx('world_clock').first();

        const computedSegment = qualityTarget === 'budget' ? 'Economy'
          : qualityTarget === 'premium' ? 'Premium'
          : 'Mid-Range';
        const finalSegment = reqSegment || computedSegment;

        // Use player-supplied sale price if valid, otherwise suggest 1.5x cost
        const finalSalePrice = salePrice && Number(salePrice) > 0
          ? Number(salePrice)
          : scores.manufacturingCostPerUnit * 1.5;

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
          manufacturing_cost_per_unit: scores.manufacturingCostPerUnit,
          reliability_score: scores.reliabilityScore,
          performance_score: scores.performanceScore,
          fuel_efficiency_score: scores.fuelEfficiencyScore,
          appeal_score: scores.appealScore,
          cargo_score: scores.cargoScore,
          target_segment: finalSegment,
          sale_price: finalSalePrice,
          status: 'active',
          development_status: 'in_development', // new models begin in development
          created_at_world_orbit: clock?.current_orbit || 1,
          created_at_world_arc: clock?.current_arc || 1,
          created_at_world_mark: clock?.current_mark || 1,
          development_started_at_orbit: clock?.current_orbit || 1,
          development_started_at_arc: clock?.current_arc || 1,
          development_completes_at_orbit: clock?.current_orbit || 1,
          development_completes_at_arc: (clock?.current_arc || 1) + 1,
        }).returning('*');

        return model;
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

        const [updated] = await trx('manufacturing_vehicle_models')
          .where({ id: modelId })
          .update({ development_status: 'launched', updated_at: trx.fn.now() })
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

        // Validate model belongs to company and is launched
        if (modelId) {
          const model = await trx('manufacturing_vehicle_models').where({ id: modelId, company_id: companyId }).first();
          if (!model) throw new AppError('Vehicle model not found', 404, 'NOT_FOUND');
          if (model.development_status !== 'launched') {
            throw new AppError('This vehicle model has not been launched yet. Launch it from the R&D tab before assigning to production.', 400, 'NOT_LAUNCHED');
          }
        }

        // Get factory capacity
        const factory = await trx('manufacturing_factories').where({ id: line.factory_id }).first();
        if (targetUnitsPerArc && Number(targetUnitsPerArc) > factory.capacity_per_arc) {
          throw new AppError(`Target cannot exceed factory capacity (${factory.capacity_per_arc} units/Arc)`, 400, 'EXCEEDS_CAPACITY');
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
      const { role } = req.body;

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      const validRole = STAFF_ROLES.find(r => r.id === role);
      if (!validRole) return next(new AppError('Invalid staff role', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const existing = await trx('company_staff').where({ company_id: companyId, role }).first();
        if (existing) {
          await trx('company_staff').where({ id: existing.id }).increment('quantity', 1).update({ updated_at: trx.fn.now() });
        } else {
          await trx('company_staff').insert({ company_id: companyId, role, quantity: 1 });
        }
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
      const { role } = req.body;

      if (!userId || !companyId || !role) return next(new AppError('Invalid request', 400, 'BAD_REQUEST'));

      await db.transaction(async (trx) => {
        await verifyManufacturingCompany(trx, userId, companyId);

        const existing = await trx('company_staff').where({ company_id: companyId, role }).first();
        if (!existing || existing.quantity <= 0) {
          throw new AppError('No staff in this role to dismiss', 400, 'BAD_REQUEST');
        }
        await trx('company_staff').where({ id: existing.id }).decrement('quantity', 1).update({ updated_at: trx.fn.now() });
      });

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
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

        // Load production lines with assigned models
        const productionLines = await trx('manufacturing_production_lines')
          .join('manufacturing_vehicle_models', 'manufacturing_production_lines.assigned_vehicle_model_id', 'manufacturing_vehicle_models.id')
          .where('manufacturing_production_lines.company_id', companyId)
          .where('manufacturing_production_lines.status', 'active')
          .whereNotNull('manufacturing_production_lines.assigned_vehicle_model_id')
          .where('manufacturing_production_lines.target_units_per_arc', '>', 0)
          .select(
            'manufacturing_production_lines.*',
            'manufacturing_vehicle_models.name as model_name',
            'manufacturing_vehicle_models.vehicle_class',
            'manufacturing_vehicle_models.manufacturing_cost_per_unit',
            'manufacturing_vehicle_models.appeal_score',
            'manufacturing_vehicle_models.reliability_score',
            'manufacturing_vehicle_models.sale_price',
            'manufacturing_vehicle_models.id as model_id_ref'
          );

        // Load staff
        const staff = await trx('company_staff').where({ company_id: companyId });

        // ─── 0. Vehicle Development Updates ──────────────────────────────────
        const developingModels = await trx('manufacturing_vehicle_models')
          .where({ company_id: companyId, status: 'active', development_status: 'in_development' });

        for (const model of developingModels) {
          const completesOrbit = model.development_completes_at_orbit || 1;
          const completesArc = model.development_completes_at_arc || 1;
          
          if (currentOrbit > completesOrbit || (currentOrbit === completesOrbit && currentArc >= completesArc)) {
            await trx('manufacturing_vehicle_models')
              .where({ id: model.id })
              .update({ development_status: 'ready_to_launch', updated_at: trx.fn.now() });

            await trx('company_records').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              record_type: 'business',
              summary: `Vehicle development completed: ${model.name}.`,
              created_at_world_orbit: currentOrbit,
              created_at_world_arc: currentArc,
              created_at_world_mark: currentMark
            });
          }
        }

        // ─── 1. Production Phase ─────────────────────────────────────────────
        let totalUnitsProduced = 0;
        let totalProductionCosts = 0;

        const workerCount = staff.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
        const engineerCount = staff.find((s: any) => s.role === 'engineer')?.quantity || 0;

        for (const factory of factories) {
          const factoryType = await trx('manufacturing_factory_types').where({ id: factory.factory_type_id }).first();
          const requiredWorkers = factoryType.worker_requirement;

          // Efficiency based on staffing level
          const staffingRatio = Math.min(1.0, workerCount / Math.max(1, requiredWorkers));
          const engineerBonus = Math.min(0.15, engineerCount * 0.03); // +3% per engineer, max 15%
          const conditionFactor = Number(factory.condition) / 100;
          const effectiveEfficiency = staffingRatio * (1 + engineerBonus) * conditionFactor;

          for (const line of productionLines) {
            if (String(line.factory_id) !== String(factory.id)) continue;

            const maxCapacity = Math.floor(factory.capacity_per_arc * effectiveEfficiency);
            const targetUnits = Number(line.target_units_per_arc);
            const unitsProduced = Math.min(targetUnits, maxCapacity);

            if (unitsProduced <= 0) continue;

            const costPerUnit = Number(line.manufacturing_cost_per_unit);
            const productionCost = Math.round(unitsProduced * costPerUnit);

            // Deduct production cost immediately
            runningCash -= productionCost;
            totalProductionCosts += productionCost;
            totalUnitsProduced += unitsProduced;

            // Add to inventory
            const existingInventory = await trx('manufacturing_inventory')
              .where({ company_id: companyId, vehicle_model_id: line.model_id_ref })
              .first();

            const inventoryValue = unitsProduced * costPerUnit;
            const storageCostPerArc = Math.round(unitsProduced * 150); // ₯150 per unit per arc

            if (existingInventory) {
              await trx('manufacturing_inventory').where({ id: existingInventory.id }).update({
                units_in_stock: existingInventory.units_in_stock + unitsProduced,
                inventory_value: Number(existingInventory.inventory_value) + inventoryValue,
                storage_cost_per_arc: Number(existingInventory.storage_cost_per_arc) + storageCostPerArc,
                updated_at: trx.fn.now(),
              });
            } else {
              await trx('manufacturing_inventory').insert({
                world_instance_id: company.world_instance_id,
                company_id: companyId,
                vehicle_model_id: line.model_id_ref,
                units_in_stock: unitsProduced,
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

        // ─── 2. Sales Phase ──────────────────────────────────────────────────
        let totalGrossRevenue = 0;
        let totalUnitsSold = 0;

        // Get home state market for now
        const homeMarket = await trx('manufacturing_region_markets')
          .where({ state_id: company.headquarters_state_id, status: 'active' })
          .first();

        if (homeMarket && productionLines.length > 0) {
          for (const line of productionLines) {
            const inventoryRecord = await trx('manufacturing_inventory')
              .where({ company_id: companyId, vehicle_model_id: line.model_id_ref })
              .first();

            if (!inventoryRecord || inventoryRecord.units_in_stock <= 0) continue;

            const demand = calculateMarketDemand(homeMarket, {
              vehicle_class: line.vehicle_class,
              appeal_score: line.appeal_score,
              sale_price: line.sale_price,
            });

            const unitsSold = Math.min(inventoryRecord.units_in_stock, demand);
            if (unitsSold <= 0) continue;

            const revenue = Math.round(unitsSold * Number(line.sale_price));
            totalGrossRevenue += revenue;
            totalUnitsSold += unitsSold;
            runningCash += revenue;

            const costPerUnit = Number(line.manufacturing_cost_per_unit);
            const remainingStock = inventoryRecord.units_in_stock - unitsSold;
            const remainingValue = remainingStock * costPerUnit;
            const remainingStorage = remainingStock > 0 ? Math.round(remainingStock * 150) : 0;

            await trx('manufacturing_inventory').where({ id: inventoryRecord.id }).update({
              units_in_stock: remainingStock,
              inventory_value: remainingValue,
              storage_cost_per_arc: remainingStorage,
              updated_at: trx.fn.now(),
            });

            const marketShare = Math.min(1, unitsSold / Math.max(1, demand));
            await trx('manufacturing_sales_results').insert({
              world_instance_id: company.world_instance_id,
              company_id: companyId,
              vehicle_model_id: line.model_id_ref,
              region_market_id: homeMarket.id,
              world_orbit: currentOrbit,
              world_arc: currentArc,
              units_sold: unitsSold,
              sale_price: line.sale_price,
              revenue: revenue,
              market_share_estimate: marketShare,
            });
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
        runningCash -= totalStaffWages;

        // Factory lease costs
        let totalLeaseCosts = 0;
        for (const factory of factories) {
          totalLeaseCosts += Number(factory.lease_cost_per_arc);
        }
        runningCash -= totalLeaseCosts;

        // Factory maintenance costs
        let totalMaintenanceCosts = 0;
        for (const factory of factories) {
          const maintCost = Math.round(Number(factory.maintenance_cost_per_arc) * (Number(factory.condition) / 100));
          totalMaintenanceCosts += maintCost;
        }
        runningCash -= totalMaintenanceCosts;

        // Inventory storage costs
        const allInventory = await trx('manufacturing_inventory').where({ company_id: companyId });
        let totalStorageCosts = 0;
        for (const inv of allInventory) {
          if (inv.units_in_stock > 0) {
            totalStorageCosts += Number(inv.storage_cost_per_arc);
          }
        }
        runningCash -= totalStorageCosts;

        const netProfit = totalGrossRevenue - totalProductionCosts - totalStaffWages - totalLeaseCosts - totalMaintenanceCosts - totalStorageCosts;

        // ─── 4. Finance Update ───────────────────────────────────────────────
        await trx('company_finances').where({ company_id: companyId }).update({
          available_cash: runningCash,
          last_arc_profit: netProfit,
          updated_at: trx.fn.now(),
        });

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
        const summary = `Arc ${currentOrbit}.${currentArc}: Produced ${totalUnitsProduced} units, sold ${totalUnitsSold}. Revenue ₯${totalGrossRevenue.toLocaleString()}. Net ${netProfit >= 0 ? '+' : ''}₯${netProfit.toLocaleString()}.`;

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
          production_costs: totalProductionCosts,
          staff_wages: totalStaffWages,
          factory_lease_costs: totalLeaseCosts,
          factory_maintenance_costs: totalMaintenanceCosts,
          inventory_storage_costs: totalStorageCosts,
          net_profit: netProfit,
          ending_cash: runningCash,
          summary,
        }).returning('*');

        return { report, netProfit, endingCash: runningCash };
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
