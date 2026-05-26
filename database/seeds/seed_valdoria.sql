-- WORLDr Alpha v0.1 — Valdoria Nation Seed
-- The single playable nation for the alpha release.
-- Fixed UUID: f47ac10b-58cc-4372-a567-0e02b2c3d479
-- Safe to re-run (ON CONFLICT DO NOTHING / idempotent)
-- Target Database: PostgreSQL 13+

BEGIN;

-- ============================================================================
-- 0. ENSURE PARAMETERS EXIST (idempotent)
-- ============================================================================
INSERT INTO parameters (category, name, value, description) VALUES
  ('simulation', 'tax_elasticity', 0.150000, 'Sensitivity of economic output to tax rate changes.'),
  ('simulation', 'inflation_damping', 0.800000, 'Damping factor applied to monthly price updates.'),
  ('simulation', 'unemployment_base_rate', 0.050000, 'Natural unemployment rate under optimal conditions.'),
  ('simulation', 'approval_decay', 0.990000, 'Monthly voter fatigue decay multiplier.'),
  ('simulation', 'gdp_growth_target', 0.030000, 'Target annual GDP growth baseline.'),
  ('simulation', 'debt_interest_rate', 0.045000, 'Annual interest rate on national debt.'),
  ('simulation', 'welfare_efficiency', 0.850000, 'Fraction of welfare budget reaching population groups.'),
  ('simulation', 'recession_trigger_threshold', -0.010000, 'GDP contraction rate that triggers recession risk.'),
  ('simulation', 'recession_buildup_speed', 0.250000, 'How fast recession risk accumulates.'),
  ('simulation', 'recession_recovery_speed', 0.150000, 'How fast the economy recovers post-recession.'),
  ('simulation', 'protest_approval_threshold', 0.400000, 'Approval level below which protest risk builds.'),
  ('simulation', 'protest_stability_threshold', 0.450000, 'Stability level below which protest risk builds.'),
  ('simulation', 'protest_buildup_speed', 0.200000, 'Speed at which protest pressure accumulates.'),
  ('simulation', 'protest_repression_impact', 0.300000, 'Protest reduction from repression action.'),
  ('simulation', 'protest_negotiation_impact', 0.400000, 'Protest reduction from negotiation action.'),
  ('simulation', 'banking_stress_threshold', 0.800000, 'Debt-to-GDP ratio triggering banking stress.'),
  ('simulation', 'banking_buildup_speed', 0.150000, 'Banking stress accumulation speed.'),
  ('simulation', 'banking_recovery_speed', 0.100000, 'Banking stress recovery speed.'),
  ('simulation', 'strike_approval_threshold', 0.350000, 'Approval below which strike risk builds.'),
  ('simulation', 'strike_buildup_speed', 0.200000, 'Strike risk accumulation speed.'),
  ('simulation', 'institutional_trust_threshold', 0.350000, 'Trust threshold below which legitimacy erodes.'),
  ('simulation', 'institutional_buildup_speed', 0.150000, 'Institutional decay accumulation speed.'),
  ('simulation', 'legitimacy_threshold', 0.400000, 'Approval below which legitimacy crisis builds.'),
  ('simulation', 'legitimacy_buildup_speed', 0.200000, 'Legitimacy crisis buildup speed.')
ON CONFLICT (category, name) DO NOTHING;

-- ============================================================================
-- 1. NATION TEMPLATE
-- ============================================================================
INSERT INTO nation_templates (
  id, name, description,
  treasury, debt, gdp,
  inflation_food, inflation_fuel, inflation_housing, inflation_cpi,
  approval, stability, template_data
) VALUES (
  'a2c4e6f8-1234-4abc-8def-000000000001',
  'Valdoria',
  'A mid-size democratic republic in Eastern Europe. Mixed economy with strong industrial base, moderate social safety net, and an active multi-party political system.',
  1200000000.00,
  350000000.00,
  1450000000.00,
  0.0230, 0.0250, 0.0280, 0.0240,
  0.5500, 0.6000,
  '{
    "sectors": [
      {"name": "Agriculture", "output": 180000000.00, "workers": 4500000, "productivity": 1.05, "wages": 14500, "growth": 0.0130},
      {"name": "Industry", "output": 420000000.00, "workers": 8500000, "productivity": 1.20, "wages": 26000, "growth": 0.0210},
      {"name": "Services", "output": 490000000.00, "workers": 13000000, "productivity": 1.15, "wages": 33000, "growth": 0.0290},
      {"name": "Energy", "output": 210000000.00, "workers": 2000000, "productivity": 1.35, "wages": 40000, "growth": 0.0160},
      {"name": "Construction", "output": 150000000.00, "workers": 3000000, "productivity": 1.08, "wages": 21000, "growth": 0.0190}
    ]
  }'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. THE NATION OF VALDORIA
