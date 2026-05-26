-- WORLDr Database Migration: Phase 1 Vertical Slice — Parties, Profiles, Notifications
-- Target Database: PostgreSQL 13+

-- ============================================================================
-- 1. ADD is_verified AND display_name TO USERS
-- ============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS continent VARCHAR(100);

-- Add region/continent to nations table (for world layer)
ALTER TABLE nations
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS continent VARCHAR(100);

COMMENT ON COLUMN users.is_verified IS 'Email verification status. Must be TRUE before joining a nation.';
COMMENT ON COLUMN users.display_name IS 'In-game display name shown to other players.';

-- ============================================================================
-- 2. EMAIL VERIFICATION TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens generated at registration.';

-- ============================================================================
-- 3. PLAYER PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    ideology VARCHAR(50) NOT NULL DEFAULT 'centrist',
    avatar_code VARCHAR(20) NOT NULL DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_ideology CHECK (ideology IN (
        'far_left', 'left', 'centre_left', 'centrist', 'centre_right', 'right', 'far_right', 'libertarian', 'authoritarian', 'green', 'nationalist'
    ))
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_user_id ON player_profiles(user_id);

COMMENT ON TABLE player_profiles IS 'In-game player identity, ideology alignment, and display configuration.';

-- ============================================================================
-- 4. PARTIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    ideology VARCHAR(50) NOT NULL DEFAULT 'centrist',
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
    leader_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_count INTEGER NOT NULL DEFAULT 1,
    support_share NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    seats INTEGER NOT NULL DEFAULT 0,
    is_governing BOOLEAN NOT NULL DEFAULT FALSE,
    founded_tick INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_party_ideology CHECK (ideology IN (
        'far_left', 'left', 'centre_left', 'centrist', 'centre_right', 'right', 'far_right', 'libertarian', 'authoritarian', 'green', 'nationalist'
    )),
    UNIQUE (nation_id, name),
    UNIQUE (nation_id, abbreviation)
);

CREATE INDEX IF NOT EXISTS idx_parties_nation_id ON parties(nation_id);
CREATE INDEX IF NOT EXISTS idx_parties_leader_user_id ON parties(leader_user_id);

COMMENT ON TABLE parties IS 'Political parties competing for seats and governance within a nation.';

-- ============================================================================
-- 5. PARTY MEMBERSHIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS party_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_membership_role CHECK (role IN ('leader', 'deputy_leader', 'whip', 'member')),
    UNIQUE (user_id, nation_id)  -- one party per user per nation
);

CREATE INDEX IF NOT EXISTS idx_party_memberships_user_id ON party_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_party_memberships_party_id ON party_memberships(party_id);
CREATE INDEX IF NOT EXISTS idx_party_memberships_nation_id ON party_memberships(nation_id);

COMMENT ON TABLE party_memberships IS 'Links users to their political party and role within that party.';

-- ============================================================================
-- 6. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nation_id UUID REFERENCES nations(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    category VARCHAR(50) NOT NULL DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT check_notification_type CHECK (type IN ('info', 'warning', 'danger', 'success')),
    CONSTRAINT check_notification_category CHECK (category IN (
        'system', 'economy', 'politics', 'law', 'election', 'party', 'crisis', 'tick'
    ))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_nation_id ON notifications(nation_id);

COMMENT ON TABLE notifications IS 'In-game notification feed for player actions, system events, and simulation results.';
