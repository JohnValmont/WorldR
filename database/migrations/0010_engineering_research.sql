-- WORLDr Migration 0010: Engineering Research
-- Adds manufacturing engineering programmes and vehicle engineering package application.

CREATE TABLE IF NOT EXISTS manufacturing_engineering_programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    programme_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'engineering',
    approved_budget NUMERIC(19, 4) NOT NULL DEFAULT 0,
    started_arc_orbit INT NOT NULL,
    started_arc INT NOT NULL,
    validation_arc_orbit INT NOT NULL,
    validation_arc INT NOT NULL,
    completion_arc_orbit INT NOT NULL,
    completion_arc INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_research_company_id ON manufacturing_engineering_programmes(company_id);
ALTER TABLE manufacturing_engineering_programmes ENABLE ROW LEVEL SECURITY;

ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS applied_engineering_package VARCHAR(100);
