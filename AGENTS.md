# WORLDr — Agent Context (read before every task)

## Architecture facts (verified):
- Demand engine ManufacturingController.simulateSalesDemand(marketAllocations[], brandMap,
  MARKETING_MULT, salesManagerBonus) groups by region_market_id and resolves competition
  across ALL allocations passed. It is ALREADY multi-company. Do NOT rewrite it.
- processManufacturingArc (POST /admin/manufacturing/process-company/:companyId) is
  single-company: it loads only one company's allocations/finances. NPCs must change this.
- There are NO reusable repositories for company/model/allocation — all inserts are inline
  knex (trx('table').insert) inside manufacturing.controller.ts.

## Key tables/columns:
- companies: owner_character_id NOT NULL, country_id, industry_id='manufacturing', name, status.
- company_finances: company_id, available_cash, debt, company_value, last_arc_profit.
- manufacturing_vehicle_models: sale_price, manufacturing_cost_per_unit, reliability_score,
  performance_score, fuel_efficiency_score, appeal_score, cargo_score, target_segment,
  vehicle_class, platform_type, power_unit_type, drivetrain_type, interior_tier, safety_tier.
- manufacturing_market_allocations: units_allocated, marketing_tier (UNIQUE company+model+market).
  PRICE IS NOT HERE — sale_price lives on the vehicle model.
- manufacturing_factories: lease_cost_per_arc, maintenance_cost_per_arc, capacity_per_arc.
- manufacturing_production_lines: assigned_vehicle_model_id, target_units_per_arc, status.
- manufacturing_sales_results: units_sold, sale_price, revenue, market_share_estimate (engine output).

## mainReasonCode values (exact): 'Balanced', 'Zero Demand', 'Low Brand Awareness',
  'Weak Distribution', 'Market Capacity Capped (Cannibalised)', 'Sold Out'.

## Locked systems — DO NOT rebuild:
- marketSegments.ts demand formula (FIT_EXP=4.0, VALUE_K=1.6, affordability steepness 2.0, /65 norm).
- marketing.ts (RETENTION=0.85, MAX_GAIN=17, HALF_SAT=30000; tiers none/local/regional/national
  cost 0/3500/12000/35000, mult 1.0/1.15/1.30/1.50; awarenessMult=0.35+0.65*(awareness/100)).
  Marketing is deducted ONCE in the arc — never double-charge.

## Engineering rules: root-cause not band-aid; ALL tunable numbers in constants files;
  behavior tests with RATIO-based assertions; model numbers before coding; keep .env* git-ignored.

## How to talk to me: solo non-coder directing AI. Plain English, no unexplained jargon,
  paste real code+paths, be direct not flattering.

## NPC v1 Complete
NPC competitors v1 is completely finished and validated. They use pooled sell on the player's tick, reuse the same tables as players, and use rule-based heuristics.

### Architectural Rules (DO NOT BREAK):
- "NPCs are strictly inventory-aware: The Ghost Car bug was fixed via a hard Math.min(demand, inventory_in_stock) clamp in settleForCompany."
- "NPC pricing is strictly capped at 2.5 * manufacturing_cost_per_unit under Rule B2 (Sold Out) to prevent infinite hyperinflation loops."
- "NPC Brain reactivity (Rule B1) uses explicit prevPrevArc market share comparisons to accurately gauge share drops without state-bleed."

## Phase 4 Complete
Phase 4 (Self-Analytics, Market Structure, and Paid Research) is completely finished and validated.

### Architectural Rules (DO NOT BREAK):
- "Paid Market Research (Phase 4c) relies on a strict DB transaction checking company_finances.available_cash before revealing competitor data. Tier 1 dynamically strips sale_price and engineering specs, while Tier 2 reveals all. Do not bypass this transaction for any UI or data fetching."
