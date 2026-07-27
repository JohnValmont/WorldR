-- Migration 0083: Fix manufacturing_market_brand_arc_results unique constraint
-- BUG: The unique key was (company_id, region_market_id, world_month) with NO world_year.
-- This meant Year 6 Month 1 brand arc records were silently blocked by Year 5 Month 1 records.
-- The existingArcResult check in settleForCompany() found Y5M1 and skipped Y6M1 entirely,
-- so brand awareness NEVER updated past Year 5 and all companies' awareness went stale.

-- Step 1: Add world_year column
ALTER TABLE manufacturing_market_brand_arc_results
  ADD COLUMN IF NOT EXISTS world_year INTEGER;

-- Step 2: Back-fill world_year = 0 for all existing rows (historical, pre-fix data)
UPDATE manufacturing_market_brand_arc_results
  SET world_year = 0
  WHERE world_year IS NULL;

-- Step 3: Make world_year NOT NULL with default 0
ALTER TABLE manufacturing_market_brand_arc_results
  ALTER COLUMN world_year SET NOT NULL;

ALTER TABLE manufacturing_market_brand_arc_results
  ALTER COLUMN world_year SET DEFAULT 0;

-- Step 4: Drop old constraint missing world_year
ALTER TABLE manufacturing_market_brand_arc_results
  DROP CONSTRAINT IF EXISTS unique_brand_arc_result;

-- Step 5: Recreate with world_year included
ALTER TABLE manufacturing_market_brand_arc_results
  ADD CONSTRAINT unique_brand_arc_result
  UNIQUE (company_id, region_market_id, world_year, world_month);
