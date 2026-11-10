-- 0097_politics_v2.sql — Phase 2 politics rebuild (see docs/REVIVAL_PLAN.md).
--
-- 1. Districts: each constituency now elects several MPs (district magnitude)
--    and has its own voter mix. The 20 named districts and their numbers live in
--    backend/src/api/constants/nations.ts and are synced by the server
--    (syncNationDistricts), so this file only adds the columns.
--    Filler constituencies the old code created ("<State> Division N", all with
--    identical voters) are switched off by that sync, not deleted, so old seat
--    records stay valid.
-- 2. pol_cabinet_posts: ministers appointed by the Premier.
-- 3. pol_poll_snapshots: monthly opinion polls and government approval.
-- 4. pol_bills: who tabled a bill (minister backing), when it was voted on and
--    the final seat tally (yea/nay), for the bill history and NPC cooldowns.
--
-- Idempotent (IF NOT EXISTS everywhere).

BEGIN;

ALTER TABLE pol_constituencies
  ADD COLUMN IF NOT EXISTS region          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS seats           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS segment_weights JSONB   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS pol_cabinet_posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id              UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  post_key              VARCHAR(30) NOT NULL,
  party_id              UUID REFERENCES pol_parties(id) ON DELETE SET NULL,
  holder_character_id   UUID REFERENCES characters(id) ON DELETE SET NULL,
  npc_name              VARCHAR(100),
  appointed_arc         INTEGER NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (state_id, post_key)
);

CREATE TABLE IF NOT EXISTS pol_poll_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id         UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  arc              INTEGER NOT NULL,
  party_id         UUID REFERENCES pol_parties(id) ON DELETE CASCADE,
  vote_share       NUMERIC(6,4),
  projected_seats  INTEGER,
  approval         NUMERIC(5,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One row per party per month, plus one row with party_id NULL for government approval.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pol_poll_snapshots_party
  ON pol_poll_snapshots (state_id, arc, party_id) WHERE party_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pol_poll_snapshots_gov
  ON pol_poll_snapshots (state_id, arc) WHERE party_id IS NULL;

ALTER TABLE pol_bills
  ADD COLUMN IF NOT EXISTS tabled_by_character_id UUID,
  ADD COLUMN IF NOT EXISTS resolved_arc INTEGER,
  ADD COLUMN IF NOT EXISTS yea_seats INTEGER,
  ADD COLUMN IF NOT EXISTS nay_seats INTEGER;

-- 5. Party popularity becomes a decimal. Scandal and media code apply
--    fractional changes (e.g. -0.3/month); with an INTEGER column that UPDATE
--    threw, and because each nation's politics month runs in one transaction,
--    the WHOLE month was rolled back: no election, no bill votes, no events,
--    for as long as any scandal stayed active.
ALTER TABLE pol_parties
  ALTER COLUMN popularity TYPE NUMERIC(6,2) USING popularity::numeric;

COMMIT;
