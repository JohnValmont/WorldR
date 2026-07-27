-- UP
BEGIN;

TRUNCATE TABLE pol_scandals CASCADE;

ALTER TABLE pol_scandals DROP CONSTRAINT IF EXISTS pol_scandals_state_id_fkey;
ALTER TABLE pol_scandals ALTER COLUMN state_id TYPE UUID USING NULL;
ALTER TABLE pol_scandals ADD CONSTRAINT pol_scandals_state_id_fkey FOREIGN KEY (state_id) REFERENCES pol_states(id) ON DELETE CASCADE;

COMMIT;
