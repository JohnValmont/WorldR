-- 0071: Idempotent safety net — ensure pol_party_factions exists.
-- Migration 0061 and 0070 both define this table; this migration guards against
-- any environment where those migrations were skipped or partially applied.
-- Safe to run multiple times (IF NOT EXISTS throughout).

BEGIN;

CREATE TABLE IF NOT EXISTS pol_party_factions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id            UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  name                VARCHAR(100) NOT NULL,
  ideology_lean       JSONB NOT NULL DEFAULT '{}',
  demand_type         VARCHAR(50)  NOT NULL DEFAULT 'policy_axis',
  demand_payload      JSONB NOT NULL DEFAULT '{}',
  loyalty             INTEGER NOT NULL DEFAULT 70
    CONSTRAINT pol_party_factions_loyalty_range CHECK (loyalty >= 0 AND loyalty <= 100),
  membership_share    NUMERIC(4,3) NOT NULL DEFAULT 0.333,
  leader_character_id UUID,
  is_restless         BOOLEAN NOT NULL DEFAULT FALSE,
  created_arc         INTEGER NOT NULL,
  updated_arc         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pol_party_factions_party ON pol_party_factions(party_id);

-- Ensure pol_character_ap also exists (used by PC/AP regen in processPoliticalArc)
CREATE TABLE IF NOT EXISTS pol_character_ap (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  current_ap      INTEGER NOT NULL DEFAULT 0,
  ap_cap          INTEGER NOT NULL DEFAULT 12,
  last_regen_arc  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pol_character_ap_char ON pol_character_ap(character_id);

COMMIT;
