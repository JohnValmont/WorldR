-- WORLDr Database Migration: 0009 — Seed Global Simulation Parameters
-- Target Database: PostgreSQL 13+
-- Seeds the 'parameters' table with all simulation constants used by the tick engine.
-- Uses INSERT ... ON CONFLICT DO NOTHING to be fully idempotent (safe to re-run).

BEGIN;

INSERT INTO parameters (category, name, value, description) VALUES

  -- ===== ECONOMY =====
  ('simulation', 'tax_elasticity',             0.15,   'Sensitivity of sector outputs to corporate/sales tax increases'),
  ('simulation', 'recession_trigger_threshold',-0.01,  'GDP contraction rate that triggers recession risk buildup'),
  ('simulation', 'recession_buildup_speed',    0.25,   'Speed at which recession pressure accumulates per tick'),
  ('simulation', 'recession_recovery_speed',   0.15,   'Speed at which recession pressure recovers per tick'),

  -- ===== INFLATION =====
  ('simulation', 'inflation_damping',          0.80,   'Global damping factor applied to monthly price index updates'),

  -- ===== UNEMPLOYMENT =====
  ('simulation', 'unemployment_base_rate',     0.051,  'Natural unemployment rate under optimal economic conditions'),

  -- ===== WELFARE =====
  ('simulation', 'welfare_efficiency',         0.88,   'Efficiency of welfare spending transfer (loss to bureaucracy)'),

  -- ===== APPROVAL =====
  ('simulation', 'approval_decay',             0.99,   'Monthly approval decay multiplier (voter fatigue)'),

  -- ===== DEBT / BANKING =====
  ('simulation', 'debt_interest_rate',         0.042,  'Baseline annual interest rate applied to national debt'),
  ('simulation', 'banking_stress_threshold',   0.80,   'Debt-to-GDP ratio that triggers banking stress buildup'),
  ('simulation', 'banking_buildup_speed',      0.15,   'Speed at which banking stress accumulates per tick'),
  ('simulation', 'banking_recovery_speed',     0.10,   'Speed at which banking stress recovers per tick'),

  -- ===== PROTESTS =====
  ('simulation', 'protest_approval_threshold', 0.40,   'Approval level below which protest pressure begins to build'),
  ('simulation', 'protest_stability_threshold',0.45,   'Stability level below which protest pressure begins to build'),
  ('simulation', 'protest_buildup_speed',      0.20,   'Speed at which protest pressure accumulates per tick'),
  ('simulation', 'protest_repression_impact',  0.30,   'Impact of repression policy on reducing protest pressure'),
  ('simulation', 'protest_negotiation_impact', 0.40,   'Impact of negotiation policy on reducing protest pressure'),

  -- ===== STRIKES =====
  ('simulation', 'strike_approval_threshold',  0.35,   'Approval level below which strike pressure begins to build'),
  ('simulation', 'strike_buildup_speed',       0.20,   'Speed at which strike pressure accumulates per tick'),

  -- ===== INSTITUTIONAL TRUST =====
  ('simulation', 'institutional_trust_threshold', 0.35, 'Approval level below which institutional trust erodes'),
  ('simulation', 'institutional_buildup_speed',   0.15, 'Speed at which institutional distrust accumulates per tick'),

  -- ===== LEGITIMACY =====
  ('simulation', 'legitimacy_threshold',       0.40,   'Stability level below which government legitimacy erodes'),
  ('simulation', 'legitimacy_buildup_speed',   0.20,   'Speed at which legitimacy crisis accumulates per tick'),

  -- ===== CORRUPTION =====
  ('simulation', 'scandal_threshold',          0.50,   'Corruption level above which scandals become likely'),
  ('simulation', 'scandal_buildup_speed',      0.25,   'Speed at which scandal pressure accumulates per tick'),
  ('simulation', 'corruption_base_leakage',    0.10,   'Baseline tax revenue lost to corruption each tick'),
  ('simulation', 'corruption_decay_rate',      0.95,   'Natural corruption decay rate per tick (without interventions)'),
  ('simulation', 'corruption_growth_factor',   0.05,   'Rate at which corruption grows when unchecked'),
  ('simulation', 'corruption_inflation_impact',0.20,   'Amount inflation amplifies corruption leakage'),
  ('simulation', 'corruption_welfare_impact', -0.10,   'Welfare spending effect on corruption (negative = reduces it)'),
  ('simulation', 'corruption_anticorruption_impact', 0.40, 'Effectiveness of anti-corruption budget allocation'),
  ('simulation', 'corruption_tax_evasion_impact',    0.10, 'Fraction of tax revenue lost to evasion per corruption unit'),

  -- ===== SUPPLY SHOCKS =====
  ('simulation', 'supply_shock_threshold',    -0.05,   'Sector growth rate below which a supply shock may trigger'),
  ('simulation', 'supply_shock_buildup_speed', 0.30,   'Speed at which supply shock pressure accumulates per tick'),

  -- ===== MEDIA =====
  ('simulation', 'media_scandal_multiplier',   1.50,   'Multiplier applied to approval loss when a scandal breaks'),
  ('simulation', 'media_sentiment_damping',    0.85,   'Damping factor for media sentiment returning to neutral'),
  ('simulation', 'media_opposition_strength',  0.30,   'Baseline strength of opposition party media presence'),
  ('simulation', 'media_misinfo_pressure',     0.05,   'Baseline misinformation pressure reducing government trust'),
  ('simulation', 'media_influence',            0.40,   'Overall media influence weighting on public approval'),

  -- ===== POLICING =====
  ('simulation', 'policing_brutality_base',           0.02,  'Baseline police brutality risk per tick'),
  ('simulation', 'policing_brutality_budget_impact',  0.15,  'How much under-funding increases brutality risk'),
  ('simulation', 'policing_brutality_unrest_impact',  0.20,  'How much civil unrest increases brutality risk'),
  ('simulation', 'policing_crime_response_base',      5.00,  'Base crime response rate (arbitrary index)'),
  ('simulation', 'policing_effectiveness_base',       0.80,  'Baseline police operational effectiveness (0-1)'),
  ('simulation', 'policing_public_safety_base',       0.80,  'Baseline public safety index (0-1)'),

  -- ===== ADMINISTRATION / INSTITUTIONS =====
  ('simulation', 'target_admin_gdp_ratio',     0.05,   'Target fraction of GDP spent on administration'),
  ('simulation', 'courts_share',               0.15,   'Fraction of admin budget allocated to courts'),
  ('simulation', 'tax_authority_share',        0.15,   'Fraction of admin budget allocated to tax authority'),
  ('simulation', 'civil_service_share',        0.25,   'Fraction of admin budget allocated to civil service'),
  ('simulation', 'anticorruption_share',       0.05,   'Fraction of admin budget allocated to anti-corruption'),
  ('simulation', 'police_share',               0.25,   'Fraction of admin budget allocated to police'),
  ('simulation', 'election_commission_share',  0.05,   'Fraction of admin budget allocated to election commission'),
  ('simulation', 'statistics_office_share',    0.05,   'Fraction of admin budget allocated to statistics office'),
  ('simulation', 'regulatory_agencies_share',  0.05,   'Fraction of admin budget allocated to regulatory agencies'),

  -- ===== ELECTIONS =====
  ('simulation', 'election_cooldown',          48,     'Number of ticks between scheduled elections')

ON CONFLICT (category, name) DO NOTHING;

COMMIT;
