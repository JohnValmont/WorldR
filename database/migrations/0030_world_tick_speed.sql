-- 0030: World tick system — set month length to 8 real hours (28800s)
-- and reset the tick schedule so the first automatic tick fires 8h from now.

ALTER TABLE world_clock ADD COLUMN IF NOT EXISTS real_seconds_per_month INT NOT NULL DEFAULT 28800;
ALTER TABLE world_clock ADD COLUMN IF NOT EXISTS month_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE world_clock ADD COLUMN IF NOT EXISTS next_arc_close_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

UPDATE world_clock
SET real_seconds_per_month = 28800,
    month_started_at = NOW(),
    next_arc_close_at = NOW() + INTERVAL '8 hours',
    updated_at = NOW()
WHERE world_instance_id = 'pre-alpha-world-1';
