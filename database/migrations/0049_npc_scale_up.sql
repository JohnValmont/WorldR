-- WORLDr Migration 0049: NPC Scale-Up
-- Boosts NPC factory capacity, production targets, and spreads allocations
-- to every region market (not just the first one).
-- Idempotent — safe to re-run.

BEGIN;

-- ─── 1. Scale up NPC factory capacities ───────────────────────────────────────
-- Existing NPCs were seeded with tiny 500-unit workshops. After 2 years of
-- operation, they should have grown to realistic mid-size production facilities.
UPDATE manufacturing_factories
SET    capacity_per_month = 1500
WHERE  company_id IN (SELECT id FROM companies WHERE is_npc = TRUE AND status = 'active')
  AND  status = 'active';

-- ─── 2. Scale up NPC production line targets ──────────────────────────────────
-- Raise targets so NPCs actually try to fill the larger factory.
UPDATE manufacturing_production_lines
SET    target_units_per_month = 600
WHERE  company_id IN (SELECT id FROM companies WHERE is_npc = TRUE AND status = 'active')
  AND  status = 'active';

-- ─── 3. Spread NPC allocations to ALL region markets ─────────────────────────
-- This is the critical fix: NPCs were only in 1 market. Now they compete
-- everywhere, just like a player can.
-- 150 units per market × N markets; the NPC brain will tune this over time.
INSERT INTO manufacturing_market_allocations
  (company_id, world_instance_id, vehicle_model_id, region_market_id, units_allocated, marketing_tier)
SELECT
  m.company_id,
  m.world_instance_id,
  m.id                AS vehicle_model_id,
  rm.id               AS region_market_id,
  150                 AS units_allocated,
  'regional'          AS marketing_tier
FROM   manufacturing_vehicle_models m
JOIN   companies c ON c.id = m.company_id
CROSS  JOIN manufacturing_region_markets rm
WHERE  c.is_npc = TRUE
  AND  m.development_status = 'launched'
  AND  m.status = 'active'
ON CONFLICT (company_id, vehicle_model_id, region_market_id) DO NOTHING;

-- ─── 4. Ensure NPC brand awareness exists for all new markets ─────────────────
-- Without brand awareness rows the awarenessMult stays at 0.35 floor; inserting
-- a modest starting value lets the brain build it up normally.
INSERT INTO manufacturing_brand_awareness
  (company_id, region_market_id, awareness, reputation)
SELECT
  c.id  AS company_id,
  rm.id AS region_market_id,
  20    AS awareness,   -- low but non-zero so NPC isn't invisible immediately
  40    AS reputation
FROM   companies c
CROSS  JOIN manufacturing_region_markets rm
WHERE  c.is_npc = TRUE
  AND  c.status = 'active'
ON CONFLICT (company_id, region_market_id) DO NOTHING;

COMMIT;
