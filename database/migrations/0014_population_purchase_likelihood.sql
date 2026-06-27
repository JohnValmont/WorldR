-- WORLDr Migration 0014: Population Purchase Likelihood
-- Replaces generic competition multipliers with finite demographic demand constraints.

-- ─── 1. Market Profile Configuration Extensions ──────────────────────────────
ALTER TABLE manufacturing_region_markets
  ADD COLUMN IF NOT EXISTS purchase_need_intensity     NUMERIC(5,4)  NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS vehicle_price_comfort_ratio NUMERIC(5,4)  NOT NULL DEFAULT 0.8000,
  -- Target Segment Preferences
  ADD COLUMN IF NOT EXISTS preference_economy          NUMERIC(5,3)  NOT NULL DEFAULT 0.333,
  ADD COLUMN IF NOT EXISTS preference_standard         NUMERIC(5,3)  NOT NULL DEFAULT 0.333,
  ADD COLUMN IF NOT EXISTS preference_premium          NUMERIC(5,3)  NOT NULL DEFAULT 0.334,
  -- Dynamic Attribute Weights JSON (reliability, performance, fuel_efficiency, safety, appeal, cargo_utility)
  ADD COLUMN IF NOT EXISTS vehicle_attribute_weights   JSONB         NOT NULL DEFAULT '{"reliability": 1.0, "performance": 1.0, "fuel_efficiency": 1.0, "safety": 1.0, "appeal": 1.0, "cargo_utility": 1.0}'::jsonb;

-- ─── 2. Sales Results History Extensions ─────────────────────────────────────
ALTER TABLE manufacturing_sales_results
  ADD COLUMN IF NOT EXISTS addressable_households        INT,
  ADD COLUMN IF NOT EXISTS market_purchase_capacity      INT,
  ADD COLUMN IF NOT EXISTS affordability_multiplier      NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS vehicle_market_fit_multiplier NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS awareness_multiplier          NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS trust_multiplier              NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS distribution_multiplier       NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS marketing_multiplier          NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS raw_buyer_interest          NUMERIC(19,4),
  ADD COLUMN IF NOT EXISTS final_assigned_demand         INT,
  ADD COLUMN IF NOT EXISTS main_reason_code              VARCHAR(100);
