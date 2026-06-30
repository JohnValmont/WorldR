const fs = require('fs');

let newCode = `
  // POST /admin/manufacturing/process-company/:companyId
  public static async processManufacturingArc(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      if (!companyId) return next(new AppError('Missing or invalid fields: companyId', 400, 'BAD_REQUEST'));

      const result = await db.transaction(async (trx) => {
        const playerCompany = await trx('companies').where({ id: companyId }).first();
        if (!playerCompany) throw new AppError('Company not found', 404, 'NOT_FOUND');
        if (playerCompany.industry_id !== 'manufacturing') throw new AppError('Not a manufacturing company', 400, 'WRONG_INDUSTRY');

        const clock = await trx('world_clock').first();
        const currentOrbit = clock?.current_orbit || 1;
        const currentArc = clock?.current_arc || 1;

        // 1. RESOLVE PARTICIPANTS
        const allCompanies = await trx('companies')
          .where({ country_id: playerCompany.country_id, industry_id: 'manufacturing' })
          .where(function() {
             this.where({ id: companyId }).orWhere({ is_npc: true });
          });

        const participants: any[] = [];
        for (const comp of allCompanies) {
           const existingReport = await trx('manufacturing_arc_reports')
             .where({ company_id: comp.id, world_orbit: currentOrbit, world_arc: currentArc })
             .first();
           if (!existingReport) {
             participants.push(comp);
           }
        }
        
        if (participants.length === 0) {
           throw new AppError(\`Arc \${currentOrbit}.\${currentArc} already processed for this region\`, 400, 'ALREADY_PROCESSED');
        }

        // 2. DECIDE (NPCs only)
        for (const company of participants) {
           if (company.is_npc) {
              await runNpcBrainForCompany(trx, company.id, currentArc);
           }
        }

        // 3. PRODUCE (per participant)
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
             allMarketAllocations.push(...marketAllocations);
        }

        const brandMap = new Map<string, any>();
        for (const company of participants) {
           const brandData = await trx('manufacturing_brand_awareness').where({ company_id: company.id });
           for (const b of brandData) {
              const key = \`\${company.id}_\${b.region_market_id}\`;
              brandMap.set(key, b);
           }
        }

        const MARKETING_MULT: Record<string, number> = { none: 1.0, local: 1.15, regional: 1.30, national: 1.50 };
        // We need to build a sales manager bonus map per company
        const companySalesManagerBonus = new Map<string, number>();
        for (const pState of participantStates) {
           const salesManagerCount = pState.staff.find((s: any) => s.role === 'sales-manager')?.quantity || 0;
           const usefulSalesManagers = Math.min(salesManagerCount, pState.activeMarketCount);
           companySalesManagerBonus.set(pState.company.id, Math.min(usefulSalesManagers * 0.04, 0.16));
        }

        // Run simulation ONCE
        const pooledSalesResults = ManufacturingController.simulateSalesDemand(
          allMarketAllocations,
          brandMap,
          MARKETING_MULT,
          0 // We will change simulateSalesDemand below to read from companySalesManagerBonus if needed, OR just pass 0 for now since the method only accepts a number. Wait, simulateSalesDemand accepts a single number for salesManagerBonus. Let's fix that!
        );

        // Actually we must fix simulateSalesDemand to take the map, OR we just compute the finalAssignedDemand manually here, BUT simulateSalesDemand already does that.
        // I will pass companySalesManagerBonus to it! Wait, I can't easily modify simulateSalesDemand signature if it's used elsewhere. But processManufacturingArc is the only place it's used!

        // 5. SETTLE (per participant)
        for (const pState of participantStates) {
           const compResults = pooledSalesResults.filter((r: any) => r.alloc.company_id === pState.company.id);
           await ManufacturingController.settleForCompany(trx, pState, compResults, clock, brandMap);
        }

        return { message: 'Arc processed successfully for region', processedCompanies: participants.length };
      });

      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      next(error);
    }
  } // End of processManufacturingArc
`;

fs.writeFileSync('temp_process.ts', newCode);
