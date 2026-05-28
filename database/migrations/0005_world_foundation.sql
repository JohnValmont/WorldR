-- WORLDr Database Migration: 0005 — World Foundation
-- Adds: continents, governance_systems, enhanced parties, party_staff, party_treasury, party_campaigns
-- Target Database: PostgreSQL 13+

BEGIN;

-- ============================================================================
-- 1. CONTINENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS continents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    political_identity TEXT,
    economic_characteristics TEXT,
    climate_regions TEXT,
    demographic_tendencies TEXT,
    geopolitical_tendencies TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE continents IS 'The four fictional continents of Aethon (Alderis, Varanthos, Novara, Kethara).';

-- Seed continents (Cleared for blank simulation slate)

-- ============================================================================
-- 2. GOVERNANCE SYSTEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS governance_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    executive_authority_score SMALLINT NOT NULL DEFAULT 5,  -- 1-10
    parliament_authority_score SMALLINT NOT NULL DEFAULT 5,  -- 1-10
    coalition_threshold NUMERIC(4,3),  -- NULL means no coalition needed (monarchy/junta)
    confidence_vote BOOLEAN NOT NULL DEFAULT TRUE,
    default_election_cycle_months INTEGER NOT NULL DEFAULT 48,
    law_passage_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.501,  -- fraction of parliament
    constitutional_change_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.670,
    stability_modifier NUMERIC(5,3) NOT NULL DEFAULT 0.000,
    corruption_modifier NUMERIC(5,3) NOT NULL DEFAULT 0.000,
    efficiency_modifier NUMERIC(5,3) NOT NULL DEFAULT 0.000,
    voter_participation_bonus NUMERIC(5,3) NOT NULL DEFAULT 0.000,
    freedom_modifier NUMERIC(5,3) NOT NULL DEFAULT 0.000,
    special_rules JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE governance_systems IS 'Defines the 10 governance system types with their mechanical properties.';

INSERT INTO governance_systems (
    code, name, description,
    executive_authority_score, parliament_authority_score,
    coalition_threshold, confidence_vote, default_election_cycle_months,
    law_passage_threshold, constitutional_change_threshold,
    stability_modifier, corruption_modifier, efficiency_modifier,
    voter_participation_bonus, freedom_modifier, special_rules
) VALUES
  (
    'constitutional_monarchy',
    'Constitutional Monarchy',
    'Ceremonial monarch; elected parliament holds legislative supremacy; Chancellor/PM is head of government.',
    4, 9, 0.501, TRUE, 48, 0.501, 0.670,
    0.050, -0.080, 0.000, 0.060, 0.100,
    '{"monarch_role": "ceremonial", "confidence_vote_days": 30, "emergency_decree_days": 30}'
  ),
  (
    'parliamentary_republic',
    'Parliamentary Republic',
    'President mostly ceremonial; parliament elects PM who holds executive authority.',
    3, 9, 0.501, TRUE, 48, 0.501, 0.670,
    0.030, -0.050, 0.000, 0.040, 0.100,
    '{"president_role": "ceremonial"}'
  ),
  (
    'presidential_republic',
    'Presidential Republic',
    'Directly elected president holds executive authority; separation of powers.',
    8, 6, NULL, FALSE, 48, 0.501, 0.670,
    0.000, -0.020, 0.000, 0.080, 0.100,
    '{"veto_power": true, "impeachment_threshold": 0.670, "executive_orders": true}'
  ),
  (
    'semi_presidential',
    'Semi-Presidential Republic',
    'Directly elected president AND parliament-appointed PM share executive authority.',
    6, 7, 0.501, TRUE, 48, 0.501, 0.670,
    -0.020, -0.010, 0.000, 0.050, 0.090,
    '{"cohabitation_stability_penalty": -0.050, "president_cycle_months": 60}'
  ),
  (
    'federal_republic',
    'Federal Republic',
    'Significant powers devolved to regional governments; federal handles defense and national standards.',
    5, 7, 0.501, TRUE, 48, 0.501, 0.670,
    0.020, -0.040, 0.000, 0.050, 0.090,
    '{"regional_veto": true, "state_election_effects": true}'
  ),
  (
    'one_party_state',
    'One-Party State',
    'Single dominant party controls all significant political institutions; managed elections.',
    10, 2, NULL, FALSE, 60, 0.501, 0.900,
    0.080, 0.200, -0.050, 0.020, -0.300,
    '{"protest_acceleration": 1.5, "legitimacy_decay_without_growth": true, "purge_events": true}'
  ),
  (
    'military_junta',
    'Military Junta',
    'Military leaders control government; democratic institutions suspended.',
    10, 1, NULL, FALSE, 999, 0.501, 0.900,
    -0.150, 0.300, -0.100, 0.010, -0.500,
    '{"coup_probability": true, "military_approval_matters": true, "sanctions_risk": true}'
  ),
  (
    'absolute_monarchy',
    'Absolute Monarchy',
    'Monarch holds executive, legislative, and judicial authority.',
    9, 3, NULL, FALSE, 999, 0.501, 0.900,
    0.020, 0.150, 0.000, 0.015, -0.200,
    '{"succession_events": true, "revolt_threshold": 0.35, "elite_council_required": true}'
  ),
  (
    'technocratic_republic',
    'Technocratic Republic',
    'Government led by domain experts; efficiency and evidence prioritized over elections.',
    6, 8, 0.501, TRUE, 60, 0.501, 0.670,
    0.100, -0.100, 0.150, 0.030, 0.050,
    '{"populism_backlash_risk": 0.200, "efficiency_bonus": 0.150}'
  ),
  (
    'hybrid_transitional',
    'Hybrid Transitional State',
    'Nation in transition; democratic institutions exist but are weak and contested.',
    4, 5, 0.400, TRUE, 36, 0.501, 0.670,
    -0.100, 0.150, -0.050, 0.040, -0.050,
    '{"crisis_frequency_multiplier": 1.5, "institution_capture_risk": true, "foreign_influence_risk": true}'
  )
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. ADD GOVERNANCE FIELDS TO NATIONS
-- ============================================================================
ALTER TABLE nations
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
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS population_size BIGINT NOT NULL DEFAULT 50000000,
  ADD COLUMN IF NOT EXISTS governance_data JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_nations_continent_id ON nations(continent_id);
