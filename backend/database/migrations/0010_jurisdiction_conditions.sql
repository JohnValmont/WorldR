-- UP
-- Task E — Jurisdiction Conditions (GDD v0.5 §11).
-- Five per-state indicators moved by the governing party's active policy, which
-- feed bloc turnout and trigger deterministic crisis events at thresholds.
-- Prosperity / Jobs / Order / Cohesion / Budget on a 0–10 scale (v0: Budget is a
-- fiscal-health index; a full money ledger is a later refinement). Existing rows
-- default to the neutral midpoint (5.00). Idempotent.
BEGIN;

ALTER TABLE pol_states
  ADD COLUMN IF NOT EXISTS cond_prosperity  NUMERIC(4,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cond_jobs        NUMERIC(4,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cond_order       NUMERIC(4,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cond_cohesion    NUMERIC(4,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cond_budget      NUMERIC(4,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cond_updated_arc INTEGER      NOT NULL DEFAULT 0;

COMMIT;
