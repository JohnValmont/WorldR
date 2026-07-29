UPDATE world_clock
SET pol_next_arc_close_at = pol_next_arc_close_at - interval '8 hours'
WHERE pol_next_arc_close_at > NOW() + interval '8 hours' AND status = 'active';
