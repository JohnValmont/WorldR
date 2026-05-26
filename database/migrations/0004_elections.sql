-- WORLDr Migration 0004: Elections System
-- Target Database: PostgreSQL 13+

-- ============================================================================
-- 1. ELECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    tick INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_votes BIGINT NOT NULL DEFAULT 0,
    turnout_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    winning_party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    coalition_formed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_election_status CHECK (status IN ('pending', 'running', 'completed')),
    UNIQUE (nation_id, tick)
);

CREATE INDEX IF NOT EXISTS idx_elections_nation_id ON elections(nation_id);
CREATE INDEX IF NOT EXISTS idx_elections_nation_tick ON elections(nation_id, tick DESC);

COMMENT ON TABLE elections IS 'Records each election event — one per election cycle (every 12 ticks).';

-- ============================================================================
-- 2. ELECTION RESULTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS election_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    party_name VARCHAR(100) NOT NULL,
    party_abbreviation VARCHAR(10) NOT NULL,
    party_color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
    votes BIGINT NOT NULL DEFAULT 0,
    vote_share NUMERIC(7, 4) NOT NULL DEFAULT 0.0000,
    seats INTEGER NOT NULL DEFAULT 0,
    seat_share NUMERIC(7, 4) NOT NULL DEFAULT 0.0000,
    is_governing BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_results_election_id ON election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_election_results_party_id ON election_results(party_id);

COMMENT ON TABLE election_results IS 'Per-party seat and vote allocation for each election.';
