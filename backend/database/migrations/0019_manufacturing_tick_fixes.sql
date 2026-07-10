-- Fix 1: NPC state missing composite primary key (was causing ON CONFLICT clause to fail)
ALTER TABLE manufacturing_npc_state DROP CONSTRAINT IF EXISTS manufacturing_npc_state_pkey;
ALTER TABLE manufacturing_npc_state ADD PRIMARY KEY (company_id, vehicle_model_id);

-- Fix 2: Politics update missing conditions columns in pol_states (was causing tick to crash on final save)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pol_states' AND column_name='cond_prosperity') THEN
    ALTER TABLE pol_states
    ADD COLUMN cond_prosperity NUMERIC DEFAULT 50,
    ADD COLUMN cond_jobs NUMERIC DEFAULT 50,
    ADD COLUMN cond_order NUMERIC DEFAULT 50,
    ADD COLUMN cond_cohesion NUMERIC DEFAULT 50,
    ADD COLUMN cond_budget NUMERIC DEFAULT 50,
    ADD COLUMN cond_updated_arc VARCHAR(50);
  END IF;
END $$;
