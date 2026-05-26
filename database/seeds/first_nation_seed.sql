-- WORLDr Initial Seeding Script - First Nation (Omnia)
-- Target Database: PostgreSQL 13+
-- Assigns initial configuration, balance parameters, templates, and spins up the first nation with sub-entities.

-- Wrap in a transaction to ensure atomic execution
BEGIN;

-- ============================================================================
-- 1. SEED GLOBAL PARAMETERS
-- ============================================================================
DELETE FROM parameters;

INSERT INTO parameters (category, name, value, description) VALUES
('simulation', 'tax_elasticity', 0.150000, 'Sensitivity of economic output to changes in tax rates. Higher values mean higher taxes restrict growth more.'),
('simulation', 'inflation_damping', 0.800000, 'Damping factor applied to monthly price updates to prevent hyper-inflation spikes.'),
('simulation', 'unemployment_base_rate', 0.050000, 'Base natural unemployment rate under optimal economic conditions.'),
('simulation', 'approval_decay', 0.990000, 'Decay modifier applied to population class approval ratings to simulate long-term voter fatigue.'),
('simulation', 'gdp_growth_target', 0.030000, 'Target annual GDP growth rate used as a baseline for economic comparison.'),
('simulation', 'debt_interest_rate', 0.045000, 'Annual interest rate charged on accumulated national debt.'),
('simulation', 'welfare_efficiency', 0.850000, 'The fraction of budget allocated to welfare that directly translates to population group income support.');

-- ============================================================================
-- 2. SEED NATION TEMPLATES
-- ============================================================================
DELETE FROM nation_templates;

-- Seed template for 'Omnia' - the default starting nation
INSERT INTO nation_templates (id, name, description, treasury, debt, gdp, inflation_food, inflation_fuel, inflation_housing, inflation_cpi, approval, stability, template_data)
VALUES (
    'd8f28df1-435b-42fa-9d10-85f0e34c2ee2',
    'Omnia',
    'A balanced starting nation with a mixed economy, moderate social spending, and stable democracy. Ideal for a standard governance simulation run.',
    1000000000.00,  -- treasury
    200000000.00,   -- debt
    1005000000.00,  -- gdp
    0.0200,         -- inflation_food
    0.0200,         -- inflation_fuel
    0.0200,         -- inflation_housing
    0.0200,         -- inflation_cpi
    0.6000,         -- approval
    0.6500,         -- stability
    '{
        "sectors": [
            {"name": "Agriculture", "output": 150000000.00, "workers": 4000000.00, "productivity": 1.0000, "wages": 15000.00, "growth": 0.0120},
            {"name": "Industry", "output": 300000000.00, "workers": 7000000.00, "productivity": 1.1500, "wages": 25000.00, "growth": 0.0220},
            {"name": "Services", "output": 350000000.00, "workers": 11000000.00, "productivity": 1.1000, "wages": 32000.00, "growth": 0.0280},
            {"name": "Energy", "output": 120000000.00, "workers": 1500000.00, "productivity": 1.3000, "wages": 38000.00, "growth": 0.0150},
            {"name": "Construction", "output": 85000000.00, "workers": 2500000.00, "productivity": 1.0500, "wages": 20000.00, "growth": 0.0180}
        ],
        "population_groups": [
            {"name": "Poor", "size": 6000000.00, "income": 9500.00, "approval": 0.5000, "ideology": "Socialist", "inflation_sensitivity": 0.8500, "unemployment_sensitivity": 0.9000},
            {"name": "Working", "size": 11000000.00, "income": 20000.00, "approval": 0.5800, "ideology": "Social Democrat", "inflation_sensitivity": 0.7500, "unemployment_sensitivity": 0.8000},
            {"name": "Middle", "size": 7500000.00, "income": 38000.00, "approval": 0.6200, "ideology": "Liberal", "inflation_sensitivity": 0.6000, "unemployment_sensitivity": 0.6000},
            {"name": "Wealthy", "size": 1300000.00, "income": 105000.00, "approval": 0.6500, "ideology": "Conservative", "inflation_sensitivity": 0.4000, "unemployment_sensitivity": 0.3000},
            {"name": "Elite", "size": 200000.00, "income": 480000.00, "approval": 0.7200, "ideology": "Libertarian", "inflation_sensitivity": 0.1500, "unemployment_sensitivity": 0.1000}
        ],
        "taxes": [
            {"name": "Income Tax", "rate": 0.1800, "revenue": 0.00},
            {"name": "Corporate Tax", "rate": 0.2200, "revenue": 0.00},
            {"name": "Sales Tax", "rate": 0.0800, "revenue": 0.00},
            {"name": "Property Tax", "rate": 0.0120, "revenue": 0.00},
            {"name": "Tariffs", "rate": 0.0400, "revenue": 0.00}
        ],
        "budgets": [
            {"name": "Education", "allocation": 110000000.00},
            {"name": "Healthcare", "allocation": 130000000.00},
            {"name": "Infrastructure", "allocation": 95000000.00},
            {"name": "Welfare", "allocation": 75000000.00},
            {"name": "Administration", "allocation": 45000000.00}
        ],
        "prices": [
            {"sector_name": "Agriculture", "price_index": 1.0000, "base_price": 10.0000, "inflation_rate": 0.0200},
            {"sector_name": "Industry", "price_index": 1.0000, "base_price": 25.0000, "inflation_rate": 0.0150},
            {"sector_name": "Services", "price_index": 1.0000, "base_price": 50.0000, "inflation_rate": 0.0250},
            {"sector_name": "Energy", "price_index": 1.0000, "base_price": 12.0000, "inflation_rate": 0.0300},
            {"sector_name": "Construction", "price_index": 1.0000, "base_price": 100.0000, "inflation_rate": 0.0200}
        ]
    }'::jsonb
);

