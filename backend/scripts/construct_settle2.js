const fs = require('fs');

let newCode = `
  private static async settleForCompany(trx: any, pState: ParticipantState, salesResults: any[], clock: any, brandMap: Map<string, any>): Promise<void> {
    const currentOrbit = clock?.current_orbit || 1;
    const currentArc = clock?.current_arc || 1;
    const currentMark = clock?.current_mark || 1;
    const companyId = pState.company.id;
    const company = pState.company;

    const countryAutoConfig = await trx('manufacturing_country_auto_config').where({ country_id: company.country_id }).first() ?? {};
    const storageCostPerUnit = Number(countryAutoConfig.storage_cost_per_unit_per_arc ?? 150);
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

    // Deduct marketing ONCE per market per company based on highest tier
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
       // We can distribute this cost among the model tracking if needed, or just track at company level.
       // The original tracked it at model level. For simplicity, we just divide the cost among models in that market.
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
      const unitsSold = md.unitsSold;
      const mainReasonCode = md.mainReasonCode;
      const marketPurchaseCapacity = md.marketPurchaseCapacity;
      const totalHouseholds = md.totalHouseholds;

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

        const remainingAllocated = Number(alloc.units_allocated) - unitsSold;
        await trx('manufacturing_market_allocations').where({ id: alloc.id }).update({ units_allocated: remainingAllocated, updated_at: trx.fn.now() });

        const invRecord = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: alloc.vehicle_model_id }).first();
        if (invRecord) {
          const newStock = Math.max(0, Number(invRecord.units_in_stock) - unitsSold);
          const costPerUnit = Number(alloc.manufacturing_cost_per_unit);
          await trx('manufacturing_inventory').where({ id: invRecord.id }).update({
            units_in_stock: newStock, inventory_value: Math.max(0, newStock * costPerUnit), storage_cost_per_arc: newStock * 150, updated_at: trx.fn.now()
          });
        }
      }

      const marketShare = Math.min(1, unitsSold / Math.max(1, md.rawBuyerInterest));
      await trx('manufacturing_sales_results').insert({
        world_instance_id: company.world_instance_id, company_id: companyId, vehicle_model_id: alloc.vehicle_model_id, region_market_id: alloc.region_market_id,
        world_orbit: currentOrbit, world_arc: currentArc, units_sold: unitsSold, sale_price: alloc.sale_price, revenue: unitsSold * Number(alloc.sale_price),
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

    // Warranty Reserve Cost
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

    const netProfit = totalGrossRevenue - pState.totalProductionCosts - pState.totalStaffWages - pState.totalLeaseCosts - pState.totalMaintenanceCosts - pState.totalStorageCosts - totalMarketingCosts - totalWarrantyReserveCost;

    for (const [mId, mt] of pState.modelTracking) {
      const mInv = await trx('manufacturing_inventory').where({ company_id: companyId, vehicle_model_id: mId }).first();
      const endingInventory = mInv ? Number(mInv.units_in_stock) : 0;
      const storageCost = endingInventory * storageCostPerUnit;
      const directContribution = Math.round(mt.salesRevenue - mt.productionCost - mt.marketingCost - storageCost);
      const mModel = await trx('manufacturing_vehicle_models').where({ id: mId }).first();
      if (!mModel) continue;
      await trx.raw(\`
        INSERT INTO manufacturing_model_snapshots
          (world_instance_id, company_id, model_id, world_orbit, world_arc, units_produced, defective_units, units_sold, ending_inventory, sales_revenue, production_cost, defect_loss, marketing_cost, storage_cost, direct_contribution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (company_id, model_id, world_orbit, world_arc) DO NOTHING
      \`, [
        company.world_instance_id, companyId, mId, currentOrbit, currentArc, mt.unitsProduced, mt.defectiveUnits, mt.unitsSold, endingInventory, mt.salesRevenue, mt.productionCost, mt.defectLoss, mt.marketingCost, storageCost, directContribution,
      ]);
    }

    await trx('company_finances').where({ company_id: companyId }).update({ available_cash: pState.runningCash, last_arc_profit: netProfit, updated_at: trx.fn.now() });

    if (totalUnitsSold > 0) {
      await trx('companies').where({ id: companyId }).update({ reputation: trx.raw('LEAST(100, reputation + 1)'), updated_at: trx.fn.now() });
    }

    // Phase 2 + 3B Local Brand Awareness and Trust
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

      const existingArcResult = await trx('manufacturing_market_brand_arc_results').where({ company_id: companyId, region_market_id: marketId, world_arc: currentArc }).first();
      if (existingArcResult) continue;

      const currBrand = await trx('manufacturing_brand_awareness').where({ company_id: companyId, region_market_id: marketId }).first();
      let oldAwareness = 0; let oldTrust = 0; let isNewRow = true;
      if (currBrand) { oldAwareness = Number(currBrand.awareness); oldTrust = Number(currBrand.reputation); isNewRow = false; }

      const deliveryAwarenessGain = Math.min(1.0, deliveryExposure * 20);
      const boosted = currBrand ? (brandMap.get(marketId)?.boostedAwareness ?? oldAwareness) : oldAwareness;
      const newAwareness = Math.min(100, Math.max(0, boosted + deliveryAwarenessGain));
      const awarenessDelta = newAwareness - oldAwareness;
      let primaryAwarenessReason = deliveryAwarenessGain > 0.1 ? 'Market Presence' : 'None';

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
      
      const newTrust = Math.min(100, Math.max(0, oldTrust + trustDelta));
      if (isNewRow) {
        await trx('manufacturing_brand_awareness').insert({ world_instance_id: company.world_instance_id, company_id: companyId, region_market_id: marketId, awareness: newAwareness, reputation: newTrust });
      } else {
        await trx('manufacturing_brand_awareness').where({ id: currBrand.id }).update({ awareness: newAwareness, reputation: newTrust, updated_at: trx.fn.now() });
      }

      await trx('manufacturing_market_brand_arc_results').insert({
        world_instance_id: company.world_instance_id, company_id: companyId, region_market_id: marketId, world_orbit: currentOrbit, world_arc: currentArc,
        starting_awareness: oldAwareness, ending_awareness: newAwareness, awareness_delta: awarenessDelta, marketing_spend: mktMarketingSpend,
        highest_marketing_tier: mktTier, delivery_exposure: deliveryExposure, awareness_primary_reason: primaryAwarenessReason,
        starting_trust: oldTrust, ending_trust: newTrust, trust_delta: trustDelta, avg_reliability_delivered: wReliability,
        avg_defect_rate_delivered: wDefectRate, trust_primary_reason: primaryTrustReason
      });

      localBrandReportLines.push(\`Market \${marketId.split('_').pop()}: Awareness \${newAwareness.toFixed(1)}% (\${awarenessDelta >= 0 ? '+' : ''}\${awarenessDelta.toFixed(1)}), Trust \${newTrust.toFixed(1)}% (\${trustDelta >= 0 ? '+' : ''}\${trustDelta.toFixed(1)})\`);
    }

    if (localBrandReportLines.length > 0) {
      await trx('company_records').insert({ world_instance_id: company.world_instance_id, company_id: companyId, record_type: 'business', summary: \`Local Brand Updates:\\n\${localBrandReportLines.join('\\n')}\`, created_at_world_orbit: currentOrbit, created_at_world_arc: currentArc, created_at_world_mark: currentMark });
    }

    // Phase 3B Step 6: Engineering Reputation Progression
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
        await trx('manufacturing_engineering_reputation').insert({ company_id: companyId, reliability_rep: newRelRep, mfg_efficiency_rep: newMfgRep, engineering_culture_score: 0 });
      }
    }

    // Knowledge & Reputation progression
    const staffCountTotal = pState.staff.reduce((sum: number, s: any) => sum + s.quantity, 0);
    const scaleFactor = Math.min(1.0, staffCountTotal / 1000);
    if (pState.approvedResearchNames.length > 0) {
       for (const rName of pState.approvedResearchNames) {
          await ManufacturingController.addCompanyKnowledge(trx, companyId, 'engineering_processes', 500);
       }
    }
    if (totalUnitsProduced > 0) {
       const xpGain = Math.round(50 + (totalUnitsProduced * 0.05 * scaleFactor));
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'production_efficiency', xpGain);
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'quality_control', xpGain);
    }
    if (totalUnitsSold > 0) {
       const xpGain = Math.round(50 + (totalUnitsSold * 0.05 * scaleFactor));
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'market_analysis', xpGain);
       await ManufacturingController.addCompanyKnowledge(trx, companyId, 'supply_chain', xpGain);
    }

    // Arc Report Generation
    const costSummary = \`Wages: \${pState.totalStaffWages.toLocaleString()} | Lease: \${pState.totalLeaseCosts.toLocaleString()} | Maintenance: \${pState.totalMaintenanceCosts.toLocaleString()} | Storage: \${pState.totalStorageCosts.toLocaleString()} | Marketing: \${totalMarketingCosts.toLocaleString()} | Warranty Reserve: \${totalWarrantyReserveCost.toLocaleString()}\`;
    
    let modelLines = '';
    for (const [mId, mt] of pState.modelTracking) {
      const mModel = await trx('manufacturing_vehicle_models').select('name').where({ id: mId }).first();
      modelLines += \`\\n- \${mModel?.name || mId}: \${mt.unitsProduced.toLocaleString()} produced (\${mt.defectiveUnits.toLocaleString()} defective, defect loss: \${mt.defectLoss.toLocaleString()}), \${mt.unitsSold.toLocaleString()} sold. Revenue: \${mt.salesRevenue.toLocaleString()}, Cost: \${mt.productionCost.toLocaleString()}\`;
      if (mt.engineeringNotes && mt.engineeringNotes.length > 0) {
         modelLines += \`\\n  (Engineering notes: \${mt.engineeringNotes.join(' ')})\`;
      }
    }

    const reportData = {
      world_instance_id: company.world_instance_id, company_id: companyId, world_orbit: currentOrbit, world_arc: currentArc,
      units_planned: pState.totalPlannedUnits, units_produced: pState.totalUnitsProduced, defective_units: pState.totalDefectiveUnits,
      units_sold: totalUnitsSold, gross_revenue: totalGrossRevenue, net_profit: netProfit,
      report_data: JSON.stringify({
        productionCosts: pState.totalProductionCosts,
        staffWages: pState.totalStaffWages, leaseCosts: pState.totalLeaseCosts, maintenanceCosts: pState.totalMaintenanceCosts,
        storageCosts: pState.totalStorageCosts, marketingCosts: totalMarketingCosts,
        summary: \`Production: \${pState.totalUnitsProduced.toLocaleString()} units (\${pState.totalDefectiveUnits.toLocaleString()} defects).\\nSales: \${totalUnitsSold.toLocaleString()} units.\\n\\nFinancials:\\nGross Revenue: \${totalGrossRevenue.toLocaleString()}\\nNet Profit: \${netProfit.toLocaleString()}\\n\\nOverheads:\\n\${costSummary}\\n\\nVehicle Breakdown:\${modelLines}\`
      })
    };
    await trx('manufacturing_arc_reports').insert(reportData);

    if (company.is_npc) {
        // Also update the NPC state for brain memory
        const statesToUpdate = [];
        for (const md of salesResults) {
            const mId = md.alloc.vehicle_model_id;
            const ms = Math.min(1, md.unitsSold / Math.max(1, md.rawBuyerInterest));
            statesToUpdate.push({ mId, units: md.unitsSold, ms, rc: md.mainReasonCode });
        }
        for (const s of statesToUpdate) {
            const zeroStreakUpdate = (s.rc === 'Zero Demand') ? 'zero_demand_streak + 1' : '0';
            await trx.raw(\`
               INSERT INTO manufacturing_npc_state (company_id, vehicle_model_id, last_market_share, last_units_sold, zero_demand_streak, updated_at)
               VALUES (?, ?, ?, ?, ?, NOW())
               ON CONFLICT (company_id, vehicle_model_id) DO UPDATE SET
               last_market_share = ?, last_units_sold = ?, zero_demand_streak = CASE WHEN ? = 'Zero Demand' THEN manufacturing_npc_state.zero_demand_streak + 1 ELSE 0 END, updated_at = NOW()
            \`, [companyId, s.mId, s.ms, s.units, 0, s.ms, s.units, s.rc]);
        }
    }
  }
`;

fs.writeFileSync('temp_helpers3.ts', newCode);
