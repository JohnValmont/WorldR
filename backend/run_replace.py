import re

path = r'D:\WorldR\backend\src\api\controllers\manufacturing.controller.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix imports
content = re.sub(
    r'import \{[^}]*deriveProductionModifiers[^}]*\} from \'../constants/engineeringEngine\';',
    '''import {
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
} from '../constants/engineeringEngine';''',
    content
)

# 1. Validation Transition
validation_old = '''            const validation = evaluatePrototypeValidation(model);

            if (validation.passed) {
              await trx('manufacturing_vehicle_models').where({ id: dev.vehicle_model_id }).update({
                dev_stage: 'ready_to_launch',
                updated_at: trx.fn.now(),
              });
              await LogCompanyActivity(companyId, 'Engineering', \Prototype validation successful for \.\);
            } else {
              // Add extra cost and delay
              const extraCost = Math.round(Number(dev.dev_cost) * validation.extraCostPct);
              await trx('manufacturing_in_development').where({ id: dev.id }).update({
                remaining_arcs: dev.remaining_arcs + validation.extraArcs,
                dev_cost: Number(dev.dev_cost) + extraCost,
                updated_at: trx.fn.now(),
              });

              runningCash -= extraCost;
              totalDevCost += extraCost;

              // Append issues to report
              const report = model.engineering_report ? (typeof model.engineering_report === 'string' ? JSON.parse(model.engineering_report) : model.engineering_report) : {};
              report.validationIssues = validation.issues;
              
              await trx('manufacturing_vehicle_models').where({ id: dev.vehicle_model_id }).update({
                engineering_report: JSON.stringify(report),
                updated_at: trx.fn.now(),
              });
              
              await LogCompanyActivity(companyId, 'Engineering', \Prototype validation failed for \. \ critical issues found. Extra cost: ₯\.\);
            }

            // Update engineering culture score
            const cultureDelta = calcEngineeringCultureDelta(validation);'''

validation_new = '''            const validation = evaluatePrototypeValidation(model);

            if (validation.passed) {
              // Phase 3B Step 5/6: Generate final permanent Assessment and Balance Rating
              const assessment = calculateEngineeringAssessment(model);
              const balanceRating = calculateBalanceRating(model);
              
              await trx('manufacturing_vehicle_models').where({ id: dev.vehicle_model_id }).update({
                dev_stage: 'ready_to_launch',
                engineering_assessment: JSON.stringify(assessment),
                engineering_balance_rating: balanceRating,
                prototype_validation_result: JSON.stringify(validation),
                updated_at: trx.fn.now(),
              });
              await LogCompanyActivity(companyId, 'Engineering', \Prototype validation successful for \.\);
            } else {
              // Add extra cost and delay
              const extraCost = Math.round(Number(dev.dev_cost) * validation.extraCostPct);
              await trx('manufacturing_in_development').where({ id: dev.id }).update({
                remaining_arcs: dev.remaining_arcs + validation.extraArcs,
                dev_cost: Number(dev.dev_cost) + extraCost,
                updated_at: trx.fn.now(),
              });

              runningCash -= extraCost;
              totalDevCost += extraCost;

              await trx('manufacturing_vehicle_models').where({ id: dev.vehicle_model_id }).update({
                prototype_validation_result: JSON.stringify(validation),
                updated_at: trx.fn.now(),
              });
              
              await LogCompanyActivity(companyId, 'Engineering', \Prototype validation (\) for \. \ issues found. Extra cost: ₯\.\);
            }

            // Update engineering culture score
            const currentCulture = Number(engReputation.engineering_culture_score || 0);
            const newCulture = applyEngineeringCulture(currentCulture, validation);
            const cultureDelta = newCulture - currentCulture;
            
            await trx('manufacturing_engineering_reputation').where({ company_id: companyId }).update({
              engineering_culture_score: newCulture,
              updated_at: trx.fn.now()
            });'''

content = content.replace(validation_old, validation_new)

# If the old validation replace didn't work exactly, we'll need a fallback, but let's try it first.
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
