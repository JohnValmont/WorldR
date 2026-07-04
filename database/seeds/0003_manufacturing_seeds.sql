-- WORLDr Seeds: Manufacturing v0.1
-- Idempotent. Does not delete player data.

-- Update Manufacturing industry to be playable
INSERT INTO industries (id, name, status, is_playable)
VALUES ('manufacturing', 'Manufacturing', 'active', true)
ON CONFLICT (id) DO UPDATE SET is_playable = true, status = 'active';

-- 1. MANUFACTURING SUBSECTORS
INSERT INTO manufacturing_subsectors (id, industry_id, name, status, is_playable)
VALUES ('automobile-manufacturing', 'manufacturing', 'Automobile Manufacturing', 'active', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    is_playable = EXCLUDED.is_playable;

-- 2. MANUFACTURING FACTORY TYPES
INSERT INTO manufacturing_factory_types (
    id, subsector_id, name,
    base_capacity_per_month, max_production_lines,
    base_lease_cost_per_month, base_maintenance_per_month,
    worker_requirement, status
)
VALUES
(
    'small-workshop', 'automobile-manufacturing', 'Small Workshop',
    100, 1,
    25000, 8000,
    30, 'active'
),
(
    'medium-plant', 'automobile-manufacturing', 'Medium Plant',
    500, 2,
    120000, 30000,
    150, 'locked'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    base_capacity_per_month = EXCLUDED.base_capacity_per_month,
    max_production_lines = EXCLUDED.max_production_lines,
    base_lease_cost_per_month = EXCLUDED.base_lease_cost_per_month,
    base_maintenance_per_month = EXCLUDED.base_maintenance_per_month,
    worker_requirement = EXCLUDED.worker_requirement,
    status = EXCLUDED.status;

-- 3. MANUFACTURING REGION MARKETS (Drennia states)
-- Universal structure — data happens to be for Drennia as first country
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
    'drennport-consumer-market', 'pre-alpha-world-1', 'drennia', 'drennia-drennport',
    'Drennport Consumer Market',
    850000, 52000, 1.20,
    0.35, 0.45, 0.20,
    'medium', 'mid', 0.80, 'active',
    'mid', 2.50, 0.3500,
    0.0030, 0.0005, 0.7500,
    0.6000, 0.5000,
    1.0000, 0.8500,
    0.250, 0.500, 0.250,
    '{"reliability": 1.0, "performance": 1.2, "fuel_efficiency": 0.9, "safety": 1.1, "appeal": 1.3, "cargo_utility": 0.8}'::jsonb
),
(
    'westport-commercial-market', 'pre-alpha-world-1', 'drennia', 'drennia-westport',
    'Westport Commercial Market',
    620000, 43000, 1.05,
    0.25, 0.35, 0.40,
    'high', 'mid', 0.70, 'active',
    'mid', 2.50, 0.4000,
    0.0035, 0.0008, 0.6500,
    0.5000, 0.6000,
    1.1000, 0.8000,
    0.400, 0.400, 0.200,
    '{"reliability": 1.4, "performance": 0.8, "fuel_efficiency": 1.2, "safety": 1.0, "appeal": 0.7, "cargo_utility": 1.5}'::jsonb
),
(
    'ironvale-worker-market', 'pre-alpha-world-1', 'drennia', 'drennia-ironvale',
    'Ironvale Worker Market',
    480000, 36000, 0.90,
    0.45, 0.30, 0.25,
    'low', 'budget', 0.60, 'active',
    'budget', 2.50, 0.2500,
    0.0020, 0.0003, 0.8500,
    0.4000, 0.3000,
    0.9500, 0.7500,
    0.600, 0.300, 0.100,
    '{"reliability": 1.3, "performance": 0.7, "fuel_efficiency": 1.4, "safety": 1.0, "appeal": 0.8, "cargo_utility": 1.2}'::jsonb
),
(
    'greenmere-rural-market', 'pre-alpha-world-1', 'drennia', 'drennia-greenmere',
    'Greenmere Rural Market',
    290000, 28000, 0.75,
    0.40, 0.20, 0.40,
    'low', 'budget', 0.50, 'active',
    'budget', 2.50, 0.4500,
    0.0025, 0.0004, 0.9000,
    0.3000, 0.4000,
    0.9000, 0.7000,
    0.500, 0.400, 0.100,
    '{"reliability": 1.5, "performance": 0.8, "fuel_efficiency": 1.1, "safety": 1.2, "appeal": 0.7, "cargo_utility": 1.3}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    population = EXCLUDED.population,
    average_income = EXCLUDED.average_income,
    economic_multiplier = EXCLUDED.economic_multiplier,
    preference_compact = EXCLUDED.preference_compact,
    preference_sedan = EXCLUDED.preference_sedan,
    preference_utility_van = EXCLUDED.preference_utility_van,
    competition_level = EXCLUDED.competition_level,
    market_tier = EXCLUDED.market_tier,
    distribution_strength = EXCLUDED.distribution_strength,
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

-- ─── 4. COUNTRY AUTOMOBILE CONFIGURATION ────────────────────────────────────
-- Drennia seed row — mirrors all formerly hardcoded constants exactly.
-- Future countries: add a row here with their own values.
INSERT INTO manufacturing_country_auto_config (
  country_id,
  base_vehicle_dev_cost, facelift_cost_fraction,
  expansion_cost, expansion_duration_months,
  expanded_capacity_per_month, expanded_max_lines,
  expanded_lease_cost_per_month, expanded_maintenance_per_month, expanded_worker_capacity,
  storage_cost_per_unit_per_month,
  marketing_cost_local, marketing_cost_regional, marketing_cost_national,
  starter_capital_min, baseline_component_price_idx
)
VALUES (
  'drennia',
  150000, 0.6000,
  500000, 2,
  200,    2,
  45000,  15000, 80,
  150,
  3500, 12000, 35000,
  50000, 1.000
)
ON CONFLICT (country_id) DO UPDATE SET
  base_vehicle_dev_cost         = EXCLUDED.base_vehicle_dev_cost,
  facelift_cost_fraction        = EXCLUDED.facelift_cost_fraction,
  expansion_cost                = EXCLUDED.expansion_cost,
  expansion_duration_months       = EXCLUDED.expansion_duration_months,
  expanded_capacity_per_month     = EXCLUDED.expanded_capacity_per_month,
  expanded_max_lines            = EXCLUDED.expanded_max_lines,
  expanded_lease_cost_per_month   = EXCLUDED.expanded_lease_cost_per_month,
  expanded_maintenance_per_month  = EXCLUDED.expanded_maintenance_per_month,
  expanded_worker_capacity      = EXCLUDED.expanded_worker_capacity,
  storage_cost_per_unit_per_month = EXCLUDED.storage_cost_per_unit_per_month,
  marketing_cost_local          = EXCLUDED.marketing_cost_local,
  marketing_cost_regional       = EXCLUDED.marketing_cost_regional,
  marketing_cost_national       = EXCLUDED.marketing_cost_national,
  starter_capital_min           = EXCLUDED.starter_capital_min,
  baseline_component_price_idx  = EXCLUDED.baseline_component_price_idx,
  updated_at                    = NOW();
