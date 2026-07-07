-- 0031: Rename politics time columns from month to arc
BEGIN;

DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='pol_parties' and column_name='created_month') THEN
        ALTER TABLE pol_parties RENAME COLUMN created_month TO created_arc;
        ALTER TABLE pol_party_members RENAME COLUMN joined_month TO joined_arc;
        ALTER TABLE pol_cycles RENAME COLUMN start_month TO start_arc;
        ALTER TABLE pol_cycles RENAME COLUMN polling_month TO polling_arc;
        ALTER TABLE pol_cycles RENAME COLUMN formation_end_month TO formation_end_arc;
        ALTER TABLE pol_campaign_actions RENAME COLUMN resolved_month TO resolved_arc;
        ALTER TABLE pol_offices RENAME COLUMN since_month TO since_arc;
        ALTER TABLE pol_bills RENAME COLUMN proposed_month TO proposed_arc;
        ALTER TABLE pol_tenders RENAME COLUMN posted_month TO posted_arc;
        ALTER TABLE pol_tender_bids RENAME COLUMN created_month TO created_arc;
        ALTER TABLE pol_state_policy RENAME COLUMN updated_month TO updated_arc;
        ALTER TABLE pol_ledger_events RENAME COLUMN month TO arc;
    END IF;
END $$;

COMMIT;
