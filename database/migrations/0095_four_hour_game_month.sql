-- 0095_four_hour_game_month.sql
-- Revival plan, Phase 1: one game month = 4 real hours (was 8), for both the
-- business and the politics clocks. Players see results the same day: a new
-- car (2-3 game months of development) now finishes in 8-12 real hours.
--
-- Only clocks still on an old default are changed (8 h business; 8 h or the
-- 24 h column default for politics, see 0073), so a speed an admin set
-- deliberately (PATCH /world/clock/speed) is left alone. Ticks already
-- scheduled keep their time; every tick after that runs on the new speed.
-- Revert with: UPDATE world_clock SET real_seconds_per_month = 28800, pol_real_seconds_per_month = 28800;

UPDATE world_clock
   SET real_seconds_per_month = 14400, updated_at = NOW()
 WHERE real_seconds_per_month = 28800;

UPDATE world_clock
   SET pol_real_seconds_per_month = 14400, updated_at = NOW()
 WHERE pol_real_seconds_per_month IN (28800, 86400) OR pol_real_seconds_per_month IS NULL;
