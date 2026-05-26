-- WORLDr Alpha v0.1 - Keldoria Nation Seed
-- Constitutional Monarchy - Europe-inspired starter nation
-- Continent: Alderis | Capital: Veldenmoor | 82M population | $3.82T GDP
-- Fixed UUID: b1a2c3d4-e5f6-7890-abcd-ef1234567890
-- Safe to re-run (ON CONFLICT DO NOTHING / idempotent)

BEGIN;

-- ============================================================================
-- 0. SIMULATION PARAMETERS
-- ============================================================================
INSERT INTO parameters (category, name, value, description) VALUES
  ('simulation', 'tax_elasticity', 0.150000, 'Sensitivity of economic output to tax rate changes.'),
  ('simulation', 'inflation_damping', 0.800000, 'Damping factor applied to monthly price updates.'),
  ('simulation', 'unemployment_base_rate', 0.051000, 'Natural unemployment rate under optimal conditions.'),
  ('simulation', 'approval_decay', 0.990000, 'Monthly voter fatigue decay multiplier.'),
  ('simulation', 'gdp_growth_target', 0.024000, 'Target annual GDP growth baseline.'),
  ('simulation', 'debt_interest_rate', 0.042000, 'Annual interest rate on national debt.'),
  ('simulation', 'welfare_efficiency', 0.880000, 'Fraction of welfare budget reaching population groups.'),
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
-- 1. NATION: KELDORIA
-- ============================================================================
INSERT INTO nations (
  id, name, region, continent,
  continent_id, governance_system,
  parliament_seats, election_cycle_months,
  monarch_title, monarch_name, monarch_family,
  head_of_government_title,
  flag_description, flag_colors, motto,
  currency_name, currency_code,
  population_size, founded_year,
  treasury, debt, gdp,
  inflation_food, inflation_fuel, inflation_housing, inflation_cpi,
  approval, stability, current_tick,
  governance_data
) VALUES (
  'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
  'Keldoria',
  'Central Alderis',
  'Alderis',
  'c0000000-0001-4000-a000-000000000001',
  'constitutional_monarchy',
  450,
  48,
  'King',
  'Albrecht III',
  'House Veldren',
  'Federal Chancellor',
  'Navy blue field; silver horizontal bar through center; amber 8-ray sunburst in center',
  '#1a2f5a,#c0c8d8,#e8a020',
  'Einheit durch Vernunft',
  'Keldorian Mark',
  'KDM',
  82000000,
  612,
  1800000000.00,
  2430000000.00,
  3820000000.00,
  0.0210, 0.0280, 0.0310, 0.0240,
  0.5600, 0.6500,
  0,
  '{
    "constitution": "The Veldenmoor Compact",
    "constitution_year": 612,
    "parliament_name": "Bundestag der Keldoria",
    "parliament_chambers": "unicameral",
    "advisory_body": "Bundesrat",
    "coalition_threshold": 0.501,
    "governing_coalition": ["KSD", "KGP"],
    "opposition_leader_party": "CCU",
    "regions": ["Veldenmoor Metro", "Rheinlund", "Suedmark", "Ostmark", "Nordsee Coast", "Westmark"],
    "major_issues": ["aging_population", "energy_transition", "industrial_automation", "immigration_integration", "housing_affordability"]
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ECONOMIC SECTORS (Manufacturing-heavy Keldoria)
-- ============================================================================
INSERT INTO economic_sectors (nation_id, name, output, workers, productivity, wages, growth) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Agriculture',   180000000.00,   4500000.00, 1.0500, 18500.00, 0.0130),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Industry',      820000000.00,  16000000.00, 1.3500, 38000.00, 0.0210),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Services',     1420000000.00,  28000000.00, 1.2500, 44000.00, 0.0290),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Energy',        340000000.00,   3200000.00, 1.5500, 52000.00, 0.0380),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Construction',  260000000.00,   5800000.00, 1.1200, 31000.00, 0.0190)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 3. POPULATION GROUPS (Economic simulation - 5 classes)
-- ============================================================================
INSERT INTO population_groups (nation_id, name, size, income, approval, ideology, inflation_sensitivity, unemployment_sensitivity) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Poor',     8200000.00,   9500.00, 0.5000, 'Socialist',       0.9500, 0.9800),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Working', 22000000.00,  28000.00, 0.5700, 'Social Democrat', 0.7500, 0.8500),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Middle',  32000000.00,  52000.00, 0.6000, 'Liberal',         0.5000, 0.4500),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Wealthy',  6500000.00, 180000.00, 0.6500, 'Conservative',    0.2500, 0.1500),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Elite',     820000.00, 650000.00, 0.7200, 'Libertarian',     0.0800, 0.0400)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 4. TAXES (Keldoria - moderate-high tax nation)
-- ============================================================================
INSERT INTO taxes (nation_id, name, rate, revenue) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Income Tax',    0.3200, 0.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Corporate Tax', 0.1900, 0.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Sales Tax',     0.1900, 0.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Property Tax',  0.0180, 0.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Tariffs',       0.0600, 0.00)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 5. BUDGET ITEMS (Keldoria - strong welfare state)
-- ============================================================================
INSERT INTO budget_items (nation_id, name, allocation) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Education',       280000000.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Healthcare',      340000000.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Infrastructure',  190000000.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Welfare',         250000000.00),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Administration',   90000000.00)
ON CONFLICT (nation_id, name) DO NOTHING;

