-- WORLDr Database Migration: Vehicle Development Timer and Company Records

-- 1. Add timer columns to manufacturing_vehicle_models
ALTER TABLE manufacturing_vehicle_models 
ADD COLUMN IF NOT EXISTS development_started_at_orbit INT,
ADD COLUMN IF NOT EXISTS development_started_at_arc INT,
ADD COLUMN IF NOT EXISTS development_completes_at_orbit INT,
ADD COLUMN IF NOT EXISTS development_completes_at_arc INT;

-- 2. Create company_records table for backend history events
CREATE TABLE IF NOT EXISTS company_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL DEFAULT 'business',
    summary TEXT NOT NULL,
    created_at_world_orbit INT NOT NULL,
    created_at_world_arc INT NOT NULL,
    created_at_world_mark INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_records_company_id ON company_records(company_id);
CREATE INDEX IF NOT EXISTS idx_company_records_world_instance_id ON company_records(world_instance_id);

ALTER TABLE company_records ENABLE ROW LEVEL SECURITY;
