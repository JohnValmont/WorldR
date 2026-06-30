  public static async processManufacturingArc(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      if (!companyId) return next(new AppError('Missing or invalid fields: companyId', 400, 'BAD_REQUEST'));

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

        // Pre-sim marketing boost
        const preSimMktSpend = new Map<string, number>();
        for (const alloc of marketAllocations) {
          const mktTier = alloc.marketing_tier || 'none';
          const cost = MARKETING_COSTS[mktTier] ?? 0;
          const current = preSimMktSpend.get(alloc.region_market_id) || 0;
          preSimMktSpend.set(alloc.region_market_id, current + cost);
        }

        for (const [marketId, spend] of preSimMktSpend.entries()) {
          const localBrand = brandMap.get(marketId);
          if (localBrand) {
            const oldAwareness = Number(localBrand.awareness) || 0;
            const boosted = Math.min(100, Math.max(0, oldAwareness * MARKETING.RETENTION + awarenessGain(spend)));
            localBrand.awareness = boosted; // So sim reads the new boosted value
            localBrand.boostedAwareness = boosted; // To use in post-sim persist
          }
        }

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
          const deliveryAwarenessGain = Math.min(1.0, deliveryExposure * 20);
          
          const boosted = currBrand ? (brandMap.get(marketId)?.boostedAwareness ?? oldAwareness) : oldAwareness;
          const newAwareness = Math.min(100, Math.max(0, boosted + deliveryAwarenessGain));
          const awarenessDelta = newAwareness - oldAwareness;
          
          let primaryAwarenessReason = 'None';
          if (deliveryAwarenessGain > 0.1) {
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
        let summary = `${formatGameDate(currentArc)}: Planned ${totalPlannedUnits}, produced ${totalUnitsProduced + totalDefectiveUnits} (${totalDefectiveUnits} defective). Sold ${totalUnitsSold}. Revenue ${arcSym}${totalGrossRevenue.toLocaleString()}. Net ${netProfit >= 0 ? '+' : ''}${arcSym}${netProfit.toLocaleString()}.${workerNote}${defectNote}${approvedNote}${expansionCompletedNote}`;
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
