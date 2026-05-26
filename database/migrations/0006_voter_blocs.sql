-- WORLDr Database Migration: 0006 — Voter Blocs
-- Adds voter_blocs table and voter_bloc_party_affinity for Keldoria
-- Target Database: PostgreSQL 13+

BEGIN;

-- ============================================================================
-- 1. VOTER BLOCS
-- ============================================================================
CREATE TABLE IF NOT EXISTS voter_blocs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    population_share NUMERIC(5,4) NOT NULL DEFAULT 0.0000,  -- fraction of total pop
    age_profile VARCHAR(100),
    primary_ideology VARCHAR(50),
    secondary_ideology VARCHAR(50),
    income_min NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    income_max NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
    geography VARCHAR(100),
    inflation_sensitivity NUMERIC(4,3) NOT NULL DEFAULT 0.500,
    unemployment_sensitivity NUMERIC(4,3) NOT NULL DEFAULT 0.500,
    welfare_dependence NUMERIC(4,3) NOT NULL DEFAULT 0.300,
    turnout_rate NUMERIC(4,3) NOT NULL DEFAULT 0.600,
    approval NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
    issue_priorities JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_voter_bloc_population_share CHECK (population_share >= 0.0 AND population_share <= 1.0),
    CONSTRAINT check_voter_bloc_sensitivity CHECK (inflation_sensitivity >= 0.0 AND inflation_sensitivity <= 1.0),
    CONSTRAINT check_voter_bloc_unemployment CHECK (unemployment_sensitivity >= 0.0 AND unemployment_sensitivity <= 1.0),
    CONSTRAINT check_voter_bloc_turnout CHECK (turnout_rate >= 0.0 AND turnout_rate <= 1.0),
    CONSTRAINT check_voter_bloc_approval CHECK (approval >= 0.0 AND approval <= 1.0),
    UNIQUE (nation_id, code)
);

CREATE INDEX IF NOT EXISTS idx_voter_blocs_nation_id ON voter_blocs(nation_id);
CREATE INDEX IF NOT EXISTS idx_voter_blocs_code ON voter_blocs(nation_id, code);

COMMENT ON TABLE voter_blocs IS 'Political demographic segments. Drive election outcomes, turnout, and approval dynamics.';

-- ============================================================================
-- 2. VOTER BLOC PARTY AFFINITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS voter_bloc_party_affinity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_bloc_id UUID NOT NULL REFERENCES voter_blocs(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    base_affinity NUMERIC(4,3) NOT NULL DEFAULT 0.100,  -- 0=hostile, 1=strong affinity
    current_affinity NUMERIC(4,3) NOT NULL DEFAULT 0.100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_affinity_range CHECK (base_affinity >= 0.0 AND base_affinity <= 1.0),
    CONSTRAINT check_current_affinity_range CHECK (current_affinity >= 0.0 AND current_affinity <= 1.0),
    UNIQUE (voter_bloc_id, party_id)
);

CREATE INDEX IF NOT EXISTS idx_voter_bloc_affinity_bloc_id ON voter_bloc_party_affinity(voter_bloc_id);
CREATE INDEX IF NOT EXISTS idx_voter_bloc_affinity_party_id ON voter_bloc_party_affinity(party_id);
CREATE INDEX IF NOT EXISTS idx_voter_bloc_affinity_nation_id ON voter_bloc_party_affinity(nation_id);

COMMENT ON TABLE voter_bloc_party_affinity IS 'Tracks how much each voter bloc favors each political party. Updated monthly by simulation.';

-- ============================================================================
-- 3. NATION TEMPLATES — add governance fields
-- ============================================================================
ALTER TABLE nation_templates
  ADD COLUMN IF NOT EXISTS continent_id UUID REFERENCES continents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS governance_system VARCHAR(50) REFERENCES governance_systems(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parliament_seats INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS election_cycle_months INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS monarch_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS monarch_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS monarch_family VARCHAR(100),
  ADD COLUMN IF NOT EXISTS head_of_government_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS flag_description TEXT,
  ADD COLUMN IF NOT EXISTS flag_colors VARCHAR(200),
  ADD COLUMN IF NOT EXISTS motto VARCHAR(255),
  ADD COLUMN IF NOT EXISTS currency_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS population_size BIGINT NOT NULL DEFAULT 50000000;

COMMIT;
