DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'manufacturing_npc_state_company_model_unique'
    ) THEN
        -- Safely delete duplicates keeping the most recently updated one
        DELETE FROM manufacturing_npc_state
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, vehicle_model_id ORDER BY updated_at DESC) as row_num
                FROM manufacturing_npc_state
            ) t
            WHERE t.row_num > 1
        );

        ALTER TABLE manufacturing_npc_state DROP CONSTRAINT IF EXISTS manufacturing_npc_state_company_id_unique; 
        ALTER TABLE manufacturing_npc_state DROP CONSTRAINT IF EXISTS manufacturing_npc_state_company_id_key; 
        ALTER TABLE manufacturing_npc_state ADD CONSTRAINT manufacturing_npc_state_company_model_unique UNIQUE (company_id, vehicle_model_id);
    END IF;
END $$;
