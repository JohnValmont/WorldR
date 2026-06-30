
import re

with open('src/api/controllers/manufacturing.controller.ts', 'r', encoding='utf8') as f:
    text = f.read()

# 1. addCompanyKnowledge
text = text.replace(
    '''INSERT INTO manufacturing_company_knowledge (company_id, domain, xp_points)
      VALUES (?, ?, ?)
      ON CONFLICT (company_id, domain) DO UPDATE SET xp_points = manufacturing_company_knowledge.xp_points + ?''',
    '''INSERT INTO manufacturing_company_knowledge (world_instance_id, company_id, domain, xp_points)
      SELECT world_instance_id, ?, ?, ? FROM companies WHERE id = ?
      ON CONFLICT (company_id, domain) DO UPDATE SET xp_points = manufacturing_company_knowledge.xp_points + ?'''
)
text = text.replace(
    '''[companyId, domain, amt, amt]''',
    '''[companyId, domain, amt, companyId, amt]'''
)

# 2. manufacturing_brand_awareness & manufacturing_market_brand_arc_results
text = text.replace(
    '''const newAwareness = Math.min(100, Math.max(0, boosted + deliveryAwarenessGain));
      const awarenessDelta = newAwareness - oldAwareness;''',
    '''const newAwareness = Math.round(Math.min(100, Math.max(0, boosted + deliveryAwarenessGain)));
      const awarenessDelta = newAwareness - oldAwareness;'''
)
text = text.replace(
    '''const newTrust = Math.min(100, Math.max(0, oldTrust + trustDelta));
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
      });''',
    '''const newTrust = Math.round(Math.min(100, Math.max(0, oldTrust + trustDelta)));
      if (isNewRow) {
        await trx('manufacturing_brand_awareness').insert({ company_id: companyId, region_market_id: marketId, awareness: newAwareness, reputation: newTrust });
      } else {
        await trx('manufacturing_brand_awareness').where({ id: currBrand.id }).update({ awareness: newAwareness, reputation: newTrust, updated_at: trx.fn.now() });
      }

      await trx('manufacturing_market_brand_arc_results').insert({
        company_id: companyId, region_market_id: marketId, world_arc: currentArc,
        awareness_before: oldAwareness, awareness_after: newAwareness, awareness_delta: Math.round(awarenessDelta), market_marketing_spend: mktMarketingSpend,
        effective_marketing_tier: mktTier, trust_before: oldTrust, trust_after: newTrust,
        trust_delta: Math.round(trustDelta), weighted_reliability: Math.round(wReliability), weighted_defect_rate: wDefectRate,
        primary_awareness_reason: primaryAwarenessReason, primary_trust_reason: primaryTrustReason, total_units_sold: totalMarketSold
      });'''
)

# 3. manufacturing_engineering_reputation
text = text.replace(
    '''await trx('manufacturing_engineering_reputation').insert({ company_id: companyId, reliability_rep: newRelRep, mfg_efficiency_rep: newMfgRep, engineering_culture_score: 0 });''',
    '''await trx('manufacturing_engineering_reputation').insert({ world_instance_id: company.world_instance_id, company_id: companyId, reliability_rep: newRelRep, mfg_efficiency_rep: newMfgRep, engineering_culture_score: 0 });'''
)

# 4. manufacturing_arc_reports
text = text.replace(
    '''const reportData = {
      world_instance_id: company.world_instance_id, company_id: companyId, world_orbit: currentOrbit, world_arc: currentArc,
      units_planned: pState.totalPlannedUnits, units_produced: pState.totalUnitsProduced, defective_units: pState.totalDefectiveUnits,
      units_sold: totalUnitsSold, gross_revenue: totalGrossRevenue, net_profit: netProfit,
      report_data: JSON.stringify({
        productionCosts: pState.totalProductionCosts,
        staffWages: pState.totalStaffWages, leaseCosts: pState.totalLeaseCosts, maintenanceCosts: pState.totalMaintenanceCosts,
        storageCosts: pState.totalStorageCosts, marketingCosts: totalMarketingCosts,
        summary: \Production: \ units (\ defects).\\nSales: \ units.\\n\\nFinancials:\\nGross Revenue: \\\nNet Profit: \\\n\\nOverheads:\\n\\\n\\nVehicle Breakdown:\\
      })
    };''',
    '''const reportData = {
      world_instance_id: company.world_instance_id, company_id: companyId, world_orbit: currentOrbit, world_arc: currentArc, world_mark: 1,
      planned_units: pState.totalPlannedUnits, units_produced: pState.totalUnitsProduced, defective_units: pState.totalDefectiveUnits,
      units_sold: totalUnitsSold, units_unsold: Math.max(0, pState.totalUnitsProduced - totalUnitsSold),
      gross_revenue: totalGrossRevenue, sales_revenue: totalGrossRevenue, net_profit: netProfit, ending_cash: pState.runningCash,
      production_costs: pState.totalProductionCosts, staff_wages: pState.totalStaffWages, factory_lease_costs: pState.totalLeaseCosts,
      factory_maintenance_costs: pState.totalMaintenanceCosts, inventory_storage_costs: pState.totalStorageCosts, marketing_costs: totalMarketingCosts,
      summary: \Production: \ units (\ defects).\\nSales: \ units.\\n\\nFinancials:\\nGross Revenue: \\\nNet Profit: \\\n\\nOverheads:\\n\\\n\\nVehicle Breakdown:\\
    };'''
)

# 5. manufacturing_npc_state ON CONFLICT
text = text.replace(
    '''ON CONFLICT (company_id, vehicle_model_id) DO UPDATE SET''',
    '''ON CONFLICT (company_id) DO UPDATE SET'''
)

# 6. missing components definition (the ReferenceError bug)
text = text.replace(
    '''let totalStorageCosts = 0;
    for (const [compId, compData] of Object.entries(compInventory)) {
      const dbComp = components.find(c => c.id === compId);''',
    '''const components = await trx('manufacturing_components');
    let totalStorageCosts = 0;
    for (const [compId, compData] of Object.entries(compInventory)) {
      const dbComp = components.find((c: any) => c.id === \comp_\\);'''
)

with open('src/api/controllers/manufacturing.controller.ts', 'w', encoding='utf8') as f:
    f.write(text)

print('Schema fixes applied!')

