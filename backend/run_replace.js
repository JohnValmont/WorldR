const fs = require('fs');

const path = 'D:\\WorldR\\backend\\src\\api\\controllers\\manufacturing.controller.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix imports
content = content.replace(
  /import \{[^}]*deriveProductionModifiers[^}]*\} from '\.\.\/constants\/engineeringEngine';/g,
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
);

// We need to apply the production modifiers change
const prodOld =             // ── Phase 3B: Engineering production modifiers ────────────────────
            const engProdMods = deriveProductionModifiers(line);

            let inspectorReduction = Math.min(inspectorCount * 0.005, baseDefectRate - 0.005);

            // Apply Statistical Process Control Standard
            if (hasSPC && inspectorCount > 0) {
              inspectorReduction += 0.005; // -0.5 percentage points
            }

            // Apply engineering manufacturing friendliness bonus to defect rate
            const effectiveDefectRate = Math.max(
              0.005,
              baseDefectRate - inspectorReduction - engProdMods.defectRateReduction
            );
            arcInspectorDefectReduction = Math.max(arcInspectorDefectReduction, inspectorReduction);

            const defectiveUnits = Math.floor(unitsProduced * effectiveDefectRate);
            const sellableUnits  = unitsProduced - defectiveUnits;
            totalDefectiveUnits += defectiveUnits;

            // Production cost: apply assembly complexity multiplier to labour portion
            const costPerUnit    = Number(line.manufacturing_cost_per_unit);
            const rawAssemblyCost = Math.max(0, costPerUnit - BOM_COST);
            // Assembly cost multiplied by engineering assembly complexity
            const assemblyCost   = Math.round(rawAssemblyCost * engProdMods.assemblyCostMultiplier);

            const productionCost = Math.round(unitsProduced * assemblyCost);;

const prodNew =             // ── Phase 3B: Engineering production modifiers ────────────────────
            const engProdMods = deriveProductionModifiers(line);

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
            const productionCost = Math.round((unitsProduced * assemblyCost + unitsProduced * BOM_COST) * engProdMods.productionCostModifier - unitsProduced * BOM_COST);;

content = content.replace(prodOld, prodNew);

fs.writeFileSync(path, content);
console.log('Node script executed successfully');
