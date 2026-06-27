-- WORLDr Phase 0 — Second-Country Smoke Test
-- Development-only script. NOT a production migration.
-- Proves the Automobile Manufacturing engine is fully country-agnostic.
-- Run manually. Clean up with the CLEANUP section at the bottom when done.

-- ─── TEST COUNTRY: VELDORAN ──────────────────────────────────────────────────
-- Uses a distinct currency (₸ Veldoran Thaler) and different cost structure.
-- All values differ from Drennia to detect any remaining hardcodes.

-- 1. Currency
INSERT INTO currencies (id, name, symbol, locale)
VALUES ('veldoran-thaler', 'Veldoran Thaler', '₸', 'en-US')
ON CONFLICT (id) DO UPDATE SET symbol = '₸', locale = 'en-US';

-- 2. Country
INSERT INTO countries (id, world_instance_id, name, currency_id, status)
VALUES ('veldoran', 'pre-alpha-world-1', 'Veldoran', 'veldoran-thaler', 'active')
ON CONFLICT (id) DO UPDATE SET name = 'Veldoran', currency_id = 'veldoran-thaler';

-- 3. States
INSERT INTO states (id, country_id, name, status)
VALUES
  ('veldoran-kalden',      'veldoran', 'Kalden Province', 'active'),
  ('veldoran-marshview',   'veldoran', 'Marshview District', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 4. Markets (Veldoran — 2 markets with different profiles from Drennia)
INSERT INTO manufacturing_region_markets (
  id, world_instance_id, country_id, state_id, name,
  population, average_income, economic_multiplier,
  preference_compact, preference_sedan, preference_utility_van,
  competition_level, market_tier, distribution_strength, status,
  income_tier, avg_household_size, vehicle_ownership_rate,
  baseline_replacement_rate, first_time_buyer_rate, price_sensitivity,
  brand_awareness_sensitivity, brand_trust_sensitivity,
  purchase_need_intensity, vehicle_price_comfort_ratio,
  preference_economy, preference_standard, preference_premium,
  vehicle_attribute_weights
)
VALUES
(
  'kalden-metro-market', 'pre-alpha-world-1', 'veldoran', 'veldoran-kalden',
  'Kalden Metro Market',
  1200000, 61000, 1.35,
  0.40, 0.45, 0.15,
  'high', 'premium', 0.85, 'active',
  'premium', 2.30, 0.4500,
  0.0035, 0.0006, 0.6000,
  0.7000, 0.6500,
  1.0500, 0.9000,
  0.100, 0.400, 0.500,
  '{"reliability": 1.2, "performance": 1.4, "fuel_efficiency": 0.8, "safety": 1.3, "appeal": 1.5, "cargo_utility": 0.9}'::jsonb
),
(
  'marshview-rural-market', 'pre-alpha-world-1', 'veldoran', 'veldoran-marshview',
  'Marshview Rural Market',
  380000, 31000, 0.80,
  0.50, 0.20, 0.30,
  'low', 'budget', 0.55, 'active',
  'budget', 3.10, 0.3000,
  0.0020, 0.0004, 0.8500,
  0.4000, 0.3000,
  0.8500, 0.7000,
  0.700, 0.200, 0.100,
  '{"reliability": 1.5, "performance": 0.7, "fuel_efficiency": 1.2, "safety": 1.1, "appeal": 0.6, "cargo_utility": 1.4}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  population = EXCLUDED.population,
  average_income = EXCLUDED.average_income,
  status = EXCLUDED.status,
  income_tier = EXCLUDED.income_tier,
  avg_household_size = EXCLUDED.avg_household_size,
  vehicle_ownership_rate = EXCLUDED.vehicle_ownership_rate,
  baseline_replacement_rate = EXCLUDED.baseline_replacement_rate,
  first_time_buyer_rate = EXCLUDED.first_time_buyer_rate,
  price_sensitivity = EXCLUDED.price_sensitivity,
  brand_awareness_sensitivity = EXCLUDED.brand_awareness_sensitivity,
  brand_trust_sensitivity = EXCLUDED.brand_trust_sensitivity,
  purchase_need_intensity = EXCLUDED.purchase_need_intensity,
  vehicle_price_comfort_ratio = EXCLUDED.vehicle_price_comfort_ratio,
  preference_economy = EXCLUDED.preference_economy,
  preference_standard = EXCLUDED.preference_standard,
  preference_premium = EXCLUDED.preference_premium,
  vehicle_attribute_weights = EXCLUDED.vehicle_attribute_weights;

-- 5. Veldoran automobile config — deliberately DIFFERENT from Drennia to catch hardcodes
INSERT INTO manufacturing_country_auto_config (
  country_id,
  base_vehicle_dev_cost, facelift_cost_fraction,
  expansion_cost, expansion_duration_arcs,
  expanded_capacity_per_arc, expanded_max_lines,
  expanded_lease_cost_per_arc, expanded_maintenance_per_arc, expanded_worker_capacity,
  storage_cost_per_unit_per_arc,
  marketing_cost_local, marketing_cost_regional, marketing_cost_national,
  starter_capital_min, baseline_component_price_idx,
  engineering_programmes_config
)
VALUES (
  'veldoran',
  120000, 0.5500,      -- cheaper dev, lower facelift fraction
  300000, 3,           -- cheaper expansion but takes longer
  250, 3,              -- 3 lines post-expansion (not 2)
  52000, 18000, 100,   -- different running costs
  120,                 -- cheaper storage
  2500, 9000, 28000,   -- different marketing costs
  40000, 0.950,        -- cheaper starter + lower component index
  '{
    "economy-tune": { "budget": 100000, "baseDuration": 3 },
    "safety-arch": { "budget": 200000, "baseDuration": 3 },
    "durability-val": { "budget": 150000, "baseDuration": 3 },
    "assembly-time": { "budget": 160000, "baseDuration": 3 },
    "spc": { "budget": 190000, "baseDuration": 3 }
  }'::jsonb
)
ON CONFLICT (country_id) DO UPDATE SET
  base_vehicle_dev_cost         = EXCLUDED.base_vehicle_dev_cost,
  facelift_cost_fraction        = EXCLUDED.facelift_cost_fraction,
  expansion_cost                = EXCLUDED.expansion_cost,
  expansion_duration_arcs       = EXCLUDED.expansion_duration_arcs,
  expanded_capacity_per_arc     = EXCLUDED.expanded_capacity_per_arc,
  expanded_max_lines            = EXCLUDED.expanded_max_lines,
  expanded_lease_cost_per_arc   = EXCLUDED.expanded_lease_cost_per_arc,
  expanded_maintenance_per_arc  = EXCLUDED.expanded_maintenance_per_arc,
  expanded_worker_capacity      = EXCLUDED.expanded_worker_capacity,
  storage_cost_per_unit_per_arc = EXCLUDED.storage_cost_per_unit_per_arc,
  marketing_cost_local          = EXCLUDED.marketing_cost_local,
  marketing_cost_regional       = EXCLUDED.marketing_cost_regional,
  marketing_cost_national       = EXCLUDED.marketing_cost_national,
  starter_capital_min           = EXCLUDED.starter_capital_min,
  baseline_component_price_idx  = EXCLUDED.baseline_component_price_idx,
  engineering_programmes_config = EXCLUDED.engineering_programmes_config,
  updated_at                    = NOW();


-- ─── VALIDATION QUERIES ───────────────────────────────────────────────────────
-- Run these manually after creating a test company in Veldoran.

-- Q1: Drennia markets — must show exactly 4 rows, all Drennia country_id
SELECT id, country_id, name FROM manufacturing_region_markets WHERE country_id = 'drennia';
-- Expected: 4 rows (drennport, westport, ironvale, greenmere)

-- Q2: Veldoran markets — must show exactly 2 rows
SELECT id, country_id, name FROM manufacturing_region_markets WHERE country_id = 'veldoran';
-- Expected: 2 rows (kalden-metro-market, marshview-rural-market)

-- Q3: Veldoran config values (must differ from Drennia)
SELECT
  country_id,
  expansion_cost,          -- Veldoran: 300000, Drennia: 500000
  expansion_duration_arcs, -- Veldoran: 3, Drennia: 2
  expanded_capacity_per_arc, -- Veldoran: 250, Drennia: 200
  storage_cost_per_unit_per_arc -- Veldoran: 120, Drennia: 150
FROM manufacturing_country_auto_config
ORDER BY country_id;

-- Q4: State names returned alongside markets (verifies JOIN in backend)
SELECT
  mrm.id,
  mrm.country_id,
  s.name AS state_name,
  mrm.income_tier
FROM manufacturing_region_markets mrm
JOIN states s ON mrm.state_id = s.id
WHERE mrm.country_id IN ('drennia', 'veldoran')
ORDER BY mrm.country_id, mrm.id;

-- Q5: Cross-country market allocation security check (should be blocked by backend)
-- Attempt via API: POST /companies/<veldoran-company-id>/manufacturing/markets/allocate
-- body: { vehicleModelId: <veldoran-model-id>, regionMarketId: 'drennport-consumer-market', ... }
-- Expected response: HTTP 403, { error: 'This market does not belong to your company\'s country' }


-- ─── CLEANUP (run when done testing) ─────────────────────────────────────────
/*
DELETE FROM manufacturing_country_auto_config WHERE country_id = 'veldoran';
DELETE FROM manufacturing_region_markets WHERE country_id = 'veldoran';
DELETE FROM states WHERE country_id = 'veldoran';
DELETE FROM countries WHERE id = 'veldoran';
DELETE FROM currencies WHERE id = 'veldoran-thaler';
*/
