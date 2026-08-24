-- 0090_bill_coercion.sql
-- UP: Bill Coercion System (Bribery + Blackmail)

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_bill    ON pol_bill_coercion_actions(bill_id);
CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_actor   ON pol_bill_coercion_actions(actor_char_id);
CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_actor_arc ON pol_bill_coercion_actions(actor_char_id, arc);
CREATE INDEX IF NOT EXISTS idx_pol_bill_coercion_scandal ON pol_bill_coercion_actions(scandal_id) WHERE scandal_id IS NOT NULL;

ALTER TABLE pol_bills
  ADD COLUMN IF NOT EXISTS coercion_vote_overrides JSONB NOT NULL DEFAULT '{}';

ALTER TABLE pol_scandals
  ADD COLUMN IF NOT EXISTS blackmail_used_by  UUID REFERENCES characters(id),
  ADD COLUMN IF NOT EXISTS blackmail_used_arc INTEGER;

CREATE INDEX IF NOT EXISTS idx_pol_scandals_blackmail ON pol_scandals(blackmail_used_by) WHERE blackmail_used_by IS NOT NULL;

COMMIT;

-- DOWN
BEGIN;
ALTER TABLE pol_scandals  DROP COLUMN IF EXISTS blackmail_used_by, DROP COLUMN IF EXISTS blackmail_used_arc;
ALTER TABLE pol_bills     DROP COLUMN IF EXISTS coercion_vote_overrides;
DROP TABLE IF EXISTS pol_bill_coercion_actions;
COMMIT;
