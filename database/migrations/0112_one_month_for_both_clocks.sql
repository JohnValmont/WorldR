-- Players see ONE month: the business and politics months must turn together
-- (owner decision 2026-11-18: one game month = 8 real hours on both clocks).
--
-- The live world was restarted on 2026-11-19 with a 24-hour first politics month
-- (seed 0001 has since been fixed), so the hub's countdown and the politics
-- countdown disagreed by 8 hours. If the politics month ends after the business
-- month, end it with the business month. From then on the ticks keep them in
-- step (worldClock.rules alignedNextClose). Idempotent: once aligned, no-op.
UPDATE world_clock
SET pol_next_arc_close_at = next_arc_close_at,
    updated_at = NOW()
WHERE next_arc_close_at IS NOT NULL
  AND pol_next_arc_close_at > next_arc_close_at
  AND next_arc_close_at > NOW()
  AND pol_real_seconds_per_month = real_seconds_per_month;
