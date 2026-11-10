-- 0096_politics_schema_backfill.sql
--
-- Politics tables/columns the code uses that only ever existed in
-- backend/database/migrations/ (a folder that does NOT run automatically):
--   * 0020_national_elections.sql -> pol_constituencies + constituency_id columns
--   * 0090_bill_coercion.sql      -> bribery/blackmail audit table and columns
-- Production most likely had these applied by hand. On a fresh database they
-- were missing, so no election could ever produce seats.
--
-- Everything is IF NOT EXISTS: a no-op wherever they already exist.

BEGIN;

CREATE TABLE IF NOT EXISTS pol_constituencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    population INTEGER NOT NULL DEFAULT 120000,
    registered_voters INTEGER NOT NULL DEFAULT 80000
);

ALTER TABLE pol_candidates
  ADD COLUMN IF NOT EXISTS constituency_id UUID REFERENCES pol_constituencies(id) ON DELETE CASCADE;
ALTER TABLE pol_council_seats
  ADD COLUMN IF NOT EXISTS constituency_id UUID REFERENCES pol_constituencies(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS pol_bill_coercion_actions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id           UUID         NOT NULL REFERENCES pol_bills(id) ON DELETE CASCADE,
  actor_char_id     UUID         NOT NULL REFERENCES characters(id),
  target_char_id    UUID         NOT NULL REFERENCES characters(id),
  action_type       VARCHAR(20)  NOT NULL CHECK (action_type IN ('bribe', 'blackmail')),
  scandal_id        UUID         REFERENCES pol_scandals(id),
  pc_cost           INTEGER      NOT NULL,
  arc               INTEGER      NOT NULL,
  vote_forced       VARCHAR(5)   NOT NULL CHECK (vote_forced IN ('yea', 'nay')),
  discovered        BOOLEAN      NOT NULL DEFAULT FALSE,
  discovered_arc    INTEGER,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_bill      ON pol_bill_coercion_actions(bill_id);
CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_actor     ON pol_bill_coercion_actions(actor_char_id);
CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_actor_arc ON pol_bill_coercion_actions(actor_char_id, arc);

ALTER TABLE pol_bills
  ADD COLUMN IF NOT EXISTS coercion_vote_overrides JSONB NOT NULL DEFAULT '{}';

ALTER TABLE pol_scandals
  ADD COLUMN IF NOT EXISTS blackmail_used_by  UUID REFERENCES characters(id),
  ADD COLUMN IF NOT EXISTS blackmail_used_arc INTEGER;

COMMIT;