-- ============================================================================
-- 6. PRICES
-- ============================================================================
INSERT INTO prices (nation_id, sector_name, price_index, base_price, inflation_rate) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Agriculture',  1.0000,  12.0000, 0.0210),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Industry',     1.0000,  38.0000, 0.0180),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Services',     1.0000,  65.0000, 0.0290),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Energy',       1.0000,  18.0000, 0.0380),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Construction', 1.0000, 125.0000, 0.0210)
ON CONFLICT (nation_id, sector_name) DO NOTHING;

-- ============================================================================
-- 7. POLITICAL PARTIES (Removed - all parties created by players in multiplayer)
-- ============================================================================


-- ============================================================================
-- 8. VOTER BLOCS (12 blocs for Keldoria)
-- ============================================================================
INSERT INTO voter_blocs (id, nation_id, code, name, population_share, age_profile, primary_ideology, secondary_ideology, income_min, income_max, geography, inflation_sensitivity, unemployment_sensitivity, welfare_dependence, turnout_rate, approval, issue_priorities) VALUES
  (
    'bb000001-0000-4000-a000-000000000001',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'industrial_workers', 'Industrial Workers',
    0.1100, '35-60', 'social_democrat', 'socialist',
    28000, 48000, 'Rheinlund, Westmark, Ostmark',
    0.750, 0.900, 0.350, 0.720, 0.5700,
    '["wages","job_security","healthcare","pension"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000002',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'union_members', 'Union Members',
    0.0800, '40-65', 'socialist', 'social_democrat',
    24000, 42000, 'Industrial regions nationwide',
    0.700, 0.850, 0.300, 0.800, 0.5500,
    '["labor_rights","strike_rights","collective_bargaining","welfare"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000003',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'middle_class_professionals', 'Middle Class Professionals',
    0.1400, '30-55', 'centrist', 'conservative',
    48000, 90000, 'Urban centers nationwide',
    0.550, 0.500, 0.150, 0.750, 0.6100,
    '["fiscal_responsibility","education_quality","housing","rule_of_law"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000004',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'urban_knowledge_workers', 'Urban Knowledge Workers',
    0.0900, '25-45', 'green', 'libertarian',
    55000, 120000, 'Veldenmoor, Nordhafen, Westmark City',
    0.400, 0.300, 0.100, 0.680, 0.6300,
    '["climate","housing","digital_rights","inequality"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000005',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'university_students', 'University Students',
    0.0500, '18-28', 'green', 'socialist',
    6000, 18000, 'University cities',
    0.900, 0.750, 0.500, 0.550, 0.5400,
    '["housing_affordability","tuition","climate","inequality","lgbtq_rights"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000006',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'pensioners_elderly', 'Pensioners & Elderly',
    0.1600, '65+', 'conservative', 'centrist',
    18000, 35000, 'Rural areas, smaller cities, coastal regions',
    0.950, 0.150, 0.600, 0.840, 0.5900,
    '["pension_security","healthcare_access","inflation","public_safety"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000007',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'rural_conservatives', 'Rural Conservatives',
    0.0700, 'All ages, older-skewing', 'conservative', 'nationalist',
    18000, 38000, 'Suedmark, Ostmark, inland regions',
    0.720, 0.600, 0.250, 0.710, 0.5600,
    '["agricultural_subsidies","immigration_control","rural_services","tradition"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000008',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'small_business_owners', 'Small Business Owners',
    0.0600, '35-65', 'libertarian', 'centrist',
    40000, 120000, 'Nationwide',
    0.680, 0.550, 0.100, 0.740, 0.6200,
    '["tax_cuts","deregulation","labor_flexibility","property_rights"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000009',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'large_business_executives', 'Large Business & Executives',
    0.0400, '40-65', 'conservative', 'libertarian',
    120000, 500000, 'Metropolitan centers',
    0.300, 0.150, 0.050, 0.780, 0.6500,
    '["corporate_tax","labor_regulation","trade_policy","rule_of_law"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000010',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'industrial_conglomerates', 'Industrial Conglomerates',
    0.0100, '45-75', 'libertarian', 'conservative',
    500000, 5000000, 'Veldenmoor, Rheinburg',
    0.120, 0.050, 0.010, 0.820, 0.6800,
    '["capital_gains_tax","inheritance","trade","deregulation"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000011',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'immigrant_communities', 'Immigrant Communities',
    0.0700, '20-45', 'social_democrat', 'socialist',
    15000, 35000, 'Urban areas, industrial suburbs',
    0.880, 0.850, 0.550, 0.420, 0.5100,
    '["citizenship_rights","anti_discrimination","housing","healthcare_access"]'::jsonb
  ),
  (
    'bb000001-0000-4000-a000-000000000012',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'unemployed_precariat', 'Unemployed & Precariat',
    0.1200, '18-35 and 55-65', 'socialist', 'nationalist',
    0, 12000, 'Ostmark, deindustrialized cities',
    0.980, 0.990, 0.900, 0.340, 0.4800,
    '["welfare","housing","job_programs","basic_income"]'::jsonb
  )
