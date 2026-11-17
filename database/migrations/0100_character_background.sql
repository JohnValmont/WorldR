-- 0100_character_background.sql
-- Character creation: the background a player chose (constants/characterCreation.ts)
-- and their answers to the sign-up convictions (same 0..100 axes as party platforms).
ALTER TABLE characters ADD COLUMN IF NOT EXISTS background VARCHAR(40);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS convictions JSONB;
