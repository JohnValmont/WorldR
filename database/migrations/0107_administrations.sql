-- 0107_administrations.sql
-- Administrations: who governed each nation, from when to when, and how the
-- nation changed under them (docs/NATIONS_SIMULATION.md, "Administrations").
--
-- One row per government. An elected government is named after its head of
-- government ("Dumb Administration"); when no government commands Parliament
-- the head of state leads a caretaker government until one forms
-- ("Ostrin Caretaker Government"). Written only by syncAdministrations in the
-- monthly politics tick. Read-only for elections, votes, deals and support.

CREATE TABLE IF NOT EXISTS pol_administrations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id             UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    kind                 VARCHAR(20) NOT NULL CHECK (kind IN ('elected', 'caretaker')),
    name                 VARCHAR(160) NOT NULL,
    head_name            VARCHAR(120) NOT NULL,
    head_title           VARCHAR(80) NOT NULL,
    head_character_id    UUID REFERENCES characters(id) ON DELETE SET NULL,
    party_id             UUID REFERENCES pol_parties(id) ON DELETE SET NULL,
    party_name           VARCHAR(160),
    party_color          VARCHAR(16),
    coalition            JSONB NOT NULL DEFAULT '[]'::jsonb,
    term_number          INTEGER NOT NULL DEFAULT 1,
    start_arc            INTEGER NOT NULL,
    end_arc              INTEGER,
    -- The nation's numbers when it took office, and the latest (or final) ones.
    start_snapshot       JSONB NOT NULL,
    end_snapshot         JSONB NOT NULL,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_administrations_state ON pol_administrations (state_id, start_arc DESC);
-- At most one administration in office per nation.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pol_administrations_open ON pol_administrations (state_id) WHERE end_arc IS NULL;
