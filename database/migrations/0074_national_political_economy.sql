-- UP
BEGIN;

ALTER TABLE pol_states DROP COLUMN IF EXISTS cond_prosperity;
ALTER TABLE pol_states DROP COLUMN IF EXISTS cond_jobs;
ALTER TABLE pol_states DROP COLUMN IF EXISTS cond_order;
ALTER TABLE pol_states DROP COLUMN IF EXISTS cond_cohesion;
ALTER TABLE pol_states DROP COLUMN IF EXISTS cond_budget;
ALTER TABLE pol_states DROP COLUMN IF EXISTS cond_updated_arc;

ALTER TABLE pol_states DROP COLUMN IF EXISTS stat_gdp;
ALTER TABLE pol_states DROP COLUMN IF EXISTS stat_unemployment;
ALTER TABLE pol_states DROP COLUMN IF EXISTS stat_pollution;
ALTER TABLE pol_states DROP COLUMN IF EXISTS stat_per_capita;
ALTER TABLE pol_states DROP COLUMN IF EXISTS stat_tax_revenue;

-- 9 Core Stats (Baseline / Organic)
ALTER TABLE pol_states ADD COLUMN base_prosperity NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_cost_of_living NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_fiscal_health NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_equity NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_human_development NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_order_safety NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_freedom_rights NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_bureaucracy NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN base_global_standing NUMERIC(10,2) NOT NULL DEFAULT 50.00;

ALTER TABLE pol_states ADD COLUMN civil_service_stance VARCHAR(50) NOT NULL DEFAULT 'neglect';

-- 9 Core Stats (Current, taking active policies into account)
ALTER TABLE pol_states ADD COLUMN stat_prosperity NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_cost_of_living NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_fiscal_health NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_equity NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_human_development NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_order_safety NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_freedom_rights NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_bureaucracy NUMERIC(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN stat_global_standing NUMERIC(10,2) NOT NULL DEFAULT 50.00;

-- Additional raw trackers as described by design doc
ALTER TABLE pol_states ADD COLUMN raw_gdp NUMERIC(19,4) NOT NULL DEFAULT 1000000.00;
ALTER TABLE pol_states ADD COLUMN raw_population INTEGER NOT NULL DEFAULT 5000000;

CREATE TABLE pol_active_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    option_id VARCHAR(100) NOT NULL,
    enacted_month INTEGER NOT NULL,
    base_rollout_months NUMERIC(10,2) NOT NULL,
    natural_lag_months NUMERIC(10,2) NOT NULL,
    target_effects JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(state_id, category)
);

DELETE FROM pol_bills;
DELETE FROM pol_state_policy;

COMMIT;
