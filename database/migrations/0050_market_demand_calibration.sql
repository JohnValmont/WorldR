-- WORLDr Migration 0050: Market Demand Calibration
-- Tiers the market demand parameters by income level so top-tier states
-- generate meaningfully higher purchase capacity than emerging states.
-- Idempotent — safe to re-run.

BEGIN;

-- ─── 1. High-income markets (average_income > 40000) ─────────────────────────
-- Wealthier populations replace cars more often and have stronger purchasing power.
UPDATE manufacturing_region_markets
SET
  baseline_replacement_rate = 0.006,   -- 0.6%/month ≈ cars replaced every ~14 years
  first_time_buyer_rate     = 0.0010,  -- 0.1%/month first-time buyers
  economic_multiplier       = 1.50,    -- top-tier boost
  distribution_strength     = 0.85,    -- well-developed dealer/logistics networks
  purchase_need_intensity   = 1.20     -- slightly higher urgency (commuter culture)
WHERE average_income > 40000;

-- ─── 2. Mid-income markets (25000 – 40000) ────────────────────────────────────
UPDATE manufacturing_region_markets
SET
  baseline_replacement_rate = 0.004,
  first_time_buyer_rate     = 0.0007,
  economic_multiplier       = 1.20,
  distribution_strength     = 0.75,
  purchase_need_intensity   = 1.00
WHERE average_income BETWEEN 25000 AND 40000;

-- ─── 3. Budget / emerging markets (< 25000) ───────────────────────────────────
-- Lower replacement, more first-timers; price sensitivity is highest here.
UPDATE manufacturing_region_markets
SET
  baseline_replacement_rate = 0.002,
  first_time_buyer_rate     = 0.0015,  -- higher first-time share
  economic_multiplier       = 0.90,
  distribution_strength     = 0.60,
  purchase_need_intensity   = 0.85
WHERE average_income < 25000;

-- ─── 4. Fallback: markets with no income data ────────────────────────────────
-- Set safe conservative defaults so no market is left with 0 capacity.
UPDATE manufacturing_region_markets
SET
  baseline_replacement_rate = 0.003,
  first_time_buyer_rate     = 0.0005,
  economic_multiplier       = 1.00,
  distribution_strength     = 0.70,
  purchase_need_intensity   = 1.00
WHERE average_income IS NULL OR average_income = 0;

COMMIT;
