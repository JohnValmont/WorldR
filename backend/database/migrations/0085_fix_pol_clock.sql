UPDATE world_clock 
SET 
  pol_real_seconds_per_month = 28800,
  real_seconds_per_month = 28800,
  pol_next_arc_close_at = next_arc_close_at + interval '2 hours'
WHERE status = 'active';
