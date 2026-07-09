-- 0039: Upgrade chat for multiple channels and private messaging

ALTER TABLE chat_messages
ADD COLUMN channel VARCHAR(50) NOT NULL DEFAULT 'world';

ALTER TABLE chat_messages
ADD COLUMN target_character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel);
CREATE INDEX IF NOT EXISTS idx_chat_messages_target_character_id ON chat_messages(target_character_id);
