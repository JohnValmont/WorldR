-- Add separate columns for politics timing in world_clock
ALTER TABLE world_clock
  ADD COLUMN pol_current_year INTEGER DEFAULT 0,
  ADD COLUMN pol_current_month INTEGER DEFAULT 1,
  ADD COLUMN pol_real_seconds_per_month INTEGER DEFAULT 86400,
  ADD COLUMN pol_month_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN pol_next_arc_close_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 day';

-- Backfill initial politics values from existing clock where possible
UPDATE world_clock
SET pol_current_year = current_year,
    pol_current_month = current_month,
    pol_month_started_at = month_started_at,
    pol_next_arc_close_at = next_arc_close_at;
