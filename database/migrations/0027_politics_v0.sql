-- UP
BEGIN;

CREATE TABLE pol_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    population INTEGER NOT NULL,
    registered_voters INTEGER NOT NULL,
    base_turnout NUMERIC(4,3) NOT NULL
);

CREATE TABLE pol_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    leader_character_id UUID,
    platform JSONB NOT NULL,
    treasury NUMERIC(19, 4) NOT NULL DEFAULT 0,
    is_npc BOOLEAN NOT NULL DEFAULT FALSE,
    created_month INTEGER NOT NULL
);

CREATE TABLE pol_party_members (
    party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    character_id UUID NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('leader', 'member')),
    joined_month INTEGER NOT NULL,
    PRIMARY KEY (party_id, character_id)
);

CREATE TABLE pol_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    phase VARCHAR(50) NOT NULL,
    start_month INTEGER NOT NULL,
    polling_month INTEGER NOT NULL,
    formation_end_month INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE pol_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    character_id UUID,
    is_npc BOOLEAN NOT NULL DEFAULT FALSE,
    platform JSONB NOT NULL,
    is_incumbent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE pol_campaign_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES pol_candidates(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_segment VARCHAR(50),
    cash_spent NUMERIC(19, 4) NOT NULL DEFAULT 0,
    effort NUMERIC(10, 2) NOT NULL,
    resolved_month INTEGER NOT NULL
);

CREATE TABLE pol_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES pol_candidates(id) ON DELETE CASCADE,
    votes INTEGER NOT NULL,
    seat_rank INTEGER NOT NULL,
    won_seat BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE pol_council_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    character_id UUID,
    is_npc BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE pol_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    office VARCHAR(50) NOT NULL CHECK (office IN ('premier')),
    holder_character_id UUID,
    party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    since_month INTEGER NOT NULL
);

CREATE TABLE pol_coalitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
    lead_party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    member_party_ids JSONB NOT NULL,
    total_seats INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE pol_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    proposed_by_party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    params JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('proposed', 'passed', 'failed', 'active')),
    proposed_month INTEGER NOT NULL
);

CREATE TABLE pol_bill_votes (
    bill_id UUID NOT NULL REFERENCES pol_bills(id) ON DELETE CASCADE,
    character_id UUID NOT NULL,
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('yea', 'nay')),
    PRIMARY KEY (bill_id, character_id)
);

CREATE TABLE pol_tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    vehicle_class VARCHAR(50) NOT NULL,
    spec_floor JSONB NOT NULL,
    units_per_month INTEGER NOT NULL,
    max_price NUMERIC(19, 4) NOT NULL,
    duration_months INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'awarded', 'active', 'closed')),
    awarded_company_id UUID,
    awarded_price NUMERIC(19, 4),
    posted_month INTEGER NOT NULL
);

CREATE TABLE pol_tender_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES pol_tenders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    model_id UUID NOT NULL,
    bid_price NUMERIC(19, 4) NOT NULL,
    created_month INTEGER NOT NULL
);

CREATE TABLE pol_state_policy (
    state_id UUID PRIMARY KEY REFERENCES pol_states(id) ON DELETE CASCADE,
    industry_tax_rate NUMERIC(4,3) NOT NULL,
    infrastructure_level INTEGER NOT NULL DEFAULT 1,
    subsidy JSONB,
    updated_month INTEGER NOT NULL
);

CREATE TABLE pol_ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    kind VARCHAR(50) NOT NULL,
    headline TEXT NOT NULL,
    body TEXT NOT NULL
);

COMMIT;

