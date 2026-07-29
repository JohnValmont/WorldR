BEGIN;

INSERT INTO states (id, country_id, name) VALUES
('drennia-kingscrown', 'drennia', 'Kingscrown'),
('drennia-oakhaven', 'drennia', 'Oakhaven'),
('drennia-north', 'drennia', 'North Drennia'),
('drennia-silvercoast', 'drennia', 'Silvercoast')
ON CONFLICT (id) DO NOTHING;

INSERT INTO manufacturing_region_markets (
  id, world_instance_id, country_id, state_id, name,
  population, average_income, economic_multiplier,
  preference_compact, preference_sedan, preference_utility_van,
  status, competition_level, market_tier, distribution_strength,
  income_tier, avg_household_size, vehicle_ownership_rate,
  baseline_replacement_rate, first_time_buyer_rate,
  price_sensitivity, brand_awareness_sensitivity, brand_trust_sensitivity,
  purchase_need_intensity, vehicle_price_comfort_ratio,
  preference_economy, preference_standard, preference_premium,
  vehicle_attribute_weights
) VALUES 
(
  'kingscrown-metropolitan-market', 'pre-alpha-world-1', 'drennia', 'drennia-kingscrown', 'Kingscrown Metropolitan Area',
  3150000, 85000, 1.3,
  0.2, 0.7, 0.1,
  'active', 'high', 'high', 0.9,
  'high', 2.2, 0.4,
  0.004, 0.0006,
  0.5, 0.8, 0.7,
  1.1, 0.9,
  0.1, 0.4, 0.5,
  '{"appeal": 1.5, "safety": 1.4, "performance": 1.3, "reliability": 1.0, "cargo_utility": 0.5, "fuel_efficiency": 0.8}'::jsonb
),
(
  'oakhaven-suburban-market', 'pre-alpha-world-1', 'drennia', 'drennia-oakhaven', 'Oakhaven Suburban Belt',
  2400000, 62000, 1.1,
  0.3, 0.4, 0.3,
  'active', 'medium', 'mid', 0.8,
  'mid', 2.8, 0.45,
  0.0035, 0.0005,
  0.7, 0.6, 0.6,
  1.0, 0.8,
  0.3, 0.6, 0.1,
  '{"appeal": 1.1, "safety": 1.3, "performance": 1.0, "reliability": 1.4, "cargo_utility": 1.2, "fuel_efficiency": 1.2}'::jsonb
),
(
  'north-drennia-industrial-market', 'pre-alpha-world-1', 'drennia', 'drennia-north', 'North Drennia Industrial Expanse',
  1500000, 41000, 0.9,
  0.4, 0.2, 0.4,
  'active', 'medium', 'low', 0.6,
  'low', 2.6, 0.3,
  0.0025, 0.0004,
  0.9, 0.4, 0.4,
  0.9, 0.7,
  0.6, 0.3, 0.1,
  '{"appeal": 0.7, "safety": 1.0, "performance": 0.8, "reliability": 1.5, "cargo_utility": 1.5, "fuel_efficiency": 1.3}'::jsonb
),
(
  'silvercoast-scenic-market', 'pre-alpha-world-1', 'drennia', 'drennia-silvercoast', 'Silvercoast Scenic District',
  709566, 58000, 1.0,
  0.6, 0.3, 0.1,
  'active', 'low', 'mid', 0.5,
  'mid', 2.1, 0.35,
  0.003, 0.0005,
  0.6, 0.7, 0.6,
  1.0, 0.8,
  0.2, 0.4, 0.4,
  '{"appeal": 1.4, "safety": 1.1, "performance": 1.1, "reliability": 1.2, "cargo_utility": 0.6, "fuel_efficiency": 1.1}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
