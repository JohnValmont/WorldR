UPDATE world_clock
SET pol_next_arc_close_at = pol_next_arc_close_at - interval '8 hours'
WHERE pol_next_arc_close_at > next_arc_close_at AND status = 'active';
