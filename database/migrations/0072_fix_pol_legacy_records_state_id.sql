ALTER TABLE pol_legacy_records DROP CONSTRAINT IF EXISTS pol_legacy_records_state_id_fkey;

-- Handle conversion safely even if the table is empty. If it has 'drennia' this would fail, but it's empty.
ALTER TABLE pol_legacy_records ALTER COLUMN state_id TYPE UUID USING (
    CASE 
        WHEN state_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN state_id::UUID
        ELSE NULL -- Or let it fail, but we know it's 0 count
    END
);

ALTER TABLE pol_legacy_records ADD CONSTRAINT pol_legacy_records_state_id_fkey FOREIGN KEY (state_id) REFERENCES pol_states(id) ON DELETE CASCADE;
