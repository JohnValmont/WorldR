-- UP
BEGIN;

ALTER TABLE pol_states ADD COLUMN IF NOT EXISTS stat_gdp NUMERIC(15,2) NOT NULL DEFAULT 1000000.00;
ALTER TABLE pol_states ADD COLUMN IF NOT EXISTS stat_unemployment NUMERIC(4,2) NOT NULL DEFAULT 5.00;
ALTER TABLE pol_states ADD COLUMN IF NOT EXISTS stat_pollution NUMERIC(5,2) NOT NULL DEFAULT 50.00;
ALTER TABLE pol_states ADD COLUMN IF NOT EXISTS stat_per_capita NUMERIC(10,2) NOT NULL DEFAULT 45000.00;
ALTER TABLE pol_states ADD COLUMN IF NOT EXISTS stat_tax_revenue NUMERIC(15,2) NOT NULL DEFAULT 150000.00;

ALTER TABLE pol_state_policy ADD COLUMN IF NOT EXISTS active_policies JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE pol_state_policy 
SET active_policies = '{
  "taxation": "standard",
  "labor": "regulated",
  "environment": "standard",
  "welfare": "standard"
}'::jsonb;

ALTER TABLE pol_state_policy DROP COLUMN IF EXISTS industry_tax_rate;
ALTER TABLE pol_state_policy DROP COLUMN IF EXISTS infrastructure_level;

DELETE FROM pol_bills WHERE type IN ('industry_tax', 'infrastructure');

COMMIT;
