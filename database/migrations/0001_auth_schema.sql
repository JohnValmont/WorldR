-- WORLDr Database Migration: Auth Schema only
-- Target Database: PostgreSQL 13+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS user_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_user_id() RETURNS BIGINT AS $$
DECLARE
    seq_val bigint;
    seq_str text;
    ym text;
BEGIN
    seq_val := nextval('user_id_seq');
    seq_str := seq_val::text;
    ym := to_char(CURRENT_DATE, 'YYMM');
    IF length(seq_str) < 3 THEN
        seq_str := lpad(seq_str, 3, '0');
    END IF;
    RETURN (ym || seq_str)::BIGINT;
END;
$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY DEFAULT generate_user_id(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    display_name VARCHAR(100),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_user_role CHECK (role IN ('user', 'admin', 'moderator'))
);

COMMENT ON TABLE users IS 'User authentication and basic profile configurations.';
COMMENT ON COLUMN users.role IS 'Security classification and permission privileges (user, admin, moderator).';
COMMENT ON COLUMN users.id IS 'Sequential developer-facing custom ID (YYMMNNN format).';

-- ============================================================================
-- 2. REFRESH TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

COMMENT ON TABLE refresh_tokens IS 'Stores cryptographically hashed long-lived refresh tokens for secure session rotation.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the generated refresh token string.';

-- ============================================================================
-- 3. EMAIL VERIFICATION TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    resend_cooldown_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens (OTP bcrypt hashes) generated at registration or resend.';
COMMENT ON COLUMN email_verification_tokens.token IS 'bcrypt hash of the 6-digit numeric OTP sent to the user email.';
COMMENT ON COLUMN email_verification_tokens.resend_cooldown_until IS 'Timestamp after which a new OTP may be sent. NULL means no active cooldown.';
