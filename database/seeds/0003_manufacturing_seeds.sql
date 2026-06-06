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
    base_capacity_per_arc, max_production_lines,
    base_lease_cost_per_arc, base_maintenance_per_arc,
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
    base_capacity_per_arc = EXCLUDED.base_capacity_per_arc,
    max_production_lines = EXCLUDED.max_production_lines,
    base_lease_cost_per_arc = EXCLUDED.base_lease_cost_per_arc,
    base_maintenance_per_arc = EXCLUDED.base_maintenance_per_arc,
    worker_requirement = EXCLUDED.worker_requirement,
    status = EXCLUDED.status;

-- 3. MANUFACTURING REGION MARKETS (Drennia states)
-- Universal structure — data happens to be for Drennia as first country
INSERT INTO manufacturing_region_markets (
    id, world_instance_id, country_id, state_id, name,
    population, average_income, economic_multiplier,
    preference_compact, preference_sedan, preference_utility_van, status
)
VALUES
(
    'drennport-consumer-market', 'pre-alpha-world-1', 'drennia', 'drennia-drennport',
    'Drennport Consumer Market',
    850000, 52000, 1.20,
    0.35, 0.45, 0.20, 'active'
),
(
    'westport-commercial-market', 'pre-alpha-world-1', 'drennia', 'drennia-westport',
    'Westport Commercial Market',
    620000, 43000, 1.05,
    0.25, 0.35, 0.40, 'active'
),
(
    'ironvale-worker-market', 'pre-alpha-world-1', 'drennia', 'drennia-ironvale',
    'Ironvale Worker Market',
    480000, 36000, 0.90,
    0.45, 0.30, 0.25, 'active'
),
(
    'greenmere-rural-market', 'pre-alpha-world-1', 'drennia', 'drennia-greenmere',
    'Greenmere Rural Market',
    290000, 28000, 0.75,
    0.40, 0.20, 0.40, 'active'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    population = EXCLUDED.population,
    average_income = EXCLUDED.average_income,
    economic_multiplier = EXCLUDED.economic_multiplier,
    preference_compact = EXCLUDED.preference_compact,
    preference_sedan = EXCLUDED.preference_sedan,
    preference_utility_van = EXCLUDED.preference_utility_van,
    status = EXCLUDED.status;
