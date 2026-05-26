-- WORLDr Database Migration: 0010 — OTP Email Verification
-- Adds resend_cooldown_until column to enforce 60-second rate-limit on resend requests.
-- The existing `token` column stores bcrypt hashes — no column type change needed.

BEGIN;

-- Add resend cooldown tracking column
ALTER TABLE email_verification_tokens
  ADD COLUMN IF NOT EXISTS resend_cooldown_until TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN email_verification_tokens.token IS
  'bcrypt hash of the 6-digit numeric OTP sent to the user email.';

COMMENT ON COLUMN email_verification_tokens.resend_cooldown_until IS
  'Timestamp after which a new OTP may be sent. NULL means no active cooldown.';

COMMIT;