CREATE INDEX IF NOT EXISTS idx_nations_governance_system ON nations(governance_system);

-- ============================================================================
-- 4. ENHANCE PARTIES TABLE
-- ============================================================================
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS slogan VARCHAR(255),
  ADD COLUMN IF NOT EXISTS manifesto TEXT,
  ADD COLUMN IF NOT EXISTS economic_stance VARCHAR(20) NOT NULL DEFAULT 'centre',
  ADD COLUMN IF NOT EXISTS social_stance VARCHAR(20) NOT NULL DEFAULT 'centre',
  ADD COLUMN IF NOT EXISTS hq_region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS funds NUMERIC(20, 2) NOT NULL DEFAULT 500000.00,
  ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS monthly_costs NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_ai_controlled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER;

-- Add constraints for new columns if not already existing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_economic_stance'
  ) THEN
    ALTER TABLE parties ADD CONSTRAINT check_economic_stance
      CHECK (economic_stance IN ('far_left', 'left', 'centre_left', 'centre', 'centre_right', 'right', 'far_right'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_social_stance'
  ) THEN
    ALTER TABLE parties ADD CONSTRAINT check_social_stance
      CHECK (social_stance IN ('progressive', 'liberal', 'centre', 'traditional', 'conservative', 'reactionary'));
  END IF;
END $$;

-- Expand party ideology constraint to include new ideologies
ALTER TABLE parties DROP CONSTRAINT IF EXISTS check_party_ideology;
ALTER TABLE parties ADD CONSTRAINT check_party_ideology CHECK (ideology IN (
  'far_left', 'left', 'centre_left', 'centrist', 'centre_right', 'right', 'far_right',
  'libertarian', 'authoritarian', 'green', 'nationalist',
  'socialist', 'social_democrat', 'conservative', 'technocratic', 'populist', 'religious_conservative'
));

-- ============================================================================
-- 5. EXPAND PARTY MEMBERSHIPS ROLES
-- ============================================================================
ALTER TABLE party_memberships DROP CONSTRAINT IF EXISTS check_membership_role;
ALTER TABLE party_memberships ADD CONSTRAINT check_membership_role CHECK (role IN (
  'leader', 'deputy_leader', 'secretary_general', 'treasurer',
  'campaign_manager', 'policy_chief', 'media_manager', 'whip', 'member'
));

-- ============================================================================
-- 6. PARTY STAFF (AI + HUMAN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'AI Staff',
    seniority VARCHAR(20) NOT NULL DEFAULT 'junior',
    is_ai BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 45000.00,
    loyalty NUMERIC(4,3) NOT NULL DEFAULT 0.750,
    ideology_alignment NUMERIC(4,3) NOT NULL DEFAULT 0.700,
    skill_level NUMERIC(4,3) NOT NULL DEFAULT 0.500,
    experience_months INTEGER NOT NULL DEFAULT 0,
    last_action VARCHAR(100),
    last_action_result JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    hired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_staff_role CHECK (role IN (
      'campaign_worker', 'media_advisor', 'policy_economist',
      'party_strategist', 'recruitment_officer', 'fundraiser', 'parliamentary_whip'
    )),
    CONSTRAINT check_staff_seniority CHECK (seniority IN ('junior', 'senior', 'expert')),
    CONSTRAINT check_staff_loyalty CHECK (loyalty >= 0.0 AND loyalty <= 1.0),
    CONSTRAINT check_staff_alignment CHECK (ideology_alignment >= 0.0 AND ideology_alignment <= 1.0),
    CONSTRAINT check_staff_skill CHECK (skill_level >= 0.0 AND skill_level <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_party_staff_party_id ON party_staff(party_id);
CREATE INDEX IF NOT EXISTS idx_party_staff_nation_id ON party_staff(nation_id);
CREATE INDEX IF NOT EXISTS idx_party_staff_active ON party_staff(party_id, is_active);

COMMENT ON TABLE party_staff IS 'AI and human staff hired by political parties to perform monthly automated actions.';

-- ============================================================================
-- 7. PARTY CAMPAIGNS (RALLY/FUNDRAISE ACTIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_bloc VARCHAR(100),
    tick_executed INTEGER NOT NULL,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    result_data JSONB NOT NULL DEFAULT '{}',
    executed_by_staff_id UUID REFERENCES party_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_campaign_action CHECK (action_type IN (
      'rally', 'press_campaign', 'voter_outreach', 'fundraiser',
      'member_drive', 'policy_release', 'debate_prep', 'targeted_ads'
    ))
);

CREATE INDEX IF NOT EXISTS idx_party_campaigns_party_id ON party_campaigns(party_id);
CREATE INDEX IF NOT EXISTS idx_party_campaigns_tick ON party_campaigns(nation_id, tick_executed);

COMMENT ON TABLE party_campaigns IS 'Log of campaign actions executed by parties (rallies, fundraisers, outreach).';

-- ============================================================================
-- 8. PARLIAMENT SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS parliament_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    law_id UUID REFERENCES laws(id) ON DELETE SET NULL,
    session_type VARCHAR(50) NOT NULL DEFAULT 'law_vote',
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    opens_tick INTEGER NOT NULL,
    closes_tick INTEGER NOT NULL,
    yes_votes INTEGER NOT NULL DEFAULT 0,
    no_votes INTEGER NOT NULL DEFAULT 0,
    abstain_votes INTEGER NOT NULL DEFAULT 0,
    required_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.501,
    result VARCHAR(20),
    result_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_session_type CHECK (session_type IN (
      'law_vote', 'confidence_vote', 'constitutional_amendment', 'budget_vote', 'emergency_decree'
    )),
    CONSTRAINT check_session_status CHECK (status IN ('open', 'closed', 'passed', 'failed', 'withdrawn')),
    CONSTRAINT check_session_result CHECK (result IS NULL OR result IN ('passed', 'failed', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_parliament_sessions_nation_id ON parliament_sessions(nation_id);
CREATE INDEX IF NOT EXISTS idx_parliament_sessions_status ON parliament_sessions(nation_id, status);

COMMENT ON TABLE parliament_sessions IS 'Parliamentary voting sessions for laws, confidence votes, and constitutional amendments.';

-- ============================================================================
-- 9. PARLIAMENT VOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS parliament_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES parliament_sessions(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    vote VARCHAR(10) NOT NULL DEFAULT 'abstain',
    seats_voting INTEGER NOT NULL DEFAULT 0,
    discipline_score NUMERIC(4,3) NOT NULL DEFAULT 1.000,
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_vote_value CHECK (vote IN ('yes', 'no', 'abstain')),
    UNIQUE (session_id, party_id)
);

CREATE INDEX IF NOT EXISTS idx_parliament_votes_session_id ON parliament_votes(session_id);
CREATE INDEX IF NOT EXISTS idx_parliament_votes_party_id ON parliament_votes(party_id);

COMMENT ON TABLE parliament_votes IS 'Records how each party voted in each parliamentary session.';

COMMIT;
