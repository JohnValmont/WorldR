-- 0032: Global in-game chat
-- Lightweight single-channel chat. BIGSERIAL id doubles as an incremental
-- polling cursor (clients ask for "everything after id X").

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    body VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_character_id ON chat_messages(character_id);
