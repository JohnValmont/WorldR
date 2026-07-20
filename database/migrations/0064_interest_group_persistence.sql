-- ── 0064: Interest Group Persistence ────────────────────────────────────────
-- Interest groups are persistent world entities (one per voter segment).
-- Each party maintains a relationship score with every group.
-- Relationships are seeded on party creation, drift each arc, and affect endorsements.

-- ── World interest groups (seeded once per state) ───────────────────────────
CREATE TABLE IF NOT EXISTS pol_interest_groups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  segment_key           TEXT NOT NULL,   -- matches SEGMENTS[].key in politics.ts
  name                  TEXT NOT NULL,
  ideology_lean         TEXT NOT NULL CHECK (ideology_lean IN ('labour', 'capital', 'civic', 'trade', 'neutral')),
  -- Their preferred platform (mirrors segment ideal, can be tweaked independently)
  pref_taxation         INTEGER NOT NULL DEFAULT 50,
  pref_labour           INTEGER NOT NULL DEFAULT 50,
  pref_investment       INTEGER NOT NULL DEFAULT 50,
  pref_trade            INTEGER NOT NULL DEFAULT 50,
  pref_stability        INTEGER NOT NULL DEFAULT 50,
  -- Weights (how much each axis matters to them, sum ≈ 1.0)
  weight_taxation       NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  weight_labour         NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  weight_investment     NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  weight_trade          NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  weight_stability      NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  -- Influence (how much their endorsement moves segment share)
  influence_weight      NUMERIC(4,3) NOT NULL DEFAULT 0.15,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (state_id, segment_key)
);

-- ── Party–Interest Group relationship ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pol_interest_group_relations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id              UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  group_id              UUID NOT NULL REFERENCES pol_interest_groups(id) ON DELETE CASCADE,

  -- Core score: 0 (hostile) to 100 (allied). Starts at alignment-based seed.
  relationship_score    NUMERIC(5,2) NOT NULL DEFAULT 50,

  -- Endorsement tier
  endorsement_status    TEXT NOT NULL DEFAULT 'none' CHECK (endorsement_status IN (
    'none',         -- no endorsement (score < 40)
    'sympathetic',  -- mild support (score 40–59)
    'endorsed',     -- public endorsement (score 60–74)
    'allied'        -- full alliance, party gets segment share bonus (score ≥ 75)
  )),

  -- Commitments: JSONB array of { id, axis, direction, promised_arc, honored_arc | null, broken_arc | null }
  -- A commitment is a policy promise extracted from the party platform at time of petition
  active_commitments    JSONB NOT NULL DEFAULT '[]',

  -- Contact log: JSONB array of { arc, action, score_delta, message }
  contact_log           JSONB NOT NULL DEFAULT '[]',

  -- Outreach cooldown: player must wait this many arcs between manual outreach actions
  last_outreach_arc     INTEGER,

  -- Momentum (short-term relationship boost/penalty from last arc interaction)
  momentum              NUMERIC(4,2) NOT NULL DEFAULT 0,

  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (party_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_pol_igr_party   ON pol_interest_group_relations(party_id);
CREATE INDEX IF NOT EXISTS idx_pol_igr_group   ON pol_interest_group_relations(group_id);
CREATE INDEX IF NOT EXISTS idx_pol_igr_status  ON pol_interest_group_relations(endorsement_status);

CREATE OR REPLACE FUNCTION update_pol_igr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pol_igr_updated_at ON pol_interest_group_relations;
CREATE TRIGGER trg_pol_igr_updated_at
  BEFORE UPDATE ON pol_interest_group_relations
  FOR EACH ROW EXECUTE FUNCTION update_pol_igr_updated_at();

-- ── Seed interest groups for any state that doesn't have them ───────────────
-- Run once — INSERT ... ON CONFLICT DO NOTHING is safe for re-runs.
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM states LOOP
    -- Industrial Workers Union Federation
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'industrial_workers', 'Ironvale Union Federation', 'labour',
      30, 85, 75, 55, 55,  0.15, 0.40, 0.25, 0.08, 0.12,  0.20)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Logistics & Trade Workers Alliance
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'logistics_trade_workers', 'Transport & Freight Alliance', 'trade',
      45, 65, 70, 80, 55,  0.12, 0.20, 0.25, 0.35, 0.08,  0.12)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Factory & Business Owners — Manufacturers Council
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'factory_business_owners', 'Drennia Manufacturers Council', 'capital',
      88, 30, 70, 75, 60,  0.45, 0.05, 0.20, 0.20, 0.10,  0.15)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Civic Professionals — Professional Guild
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'civic_professionals', 'Civic Professionals Guild', 'civic',
      60, 55, 65, 60, 70,  0.20, 0.15, 0.25, 0.10, 0.30,  0.14)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Suburban Families — Homeowners & Community League
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'suburban_families', 'Homeowners & Community League', 'neutral',
      55, 55, 55, 55, 75,  0.25, 0.20, 0.12, 0.08, 0.35,  0.12)
    ON CONFLICT (state_id, segment_key) DO NOTHING;
  END LOOP;
END;
$$;
