-- UP
BEGIN;

ALTER TABLE pol_parties
  ADD COLUMN IF NOT EXISTS doctrine_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tenet_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS doctrine_drift JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS doctrine_drift_arc INTEGER;

-- Nearest-match existing NPC parties to a doctrine based on their stored platform JSONB.
-- Mapping is deterministic: computed offline and hard-coded here so the migration is idempotent.
-- forge_accord  -> taxation:20, labour:80, investment:80, trade:20, stability:50
-- the_ledger    -> taxation:80, labour:20, investment:20, trade:80, stability:80
-- the_homestead -> taxation:50, labour:50, investment:20, trade:20, stability:80
-- the_commons   -> taxation:20, labour:80, investment:80, trade:50, stability:20
-- the_vanguard  -> taxation:50, labour:50, investment:50, trade:80, stability:20
-- the_compact   -> taxation:50, labour:50, investment:50, trade:50, stability:50

-- For existing parties, use a simple nearest-match stored procedure approach:
-- We update each party to the doctrine whose platform minimises L1 distance.
UPDATE pol_parties
SET doctrine_id = CASE
  WHEN (
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) +
    ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 20) +
    ABS((platform->>'stability')::numeric - 50)
  ) = LEAST(
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 50),
    ABS((platform->>'taxation')::numeric - 80) + ABS((platform->>'labour')::numeric - 20) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 50)
  )
  THEN 'forge_accord'
  WHEN (
    ABS((platform->>'taxation')::numeric - 80) + ABS((platform->>'labour')::numeric - 20) +
    ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 80) +
    ABS((platform->>'stability')::numeric - 80)
  ) = LEAST(
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 50),
    ABS((platform->>'taxation')::numeric - 80) + ABS((platform->>'labour')::numeric - 20) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 50)
  )
  THEN 'the_ledger'
  WHEN (
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) +
    ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 20) +
    ABS((platform->>'stability')::numeric - 80)
  ) = LEAST(
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 50),
    ABS((platform->>'taxation')::numeric - 80) + ABS((platform->>'labour')::numeric - 20) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 50)
  )
  THEN 'the_homestead'
  WHEN (
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) +
    ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 50) +
    ABS((platform->>'stability')::numeric - 20)
  ) = LEAST(
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 50),
    ABS((platform->>'taxation')::numeric - 80) + ABS((platform->>'labour')::numeric - 20) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 50)
  )
  THEN 'the_commons'
  WHEN (
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) +
    ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 80) +
    ABS((platform->>'stability')::numeric - 20)
  ) = LEAST(
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 50),
    ABS((platform->>'taxation')::numeric - 80) + ABS((platform->>'labour')::numeric - 20) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 20) + ABS((platform->>'trade')::numeric - 20) + ABS((platform->>'stability')::numeric - 80),
    ABS((platform->>'taxation')::numeric - 20) + ABS((platform->>'labour')::numeric - 80) + ABS((platform->>'investment')::numeric - 80) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 80) + ABS((platform->>'stability')::numeric - 20),
    ABS((platform->>'taxation')::numeric - 50) + ABS((platform->>'labour')::numeric - 50) + ABS((platform->>'investment')::numeric - 50) + ABS((platform->>'trade')::numeric - 50) + ABS((platform->>'stability')::numeric - 50)
  )
  THEN 'the_vanguard'
  ELSE 'the_compact'
END
WHERE doctrine_id IS NULL;

COMMIT;

-- DOWN
BEGIN;
ALTER TABLE pol_parties
  DROP COLUMN IF EXISTS doctrine_id,
  DROP COLUMN IF EXISTS tenet_id,
  DROP COLUMN IF EXISTS doctrine_drift,
  DROP COLUMN IF EXISTS doctrine_drift_arc;
COMMIT;
