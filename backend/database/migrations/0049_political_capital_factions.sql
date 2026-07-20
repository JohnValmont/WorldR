-- 0049_political_capital_factions.sql
-- UP: Political Capital, Party Factions, Coalition Agreements
BEGIN;

-- ── 1. Political Capital columns on existing pol_character_ap table ───────────
-- PC is a separate strategic resource from AP.
-- AP  = routine action throughput (resets every arc)
-- PC  = high-stakes political leverage (regenerates slowly, can exceed cap via events)
ALTER TABLE pol_character_ap
  ADD COLUMN IF NOT EXISTS current_pc   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pc_cap       INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS pc_regen_arc INTEGER;

-- ── 2. Party Factions ─────────────────────────────────────────────────────────
-- Every party has 2–4 internal factions generated at founding based on Creed.
-- Faction loyalty drives party cohesion. Low cohesion = leadership challenges,
-- policy drift, or breakaway events.
CREATE TABLE IF NOT EXISTS pol_party_factions (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id            UUID    NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  name                VARCHAR(100) NOT NULL,
  -- Faction's ideological lean: JSONB with same 5-axis structure as platform
  ideology_lean       JSONB   NOT NULL DEFAULT '{}',
  -- Primary demand type: 'policy_axis', 'ministry_seat', 'leadership_change', 'autonomy'
  demand_type         VARCHAR(50) NOT NULL DEFAULT 'policy_axis',
  -- Specific demand payload (e.g. {axis: 'labour', direction: 'raise'})
  demand_payload      JSONB   NOT NULL DEFAULT '{}',
  -- 0-100: how satisfied/loyal this faction is. Below 25 = restless.
  loyalty             INTEGER NOT NULL DEFAULT 70
                        CONSTRAINT pol_party_factions_loyalty_range CHECK (loyalty >= 0 AND loyalty <= 100),
  -- Faction size as share of party membership (0.0–1.0, all factions sum to 1.0)
  membership_share    NUMERIC(4,3) NOT NULL DEFAULT 0.333,
  -- NPC character who leads this faction (may be NULL for player-led factions)
  leader_character_id UUID,
  -- If true, this faction is actively threatening to break away
  is_restless         BOOLEAN NOT NULL DEFAULT FALSE,
  created_arc         INTEGER NOT NULL,
  updated_arc         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pol_party_factions_party ON pol_party_factions(party_id);

-- ── 3. Coalition Agreements ───────────────────────────────────────────────────
-- Structured record of a coalition arrangement between parties.
-- Replaces the bare JSONB on pol_coalitions with a proper typed object.
CREATE TABLE IF NOT EXISTS pol_coalition_agreements (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  coalition_id         UUID    REFERENCES pol_coalitions(id) ON DELETE CASCADE,
  lead_party_id        UUID    NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  -- JSONB array of {party_id, portfolio_seats, agreed_axes: [...]}
  partner_terms        JSONB   NOT NULL DEFAULT '[]',
  -- JSONB array of {bill_type, target_axis, direction, mandatory: bool}
  mandatory_legislation JSONB  NOT NULL DEFAULT '[]',
  -- JSONB array of {party_id, ministry_key, character_id}
  portfolio_allocation JSONB   NOT NULL DEFAULT '[]',
  -- How many arcs from the last review before the agreement is re-evaluated
  review_interval_arcs INTEGER NOT NULL DEFAULT 12,
  next_review_arc      INTEGER,
  -- 'active' | 'under_review' | 'broken' | 'dissolved'
  status               VARCHAR(30) NOT NULL DEFAULT 'active',
  health               INTEGER NOT NULL DEFAULT 100
                         CONSTRAINT pol_coalition_agreements_health_range CHECK (health >= 0 AND health <= 100),
  formed_arc           INTEGER NOT NULL,
  dissolved_arc        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pol_coalition_agreements_lead ON pol_coalition_agreements(lead_party_id);
CREATE INDEX IF NOT EXISTS idx_pol_coalition_agreements_status ON pol_coalition_agreements(status);

COMMIT;

-- DOWN
BEGIN;
DROP TABLE IF EXISTS pol_coalition_agreements;
DROP TABLE IF EXISTS pol_party_factions;
ALTER TABLE pol_character_ap
  DROP COLUMN IF EXISTS current_pc,
  DROP COLUMN IF EXISTS pc_cap,
  DROP COLUMN IF EXISTS pc_regen_arc;
COMMIT;
