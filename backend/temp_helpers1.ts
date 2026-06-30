  export interface ParticipantState {
    company: any;
    runningCash: number;
    totalProductionCosts: number;
    totalDefectiveUnits: number;
    totalPlannedUnits: number;
    totalUnitsProduced: number;
    totalStaffWages: number;
    totalLeaseCosts: number;
    totalMaintenanceCosts: number;
    totalStorageCosts: number;
    totalWarrantyReserveCost: number;
    modelTracking: Map<string, any>;
    activeMarketCount: number;
    approvedResearchNames: string[];
    marketStatsMap: Map<string, any>;
    staff: any[];
  }

  private static async produceForCompany(trx: any, company: any, clock: any): Promise<ParticipantState> {
    const currentOrbit = clock?.current_orbit || 1;
    const currentArc = clock?.current_arc || 1;
    const currentMark = clock?.current_mark || 1;
    const companyId = company.id;

    const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
    let runningCash = Number(finances.available_cash);

    const factories = await trx('manufacturing_factories').where({ company_id: companyId, status: 'active' });

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

    const staff = await trx('company_staff').where({ company_id: companyId });

    // ─── 0. Vehicle Development Updates (Phase 3B per-stage) ─────────────
    const developingModels = await trx('manufacturing_vehicle_models')
      .where({ company_id: companyId, status: 'active', development_status: 'in_development' });

    const knowledgeRows = await trx('manufacturing_company_knowledge').where({ company_id: companyId });
    const knowledgeXpMap: Record<string, number> = {};
    for (const k of knowledgeRows) knowledgeXpMap[k.domain] = Number(k.xp_points);

    const engRepForCulture = await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).first();
    const cultureScore = Number(engRepForCulture?.engineering_culture_score ?? 0);

    for (const model of developingModels) {
      const devStage = model.dev_stage as string | null;

      // Stage: engineering → prototype
      const engEndsOrbit = model.stage_engineering_completes_orbit || 1;
      const engEndsArc   = model.stage_engineering_completes_arc   || 1;
      if (devStage === 'engineering' && (currentOrbit > engEndsOrbit || (currentOrbit === engEndsOrbit && currentArc >= engEndsArc))) {
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
          world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${model.name} has entered the Prototype stage.${bonusSummary ? ` Knowledge bonuses applied: ${bonusSummary}.` : ''}`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark
        });
        continue;
      }

      // Stage: prototype → testing
      const protoEndsOrbit = model.stage_prototype_completes_orbit || 1;
      const protoEndsArc   = model.stage_prototype_completes_arc   || 1;
      if (devStage === 'prototype' && (currentOrbit > protoEndsOrbit || (currentOrbit === protoEndsOrbit && currentArc >= protoEndsArc))) {
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
            await trx('company_ledger').insert({ company_id: companyId, game_orbit: currentOrbit, game_arc: currentArc, game_mark: currentMark, entry_type: 'expense', description: `Prototype validation failure costs: ${model.name}`, amount: -extraCostCharged, balance_after: runningCash });
          }
          extraArcMessage = ` Development extended by ${validation.extraArcs} arc(s).`;
        }

        const newTestingArc = (model.stage_testing_completes_arc || currentArc + 1) + validation.extraArcs;
        const newFinalArc = (model.development_completes_at_arc || currentArc + 1) + validation.extraArcs;

        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'testing', stage_testing_completes_arc: newTestingArc, development_completes_at_arc: newFinalArc, prototype_validation_result: JSON.stringify(validation), updated_at: trx.fn.now() });
        await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).update({ engineering_culture_score: newCultureScore, last_updated: trx.fn.now() }).catch(() => {});

        const validationSummary = validation.passed ? `Prototype validation ${validation.resultClass} (confidence: ${validation.confidenceScore}%).` : `Prototype validation ${validation.resultClass}: ${validation.issues[0]}.${extraArcMessage} Extra cost: ${extraCostCharged.toLocaleString()}.`;
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${model.name} — ${validationSummary}`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
        continue;
      }

      // Stage: testing → ready_to_launch
      const testingEndsOrbit = model.stage_testing_completes_orbit || 1;
      const testingEndsArc   = model.stage_testing_completes_arc   || 1;
      if (devStage === 'testing' && (currentOrbit > testingEndsOrbit || (currentOrbit === testingEndsOrbit && currentArc >= testingEndsArc))) {
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ dev_stage: 'ready_to_launch', updated_at: trx.fn.now() });
      }

      // Final: ready_to_launch (this part generates permanent assessment at the end of testing)
      const completesOrbit = model.development_completes_at_orbit || 1;
      const completesArc   = model.development_completes_at_arc   || 1;
      if (currentOrbit > completesOrbit || (currentOrbit === completesOrbit && currentArc >= completesArc)) {
        const assessment = calculateEngineeringAssessment(model);
        const balanceRating = calculateBalanceRating(model);
        await trx('manufacturing_vehicle_models').where({ id: model.id }).update({ development_status: 'ready_to_launch', dev_stage: 'ready_to_launch', engineering_assessment: JSON.stringify(assessment), engineering_balance_rating: balanceRating, updated_at: trx.fn.now() });
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `Vehicle development completed: ${model.name}.`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
      }
    }

    // ─── 0.5 Engineering Programmes Updates ─────────────────────────────
    let approvedResearchNames: string[] = [];
    const activeProgramme = await trx('manufacturing_engineering_programmes').where({ company_id: companyId }).whereIn('status', ['engineering', 'validation']).first();

    const countryAutoConfig = await trx('manufacturing_country_auto_config').where({ country_id: company.country_id }).first() ?? {};
    const EXP_CAPACITY  = Number(countryAutoConfig.expanded_capacity_per_arc ?? 200);
    const EXP_MAX_LINES = Number(countryAutoConfig.expanded_max_lines ?? 2);
    const EXP_LEASE     = Number(countryAutoConfig.expanded_lease_cost_per_arc ?? 45000);
    const EXP_MAINT     = Number(countryAutoConfig.expanded_maintenance_per_arc ?? 15000);
    const EXP_WORKERS   = Number(countryAutoConfig.expanded_worker_capacity ?? 80);
    const storageCostPerUnit = Number(countryAutoConfig.storage_cost_per_unit_per_arc ?? 150);

    let expansionCompletedNote = '';
    const expandingFactory = factories.find((f: any) => f.expansion_status === 'construction_underway');
    if (expandingFactory) {
      const compOrbit = Number(expandingFactory.expansion_completion_orbit);
      const compArc   = Number(expandingFactory.expansion_completion_arc);
      const isComplete = currentOrbit > compOrbit || (currentOrbit === compOrbit && currentArc >= compArc);

      if (isComplete) {
        await trx('manufacturing_factories').where({ id: expandingFactory.id }).update({ expansion_status: 'expanded', capacity_per_arc: EXP_CAPACITY, lease_cost_per_arc: EXP_LEASE, maintenance_cost_per_arc: EXP_MAINT, worker_capacity: EXP_WORKERS, updated_at: trx.fn.now() });

        for (let lineNum = 2; lineNum <= EXP_MAX_LINES; lineNum++) {
          const alreadyExists = await trx('manufacturing_production_lines').where({ factory_id: expandingFactory.id, line_number: lineNum }).first();
          if (!alreadyExists) {
            await trx('manufacturing_production_lines').insert({ world_instance_id: company.world_instance_id, company_id: companyId, factory_id: expandingFactory.id, line_number: lineNum, quality_setting: 'Standard', target_units_per_arc: 0, status: 'idle' });
          }
        }

        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `Workshop expansion completed. ${EXP_MAX_LINES} production lines now available (capacity: ${EXP_CAPACITY} units/Arc).`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
        expansionCompletedNote = ` Factory Expansion Completed: Expanded Workshop — ${EXP_MAX_LINES} production lines, ${EXP_CAPACITY} units per Arc capacity.`;

        factories.forEach((f: any) => {
          if (f.id === expandingFactory.id) { f.capacity_per_arc = EXP_CAPACITY; f.lease_cost_per_arc = EXP_LEASE; f.maintenance_cost_per_arc = EXP_MAINT; f.worker_capacity = EXP_WORKERS; }
        });
      }
    }

    if (activeProgramme) {
      const isAtLeastValidation = currentOrbit > activeProgramme.validation_arc_orbit || (currentOrbit === activeProgramme.validation_arc_orbit && currentArc >= activeProgramme.validation_arc_orbit);
      const isAtLeastCompletion = currentOrbit > activeProgramme.completion_arc_orbit || (currentOrbit === activeProgramme.completion_arc_orbit && currentArc >= activeProgramme.completion_arc_orbit);
      const progName = ENGINEERING_PROGRAMMES_CATALOG[activeProgramme.programme_id]?.name || activeProgramme.programme_id;

      if (isAtLeastCompletion) {
        await trx('manufacturing_engineering_programmes').where({ id: activeProgramme.id }).update({ status: 'approved', updated_at: trx.fn.now() });
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${progName} was approved for company use.`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
        approvedResearchNames.push(progName);
      } else if (isAtLeastValidation && activeProgramme.status === 'engineering') {
        await trx('manufacturing_engineering_programmes').where({ id: activeProgramme.id }).update({ status: 'validation', updated_at: trx.fn.now() });
        await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `${progName} entered technical validation.`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
      }
    }

    const approvedStandards = await trx('manufacturing_engineering_programmes').where({ company_id: companyId, status: 'approved' });
    const hasAssemblyTimeStudy = approvedStandards.some((p: any) => p.programme_id === 'assembly-time');
    const hasSPC = approvedStandards.some((p: any) => p.programme_id === 'spc');

    let totalUnitsProduced = 0;
    let totalProductionCosts = 0;
    let totalDefectiveUnits = 0;
    let totalPlannedUnits = 0;

    const modelTracking = new Map<string, any>();
    const ensureModelTracking = (modelId: string, costPerUnit: number) => {
      if (!modelTracking.has(modelId)) modelTracking.set(modelId, { unitsProduced:0, defectiveUnits:0, productionCost:0, defectLoss:0, unitsSold:0, salesRevenue:0, marketingCost:0, costPerUnit });
      return modelTracking.get(modelId)!;
    };

    const workerCount      = staff.find((s: any) => s.role === 'factory-worker')?.quantity || 0;
    const supervisorCount  = staff.find((s: any) => s.role === 'production-supervisor')?.quantity || 0;
    const inspectorCount   = staff.find((s: any) => s.role === 'quality-inspector')?.quantity || 0;

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
    const BOM_COST = 3500 + 1800 + (400) + 2000 + 500 + 1200;

    for (const factory of factories) {
      const factoryType = await trx('manufacturing_factory_types').where({ id: factory.factory_type_id }).first();
      const factoryCapacityPerArc    = Number(factory.capacity_per_arc);
      const factoryWorkerCapacity    = Number(factoryType.worker_requirement);

      const factoryLines = productionLines.filter((l: any) => String(l.factory_id) === String(factory.id));

      for (const line of factoryLines) {
        const targetUnits = Number(line.target_units_per_arc);
        totalPlannedUnits += targetUnits;

        const engProdMods = deriveProductionModifiers(line as any);
        const requiredWorkers = targetUnits > 0 ? Math.ceil((targetUnits / factoryCapacityPerArc) * (factoryWorkerCapacity * engProdMods.assemblyHoursModifier)) : 0;

        let laborEfficiency: number;
        if (requiredWorkers === 0) laborEfficiency = 1.0;
        else if (workerCount === 0) laborEfficiency = 0.0;
        else laborEfficiency = Math.min(1.0, workerCount / requiredWorkers);

        const usefulSupervisors = Math.min(supervisorCount, activeLineCount);
        const supervisorBonus   = usefulSupervisors > 0 ? 0.05 : 0.0;
        const conditionFactor = Number(factory.condition) / 100;
        let finalEfficiency = Math.min(1.0, laborEfficiency * conditionFactor * (1 + supervisorBonus));
        if (hasAssemblyTimeStudy) finalEfficiency = Math.min(1.0, finalEfficiency * 1.05);

        let unitsProduced: number;
        if (workerCount === 0 && requiredWorkers > 0) unitsProduced = 0;
        else unitsProduced = Math.floor(targetUnits * finalEfficiency);

        let maxByComponents = Math.floor(compInventory.engine / BOM.engine);
        maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.transmission / BOM.transmission));
        maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.tyres / BOM.tyres));
        maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.steel / BOM.steel));
        maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.glass / BOM.glass));
        maxByComponents = Math.min(maxByComponents, Math.floor(compInventory.electronics / BOM.electronics));

        if (unitsProduced > maxByComponents) unitsProduced = maxByComponents;
        if (unitsProduced <= 0) continue;

        compInventory.engine -= unitsProduced * BOM.engine;
        compInventory.transmission -= unitsProduced * BOM.transmission;
        compInventory.tyres -= unitsProduced * BOM.tyres;
        compInventory.steel -= unitsProduced * BOM.steel;
        compInventory.glass -= unitsProduced * BOM.glass;
        compInventory.electronics -= unitsProduced * BOM.electronics;

        const qualityKey = line.quality_setting || 'Standard';
        const baseDefectRate = QUALITY_DEFECT_RATES[qualityKey as keyof typeof QUALITY_DEFECT_RATES] ?? 0.03;
        let inspectorReduction = Math.min(inspectorCount * 0.005, baseDefectRate - 0.005);
        if (hasSPC && inspectorCount > 0) inspectorReduction += 0.005;

        const effectiveDefectRate = Math.max(0.005, (baseDefectRate - inspectorReduction) * engProdMods.defectModifier);
        const defectiveUnits = Math.floor(unitsProduced * effectiveDefectRate);
        const sellableUnits  = unitsProduced - defectiveUnits;
        totalDefectiveUnits += defectiveUnits;

        const costPerUnit    = Number(line.manufacturing_cost_per_unit);
        const rawAssemblyCost = Math.max(0, costPerUnit - BOM_COST);
        const assemblyCost   = Math.round(rawAssemblyCost * engProdMods.labourCostModifier);
        const productionCost = Math.round((unitsProduced * assemblyCost + unitsProduced * BOM_COST) * engProdMods.productionCostModifier - unitsProduced * BOM_COST);
        const defectLoss     = Math.round(defectiveUnits * costPerUnit * engProdMods.productionCostModifier);

        runningCash          -= productionCost;
        totalProductionCosts += productionCost;
        totalUnitsProduced   += sellableUnits;

        const mt = ensureModelTracking(line.model_id_ref, costPerUnit);
        mt.unitsProduced   += sellableUnits;
        mt.defectiveUnits  += defectiveUnits;
        mt.productionCost  += productionCost;
        mt.defectLoss      += defectLoss;
        if (!mt.engineeringNotes) mt.engineeringNotes = engProdMods.engineeringProductionNotes;

        const existingInventory = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: line.model_id_ref }).first();
        const inventoryValue     = sellableUnits * costPerUnit;
        const storageCostPerArc  = Math.round(sellableUnits * 150);

        if (existingInventory) {
          await trx('manufacturing_inventory').where({ id: existingInventory.id }).update({ units_in_stock: existingInventory.units_in_stock + sellableUnits, inventory_value: Number(existingInventory.inventory_value) + inventoryValue, storage_cost_per_arc: Number(existingInventory.storage_cost_per_arc) + storageCostPerArc, updated_at: trx.fn.now() });
        } else {
          await trx('manufacturing_inventory').insert({ world_instance_id: company.world_instance_id, company_id: companyId, vehicle_model_id: line.model_id_ref, units_in_stock: sellableUnits, inventory_value: inventoryValue, storage_cost_per_arc: storageCostPerArc });
        }
      }

      await trx('manufacturing_factories').where({ id: factory.id }).update({ condition: Math.max(10, Number(factory.condition) - 2), updated_at: trx.fn.now() });
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
    const actualWagesPaid = Math.min(totalStaffWages, Math.max(0, runningCash));
    const wageShortfall = totalStaffWages - actualWagesPaid;
    runningCash -= actualWagesPaid;

    if (wageShortfall > 0) {
      const wageCurrency = await trx('currencies').where({ id: company.currency_id }).first();
      const wageSym = wageCurrency?.symbol ?? '';
      await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: `⚠ Wage shortfall: only ${wageSym}${actualWagesPaid.toLocaleString()} of ${wageSym}${totalStaffWages.toLocaleString()} wages paid this arc.`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
    }

    let totalLeaseCosts = 0;
    for (const factory of factories) totalLeaseCosts += Number(factory.lease_cost_per_arc);
    runningCash -= totalLeaseCosts;

    let totalMaintenanceCosts = 0;
    for (const factory of factories) {
      const baseMaintCost = Math.round(Number(factory.maintenance_cost_per_arc) * (Number(factory.condition) / 100));
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
      totalLeaseCosts,
      totalMaintenanceCosts,
      totalStorageCosts,
      totalWarrantyReserveCost: 0,
      modelTracking,
      activeMarketCount,
      approvedResearchNames,
      marketStatsMap,
      staff
    };
  }
