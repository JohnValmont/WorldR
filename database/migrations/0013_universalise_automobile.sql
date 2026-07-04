-- WORLDr Migration 0013: Universalise Automobile Manufacturing
-- Removes all Drennia-specific hardcodes from backend logic.
-- All country-specific automobile constants move to manufacturing_country_auto_config.
-- Market profile placeholder columns added for future Population Purchase Likelihood.

-- ─── 1. Country Automobile Configuration ────────────────────────────────────
CREATE TABLE IF NOT EXISTS manufacturing_country_auto_config (
  country_id VARCHAR(50) PRIMARY KEY REFERENCES countries(id) ON DELETE CASCADE,

  -- Vehicle development costs
  base_vehicle_dev_cost         NUMERIC(19,4) NOT NULL DEFAULT 150000,
  facelift_cost_fraction        NUMERIC(5,4)  NOT NULL DEFAULT 0.6000,

  -- Small Workshop → Expanded Workshop upgrade
  expansion_cost                NUMERIC(19,4) NOT NULL DEFAULT 500000,
  expansion_duration_months       INT           NOT NULL DEFAULT 2,
  expanded_capacity_per_month     INT           NOT NULL DEFAULT 200,
  expanded_max_lines            INT           NOT NULL DEFAULT 2,
  expanded_lease_cost_per_month   NUMERIC(19,4) NOT NULL DEFAULT 45000,
  expanded_maintenance_per_month  NUMERIC(19,4) NOT NULL DEFAULT 15000,
  expanded_worker_capacity      INT           NOT NULL DEFAULT 80,

  -- Operating costs
  storage_cost_per_unit_per_month NUMERIC(10,4) NOT NULL DEFAULT 150,

  -- Marketing spend per Month per active market
  marketing_cost_local          NUMERIC(19,4) NOT NULL DEFAULT 3500,
  marketing_cost_regional       NUMERIC(19,4) NOT NULL DEFAULT 12000,
  marketing_cost_national       NUMERIC(19,4) NOT NULL DEFAULT 35000,

  -- Starter company rules
  starter_capital_min           NUMERIC(19,4) NOT NULL DEFAULT 50000,

  -- Placeholder: future Components & Procurement price index
  baseline_component_price_idx  NUMERIC(5,3)  NOT NULL DEFAULT 1.000,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─── 2. Market Profile Extensions ───────────────────────────────────────────
-- Placeholder columns for future Population Purchase Likelihood system.
-- Not used in any calculations yet — values are defaults only.
ALTER TABLE manufacturing_region_markets
  ADD COLUMN IF NOT EXISTS income_tier                 VARCHAR(50)   NOT NULL DEFAULT 'mid',
  ADD COLUMN IF NOT EXISTS avg_household_size          NUMERIC(5,2)  NOT NULL DEFAULT 2.80,
  ADD COLUMN IF NOT EXISTS vehicle_ownership_rate      NUMERIC(5,4)  NOT NULL DEFAULT 0.3500,
  ADD COLUMN IF NOT EXISTS baseline_replacement_rate   NUMERIC(5,4)  NOT NULL DEFAULT 0.0800,
  ADD COLUMN IF NOT EXISTS first_time_buyer_rate       NUMERIC(5,4)  NOT NULL DEFAULT 0.1500,
  ADD COLUMN IF NOT EXISTS price_sensitivity           NUMERIC(5,4)  NOT NULL DEFAULT 0.7000,
  ADD COLUMN IF NOT EXISTS brand_awareness_sensitivity NUMERIC(5,4)  NOT NULL DEFAULT 0.5000,
  ADD COLUMN IF NOT EXISTS brand_trust_sensitivity     NUMERIC(5,4)  NOT NULL DEFAULT 0.4000;

-- ─── 3. Backfill income_tier from existing market_tier ───────────────────────
UPDATE manufacturing_region_markets
SET income_tier = market_tier
WHERE income_tier = 'mid'
  AND market_tier IS NOT NULL;

-- ─── 4. State name join support ──────────────────────────────────────────────
-- manufacturing_region_markets already has state_id FK to states.
-- This index ensures state joins are efficient.
CREATE INDEX IF NOT EXISTS idx_mrm_state_id ON manufacturing_region_markets(state_id);
CREATE INDEX IF NOT EXISTS idx_mrm_country_id ON manufacturing_region_markets(country_id);
