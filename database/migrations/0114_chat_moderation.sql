-- 0114_chat_moderation.sql
-- Chat moderation for the closed alpha (constants/chat.ts, services/chat.rules.ts).
--  * chat_messages.hidden_at: a hidden message is no longer served to anyone.
--    Hidden by an admin, or automatically once CHAT_AUTO_HIDE_REPORTS different
--    players report it.
--  * chat_reports: one row per (message, reporter).
--  * users.chat_muted_until: a muted player can read but not post. On the user,
--    not the character, so a new character does not escape a mute.
-- Idempotent.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS hidden_reason VARCHAR(50);

CREATE TABLE IF NOT EXISTS chat_reports (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  reason VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution VARCHAR(20),
  UNIQUE (message_id, reporter_character_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_reports_open ON chat_reports (message_id) WHERE resolved_at IS NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_muted_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_mute_reason VARCHAR(200);

-- The rate limit looks up a player's messages of the last minute.
CREATE INDEX IF NOT EXISTS idx_chat_messages_character_created ON chat_messages (character_id, created_at DESC);
