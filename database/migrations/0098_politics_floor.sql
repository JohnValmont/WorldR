-- 0098_politics_floor.sql
-- "The Floor" politics redesign (docs/POLITICS_FLOOR.md).
--   pol_support     : how much each voter group backs each party (0-100). The one
--                     number campaigning, laws, promises and events all move, and
--                     the election engine now reads.
--   pol_situations  : the monthly hand of decision cards dealt to each player.
--   pol_pacts       : "back my bill and I owe you one" promises between parties.
--   pol_favours     : the IOUs those promises create, and whether they were honoured.
--   pol_stat_shocks : temporary nudges to national stats from executive decisions.
--   pol_action_log  : what each player did each month (diminishing returns + history).
-- Idempotent: safe to run on a database that already has some of these.

CREATE TABLE IF NOT EXISTS pol_support (
  party_id    UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  segment_key VARCHAR(64) NOT NULL,
  score       NUMERIC(6,2) NOT NULL DEFAULT 50,
  updated_arc INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (party_id, segment_key)
);

CREATE TABLE IF NOT EXISTS pol_situations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id     UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  arc          INTEGER NOT NULL,
  slot         INTEGER NOT NULL,
  card_key     VARCHAR(64) NOT NULL,
  vars         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       VARCHAR(16) NOT NULL DEFAULT 'open',
  option_index INTEGER,
  outcome      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  UNIQUE (character_id, arc, slot)
);
CREATE INDEX IF NOT EXISTS idx_pol_situations_char_arc ON pol_situations (character_id, arc);

CREATE TABLE IF NOT EXISTS pol_pacts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id                UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  bill_id                 UUID NOT NULL REFERENCES pol_bills(id) ON DELETE CASCADE,
  from_party_id           UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  to_party_id             UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  asked_vote              VARCHAR(8) NOT NULL,
  cash                    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status                  VARCHAR(16) NOT NULL DEFAULT 'offered',
  decline_reason          TEXT,
  created_by_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  created_arc             INTEGER NOT NULL,
  resolved_arc            INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pol_pacts_bill ON pol_pacts (bill_id);
CREATE INDEX IF NOT EXISTS idx_pol_pacts_state_status ON pol_pacts (state_id, status);

CREATE TABLE IF NOT EXISTS pol_favours (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id        UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  holder_party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  debtor_party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  origin_pact_id  UUID REFERENCES pol_pacts(id) ON DELETE SET NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'open',
  called_bill_id  UUID REFERENCES pol_bills(id) ON DELETE SET NULL,
  called_vote     VARCHAR(8),
  created_arc     INTEGER NOT NULL,
  called_arc      INTEGER,
  resolved_arc    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_pol_favours_state_status ON pol_favours (state_id, status);

CREATE TABLE IF NOT EXISTS pol_stat_shocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id    UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  stat        VARCHAR(32) NOT NULL,
  delta       NUMERIC(6,2) NOT NULL,
  reason      TEXT,
  created_arc INTEGER NOT NULL,
  expires_arc INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pol_stat_shocks_state ON pol_stat_shocks (state_id, expires_arc);

CREATE TABLE IF NOT EXISTS pol_action_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id     UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  party_id     UUID REFERENCES pol_parties(id) ON DELETE SET NULL,
  arc          INTEGER NOT NULL,
  kind         VARCHAR(32) NOT NULL,
  target       VARCHAR(64),
  summary      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pol_action_log_char_arc ON pol_action_log (character_id, arc);

-- A party that broke its word is refused new pacts until this month.
ALTER TABLE pol_parties ADD COLUMN IF NOT EXISTS word_broken_until_arc INTEGER NOT NULL DEFAULT 0;
-- Votes on a bill by an individual MP against their own party's line, recorded at the count.
ALTER TABLE pol_bills ADD COLUMN IF NOT EXISTS rebel_count INTEGER NOT NULL DEFAULT 0;
