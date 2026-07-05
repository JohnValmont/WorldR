-- WORLDr Database Seeds: Universal Online World Foundation

-- 1. WORLD INSTANCES
INSERT INTO world_instances (id, name, status)
VALUES ('pre-alpha-world-1', 'WORLDr Pre-Alpha World', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 2. WORLD CLOCK
INSERT INTO world_clock (
    world_instance_id, current_year, current_month, current_day, 
    real_seconds_per_month, month_started_at, next_arc_close_at, status
)
VALUES (
    'pre-alpha-world-1', 842, 1, 1, 
    86400, NOW(), NOW() + INTERVAL '1 day', 'active'
)
ON CONFLICT (world_instance_id) DO NOTHING;

-- 3. CURRENCIES
INSERT INTO currencies (id, name, symbol, locale, decimal_places)
VALUES ('drennian-day', 'Drennian Day', '₯', 'en-US', 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol;

-- 4. COUNTRIES
INSERT INTO countries (id, world_instance_id, name, currency_id, status)
VALUES ('drennia', 'pre-alpha-world-1', 'Drennia', 'drennian-day', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 5. STATES
INSERT INTO states (id, country_id, name, status) VALUES 
('drennia-drennport', 'drennia', 'Drennport State', 'active'),
('drennia-westport', 'drennia', 'Westport State', 'active'),
('drennia-ironvale', 'drennia', 'Ironvale State', 'active'),
('drennia-greenmere', 'drennia', 'Greenmere State', 'active')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- 6. INDUSTRIES
INSERT INTO industries (id, name, status, is_playable) VALUES 
('shipping-logistics', 'Shipping & Logistics', 'active', true),
('manufacturing', 'Manufacturing', 'active', false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_playable = EXCLUDED.is_playable;

-- 7. LEGAL STRUCTURES
-- sole-trader / private-company / public-corporation are the playable tiers (see migration 0031)
INSERT INTO legal_structures (id, name, status, is_available) VALUES 
('sole-trader', 'Sole Trader', 'active', true),
('private-company', 'Private Company', 'active', true),
('corporation', 'Corporation', 'active', false),
('public-corporation', 'Public Corporation', 'active', true),
('holding-company', 'Holding Company', 'active', false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_available = EXCLUDED.is_available;