-- ============================================================================
INSERT INTO nations (
  id, name, region, continent,
  treasury, debt, gdp,
  inflation_food, inflation_fuel, inflation_housing, inflation_cpi,
  approval, stability, current_tick
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Valdoria',
  'Eastern Europe',
  'Europe',
  1200000000.00,
  350000000.00,
  1450000000.00,
  0.0230, 0.0250, 0.0280, 0.0240,
  0.5500, 0.6000,
  0
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. ECONOMIC SECTORS
-- ============================================================================
INSERT INTO economic_sectors (nation_id, name, output, workers, productivity, wages, growth) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Agriculture',  180000000.00,  4500000.00, 1.0500, 14500.00, 0.0130),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Industry',     420000000.00,  8500000.00, 1.2000, 26000.00, 0.0210),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Services',     490000000.00, 13000000.00, 1.1500, 33000.00, 0.0290),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Energy',       210000000.00,  2000000.00, 1.3500, 40000.00, 0.0160),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Construction', 150000000.00,  3000000.00, 1.0800, 21000.00, 0.0190)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 4. POPULATION GROUPS
-- ============================================================================
INSERT INTO population_groups (nation_id, name, size, income, approval, ideology, inflation_sensitivity, unemployment_sensitivity) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Poor',    5500000.00,   8500.00, 0.4800, 'Socialist',       0.9000, 0.9500),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Working', 12000000.00, 21000.00, 0.5600, 'Social Democrat', 0.7500, 0.8000),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Middle',   8000000.00, 40000.00, 0.6000, 'Liberal',         0.5500, 0.5500),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Wealthy',  1500000.00,115000.00, 0.6400, 'Conservative',    0.3500, 0.2500),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Elite',     250000.00,520000.00, 0.7000, 'Libertarian',     0.1200, 0.0800)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 5. TAXES
-- ============================================================================
INSERT INTO taxes (nation_id, name, rate, revenue) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Income Tax',    0.2000, 0.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Corporate Tax', 0.1800, 0.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Sales Tax',     0.1200, 0.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Property Tax',  0.0150, 0.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Tariffs',       0.0800, 0.00)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 6. BUDGET ITEMS
-- ============================================================================
INSERT INTO budget_items (nation_id, name, allocation) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Education',       130000000.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Healthcare',      150000000.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Infrastructure',  110000000.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Welfare',          90000000.00),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Administration',   60000000.00)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 7. PRICES
-- ============================================================================
INSERT INTO prices (nation_id, sector_name, price_index, base_price, inflation_rate) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Agriculture',  1.0000, 10.0000, 0.0230),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Industry',     1.0000, 28.0000, 0.0180),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Services',     1.0000, 55.0000, 0.0290),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Energy',       1.0000, 14.0000, 0.0320),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Construction', 1.0000,105.0000, 0.0210)
ON CONFLICT (nation_id, sector_name) DO NOTHING;

-- ============================================================================
-- 8. STARTER LAWS
-- ============================================================================
INSERT INTO laws (id, nation_id, title, description, status) VALUES
  (
    '11111111-1111-1111-1111-000000000001',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'National Industrialization Fund',
    'Provides state-backed loans and grants to modernize the industrial sector, targeting a 12% productivity increase over 4 years.',
    'passed'
  ),
  (
    '11111111-1111-1111-1111-000000000002',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Universal Healthcare Expansion Act',
    'Expands healthcare access to rural and low-income populations. Increases healthcare budget effectiveness by 8%.',
    'passed'
  ),
  (
    '11111111-1111-1111-1111-000000000003',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Carbon Reduction Energy Tax',
    'Introduces a graduated carbon levy on fossil fuel industries to fund renewable energy transition.',
    'proposed'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO law_effects (id, law_id, target_type, target_name, parameter_name, modifier_type, modifier_value) VALUES
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000001', 'sector', 'Industry', 'productivity', 'multiplier', 1.0800),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000002', 'population_group', 'Poor', 'approval', 'additive', 0.0500),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000002', 'population_group', 'Working', 'approval', 'additive', 0.0300)
ON CONFLICT (id) DO NOTHING;

COMMIT;