ON CONFLICT (nation_id, code) DO NOTHING;

-- ============================================================================
-- 9. VOTER BLOC PARTY AFFINITIES (Removed - all parties created by players in multiplayer)
-- ============================================================================


-- ============================================================================
-- 10. STARTER LAWS
-- ============================================================================
INSERT INTO laws (id, nation_id, title, description, status) VALUES
  (
    'ced00001-1111-4111-b111-000000000001',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'Keldoria Industrial Modernization Fund',
    'State-backed grants and tax credits for retooling manufacturing plants with automation-compatible equipment. Target: 15% productivity gain in the industrial sector over 4 years.',
    'passed'
  ),
  (
    'ced00001-1111-4111-b111-000000000002',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'National Healthcare Universal Access Act',
    'Expands healthcare services to all Keldorian residents regardless of employment status. Increases healthcare budget effectiveness by 10% and improves approval among poor and working classes.',
    'passed'
  ),
  (
    'ced00001-1111-4111-b111-000000000003',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'Green Energy Transition Law',
    'Mandates 60% renewable electricity by Year 860 AE. Carbon levy on fossil fuel industries. Funding for wind and solar expansion in Nordsee Coast and Suedmark regions.',
    'passed'
  ),
  (
    'ced00001-1111-4111-b111-000000000004',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'Pension Reform Sustainability Act',
    'Proposes raising the retirement age from 65 to 67 and increasing pension contributions by 2%. Deeply contested - opposed by unions and ULA.',
    'proposed'
  ),
  (
    'ced00001-1111-4111-b111-000000000005',
    'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
    'Digital Infrastructure Investment Program',
    'KDM 180 billion fund for rural broadband, 5G rollout, and public digital services modernization over 6 years.',
    'proposed'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO law_effects (id, law_id, target_type, target_name, parameter_name, modifier_type, modifier_value) VALUES
  ('cde00001-2222-4222-b222-000000000001', 'ced00001-1111-4111-b111-000000000001', 'sector', 'Industry', 'productivity', 'multiplier', 1.0900),
  ('cde00001-2222-4222-b222-000000000002', 'ced00001-1111-4111-b111-000000000002', 'population_group', 'Poor', 'approval', 'additive', 0.0600),
  ('cde00001-2222-4222-b222-000000000003', 'ced00001-1111-4111-b111-000000000002', 'population_group', 'Working', 'approval', 'additive', 0.0350),
  ('cde00001-2222-4222-b222-000000000004', 'ced00001-1111-4111-b111-000000000003', 'sector', 'Energy', 'growth', 'additive', 0.0200),
  ('cde00001-2222-4222-b222-000000000005', 'ced00001-1111-4111-b111-000000000003', 'sector', 'Energy', 'productivity', 'multiplier', 1.0500)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. NATION TEMPLATE FOR KELDORIA
-- ============================================================================
INSERT INTO nation_templates (
  id, name, description,
  continent_id, governance_system,
  parliament_seats, election_cycle_months,
  monarch_title, monarch_name, monarch_family,
  head_of_government_title,
  flag_description, flag_colors, motto,
  currency_name, currency_code,
  population_size,
  treasury, debt, gdp,
  inflation_food, inflation_fuel, inflation_housing, inflation_cpi,
  approval, stability, template_data
) VALUES (
  'b1a2c3d4-e5f6-0000-0000-000000000001',
  'Keldoria',
  'Kingdom of Keldoria - Constitutional Monarchy, manufacturing powerhouse of Alderis. 82M population, $3.82T GDP, strong welfare state, coalition politics.',
  'c0000000-0001-4000-a000-000000000001',
  'constitutional_monarchy',
  450, 48,
  'King', 'Albrecht III', 'House Veldren',
  'Federal Chancellor',
  'Navy blue field; silver horizontal bar through center; amber 8-ray sunburst in center',
  '#1a2f5a,#c0c8d8,#e8a020',
  'Einheit durch Vernunft',
  'Keldorian Mark', 'KDM',
  82000000,
  1800000000.00, 2430000000.00, 3820000000.00,
  0.0210, 0.0280, 0.0310, 0.0240,
  0.5600, 0.6500,
  '{
    "sectors": [
      {"name": "Agriculture",  "output": 180000000,  "workers": 4500000,  "productivity": 1.05, "wages": 18500, "growth": 0.013},
      {"name": "Industry",     "output": 820000000,  "workers": 16000000, "productivity": 1.35, "wages": 38000, "growth": 0.021},
      {"name": "Services",     "output": 1420000000, "workers": 28000000, "productivity": 1.25, "wages": 44000, "growth": 0.029},
      {"name": "Energy",       "output": 340000000,  "workers": 3200000,  "productivity": 1.55, "wages": 52000, "growth": 0.038},
      {"name": "Construction", "output": 260000000,  "workers": 5800000,  "productivity": 1.12, "wages": 31000, "growth": 0.019}
    ]
  }'::jsonb
) ON CONFLICT (name) DO NOTHING;

COMMIT;

