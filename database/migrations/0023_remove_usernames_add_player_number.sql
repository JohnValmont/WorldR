-- WORLDr Database Migration: Remove Username, Add Player Number
-- Target Database: PostgreSQL 13+

-- 1. Add player_number as a SERIAL column to users table
ALTER TABLE users ADD COLUMN player_number SERIAL UNIQUE;

-- 2. Drop the username column
ALTER TABLE users DROP COLUMN username;

-- 3. Update the display_name to fallback to Player #N instead of username where it was the same
UPDATE users SET display_name = 'Player #' || player_number WHERE display_name IS NULL OR display_name = '';

-- 4. Add comments
COMMENT ON COLUMN users.player_number IS 'Sequential developer-facing ID for administrative ease.';
