-- 0092_user_last_seen.sql
-- Track when each account last used the game, so we can show real
-- "active players" numbers (Chronicle, landing page) and later decide when a
-- new starter nation should open. Updated at most every few minutes by the
-- auth middleware (see LAST_SEEN_UPDATE_INTERVAL_MS in constants/world.ts).

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);
