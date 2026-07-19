-- 0059_fix_cond_columns.sql

ALTER TABLE pol_states
  ALTER COLUMN cond_prosperity TYPE NUMERIC USING cond_prosperity::NUMERIC,
  ALTER COLUMN cond_jobs TYPE NUMERIC USING cond_jobs::NUMERIC,
  ALTER COLUMN cond_order TYPE NUMERIC USING cond_order::NUMERIC,
  ALTER COLUMN cond_cohesion TYPE NUMERIC USING cond_cohesion::NUMERIC,
  ALTER COLUMN cond_budget TYPE NUMERIC USING cond_budget::NUMERIC;
