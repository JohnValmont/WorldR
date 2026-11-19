-- 0111_restore_columns_missing_from_fresh_install.sql
-- Three columns existed in the live database but no migration in this folder
-- created them (they came from the retired backend/database/migrations folder),
-- so a fresh install lacked them. The old fundraise action
-- (POST /politics/general-action, politics.controller doGeneralAction) reads and
-- writes pol_parties.last_fundraise_arc and failed on a fresh database.
-- Idempotent: safe on the live database, where the columns already exist.

ALTER TABLE pol_parties
  ADD COLUMN IF NOT EXISTS last_fundraise_arc INTEGER DEFAULT 0;

ALTER TABLE pol_active_policies
  ADD COLUMN IF NOT EXISTS is_national BOOLEAN DEFAULT FALSE;

ALTER TABLE pol_active_policies
  ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES pol_bills(id);
