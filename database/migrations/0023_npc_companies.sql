-- Migration to add NPC capabilities to manufacturing companies

-- 1. Add NPC columns to companies table
ALTER TABLE companies
ADD COLUMN is_npc BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN npc_personality VARCHAR(50);

CREATE INDEX idx_companies_is_npc ON companies(is_npc);

-- 2. Create the manufacturing_npc_state table for memory
CREATE TABLE manufacturing_npc_state (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_model_id UUID REFERENCES manufacturing_vehicle_models(id) ON DELETE CASCADE,
    last_market_share NUMERIC(5,4) NOT NULL DEFAULT 0,
    last_units_sold INT NOT NULL DEFAULT 0,
    zero_demand_streak INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