-- ============================================================================
-- 3. SPIN UP FIRST NATION (Omnia)
-- ============================================================================
-- Clean up any previous seeding to allow re-runs
DELETE FROM users;
DELETE FROM nations;

INSERT INTO nations (id, name, treasury, debt, gdp, inflation_food, inflation_fuel, inflation_housing, inflation_cpi, approval, stability, current_tick)
VALUES (
    'e70b7410-b98a-493b-bb57-d7ff7d3f82ee',
    'Omnia',
    1000000000.00,  -- starting treasury
    200000000.00,   -- starting debt
    1005000000.00,  -- starting gdp
    0.0200,         -- food inflation
    0.0200,         -- fuel inflation
    0.0200,         -- housing inflation
    0.0200,         -- CPI inflation
    0.6000,         -- initial government approval
    0.6500,         -- initial national stability
    0               -- tick 0 (start of game)
);

-- ============================================================================
-- 4. SEED NATION SUB-ENTITIES (Omnia)
-- ============================================================================
-- 4.1. Economic Sectors
INSERT INTO economic_sectors (nation_id, name, output, workers, productivity, wages, growth) VALUES
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Agriculture', 150000000.00, 4000000.00, 1.0000, 15000.00, 0.0120),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Industry', 300000000.00, 7000000.00, 1.1500, 25000.00, 0.0220),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Services', 350000000.00, 11000000.00, 1.1000, 32000.00, 0.0280),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Energy', 120000000.00, 1500000.00, 1.3000, 38000.00, 0.0150),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Construction', 85000000.00, 2500000.00, 1.0500, 20000.00, 0.0180);

-- 4.2. Population Groups (Classes)
INSERT INTO population_groups (nation_id, name, size, income, approval, ideology, inflation_sensitivity, unemployment_sensitivity) VALUES
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Poor', 6000000.00, 9500.00, 0.5000, 'Socialist', 0.8500, 0.9000),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Working', 11000000.00, 20000.00, 0.5800, 'Social Democrat', 0.7500, 0.8000),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Middle', 7500000.00, 38000.00, 0.6200, 'Liberal', 0.6000, 0.6000),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Wealthy', 1300000.00, 105000.00, 0.6500, 'Conservative', 0.4000, 0.3000),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Elite', 200000.00, 480000.00, 0.7200, 'Libertarian', 0.1500, 0.1000);

-- 4.3. Taxes
INSERT INTO taxes (nation_id, name, rate, revenue) VALUES
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Income Tax', 0.1800, 0.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Corporate Tax', 0.2200, 0.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Sales Tax', 0.0800, 0.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Property Tax', 0.0120, 0.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Tariffs', 0.0400, 0.00);

-- 4.4. Budget Items
INSERT INTO budget_items (nation_id, name, allocation) VALUES
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Education', 110000000.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Healthcare', 130000000.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Infrastructure', 95000000.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Welfare', 75000000.00),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Administration', 45000000.00);

-- 4.5. Prices
INSERT INTO prices (nation_id, sector_name, price_index, base_price, inflation_rate) VALUES
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Agriculture', 1.0000, 10.0000, 0.0200),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Industry', 1.0000, 25.0000, 0.0150),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Services', 1.0000, 50.0000, 0.0250),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Energy', 1.0000, 12.0000, 0.0300),
('e70b7410-b98a-493b-bb57-d7ff7d3f82ee', 'Construction', 1.0000, 100.0000, 0.0200);

-- ============================================================================
-- 5. SEED INITIAL LAWS & LAW EFFECTS
-- ============================================================================
-- Seed a passed law that demonstrates multipliers/additives on output and income
INSERT INTO laws (id, nation_id, title, description, status) VALUES
(
    'c3e56a78-b98a-493b-bb57-d7ff7d3f82ee',
    'e70b7410-b98a-493b-bb57-d7ff7d3f82ee',
    'Agricultural Mechanization Subsidies',
    'Subsidizes purchasing tractors, harvesters, and high-efficiency watering systems for farms. Enhances Agriculture productivity by 10%.',
    'passed'
),
(
    'f4d56b89-b98a-493b-bb57-d7ff7d3f82ee',
    'e70b7410-b98a-493b-bb57-d7ff7d3f82ee',
    'Universal Basic Income Act',
    'Proposes a state-funded minimum dividend to lower socio-economic classes to decrease inequality.',
    'proposed'
);

INSERT INTO law_effects (id, law_id, target_type, target_name, parameter_name, modifier_type, modifier_value) VALUES
(
    '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    'c3e56a78-b98a-493b-bb57-d7ff7d3f82ee',
    'sector',
    'Agriculture',
    'productivity',
    'multiplier',
    1.100000
);

-- ============================================================================
-- 6. SEED DEFAULT USER (Prime Minister)
-- ============================================================================
-- password_hash is bcrypt for 'admin123'
INSERT INTO users (id, username, email, password_hash, role, nation_id) VALUES
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'prime_minister',
    'pm@omnia.gov.worldr',
    '$2b$10$R9hKb5T3fVfSGyS3A595Oe9Z2KqEey8hB8W6H7D62s91Y3hD5Lz8m', -- bcrypt hash of 'admin123'
    'admin',
    'e70b7410-b98a-493b-bb57-d7ff7d3f82ee'
);

-- Commit transaction
COMMIT;
