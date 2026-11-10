-- 0091_consolidate_boot_patches.sql
--
-- These one-off fixes used to run from backend/src/server.ts on EVERY boot.
-- They now run exactly once, through the normal migration runner.
-- Every statement is idempotent, so this is safe on a database where the
-- boot-time versions have already run (production) and on a fresh database.

-- 1. characters: one live character per user per world, but deleted
--    characters must not block creating a new one (partial unique index).
DO $$
DECLARE
  idx_def TEXT;
BEGIN
  SELECT indexdef INTO idx_def
  FROM pg_indexes
  WHERE schemaname = current_schema()
    AND indexname = 'unique_character_per_user_world';

  IF idx_def IS NULL OR position('WHERE' IN upper(idx_def)) = 0 THEN
    ALTER TABLE characters DROP CONSTRAINT IF EXISTS unique_character_per_user_world CASCADE;
    DROP INDEX IF EXISTS unique_character_per_user_world;
    CREATE UNIQUE INDEX unique_character_per_user_world
      ON characters (user_id, world_instance_id)
      WHERE status != 'deleted';
  END IF;
END $$;

-- 2. ipo_indications: companies (not just people) can bid in IPOs.
DO $$
BEGIN
  IF to_regclass('ipo_indications') IS NOT NULL THEN
    ALTER TABLE ipo_indications
      ADD COLUMN IF NOT EXISTS bidding_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. One-time $10M compensation to Aldrich Automobiles. Keeps the original
--    guard table so it can never be paid twice.
CREATE TABLE IF NOT EXISTS _aldrich_10m_patch (applied BOOLEAN);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _aldrich_10m_patch)
     AND EXISTS (SELECT 1 FROM companies WHERE name = 'Aldrich Automobiles') THEN
    UPDATE company_finances
       SET available_cash = available_cash + 10000000
     WHERE company_id = (SELECT id FROM companies WHERE name = 'Aldrich Automobiles' LIMIT 1);
    INSERT INTO _aldrich_10m_patch (applied) VALUES (true);
  END IF;
END $$;

-- 4. Vehicles wrongly stamped as "Year 1" by an old falsy-zero bug go back to Year 0.
DO $$
BEGIN
  IF to_regclass('manufacturing_vehicle_models') IS NOT NULL THEN
    UPDATE manufacturing_vehicle_models
       SET created_at_world_year = 0,
           development_started_at_year = 0,
           development_completes_at_year = 0,
           stage_engineering_completes_year = 0,
           stage_prototype_completes_year = 0,
           stage_testing_completes_year = 0
     WHERE created_at_world_year = 1;
  END IF;
END $$;
