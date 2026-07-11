-- Fix Primary Key on manufacturing_npc_state to allow tracking per-vehicle model
ALTER TABLE manufacturing_npc_state DROP CONSTRAINT manufacturing_npc_state_pkey;
ALTER TABLE manufacturing_npc_state ADD PRIMARY KEY (company_id, vehicle_model_id);
