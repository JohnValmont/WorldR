-- Diplomacy, layer 5 of docs/NATIONS_SIMULATION.md: relations between nations and treaties.

-- One row per pair of nations (state_a < state_b, by pol_states.code), 0-100, 50 neutral.
-- Missing row = neutral. Written only by diplomacy.service (monthly step and treaty events).
CREATE TABLE IF NOT EXISTS nation_relations (
    state_a     VARCHAR(50) NOT NULL,
    state_b     VARCHAR(50) NOT NULL,
    score       NUMERIC(6,2) NOT NULL DEFAULT 50,
    updated_arc INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (state_a, state_b),
    CONSTRAINT nation_relations_ordered CHECK (state_a < state_b)
);

-- Treaties. A pact is proposed by one nation's head of government and ratified
-- by the other nation's parliament; an embargo is ratified by the imposing
-- nation's own parliament. The vote is an ordinary pol_bills row (type 'treaty')
-- counted by the one vote rule (billVotePlan + tallyBill).
CREATE TABLE IF NOT EXISTS nation_treaties (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                      VARCHAR(30) NOT NULL CHECK (kind IN ('trade_pact', 'defence_pact', 'embargo')),
    from_code                 VARCHAR(50) NOT NULL,
    to_code                   VARCHAR(50) NOT NULL,
    status                    VARCHAR(20) NOT NULL CHECK (status IN ('proposed', 'active', 'rejected', 'ended')),
    bill_id                   UUID REFERENCES pol_bills(id) ON DELETE SET NULL,
    proposed_by_character_id  UUID REFERENCES characters(id) ON DELETE SET NULL,
    proposed_arc              INTEGER NOT NULL,
    started_arc               INTEGER,
    resolved_arc              INTEGER,
    created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT nation_treaties_two_nations CHECK (from_code <> to_code)
);

CREATE INDEX IF NOT EXISTS idx_nation_treaties_status ON nation_treaties (status);
CREATE INDEX IF NOT EXISTS idx_nation_treaties_bill ON nation_treaties (bill_id);
