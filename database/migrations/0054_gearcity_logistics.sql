-- Migration 0054: GearCity Logistics & Real Estate Foundation

-- 1. Create Land Plots table (preparation for hex-map)
CREATE TABLE IF NOT EXISTS manufacturing_land_plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    total_acres INT NOT NULL DEFAULT 1,
    used_acres INT NOT NULL DEFAULT 0,
    purchase_price NUMERIC(19, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_land_plots_company_id ON manufacturing_land_plots(company_id);
ALTER TABLE manufacturing_land_plots ENABLE ROW LEVEL SECURITY;

-- 2. Create State Licenses table
CREATE TABLE IF NOT EXISTS company_state_licenses (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY(company_id, state_id)
);

-- 3. Modify Factories
ALTER TABLE manufacturing_factories
  ADD COLUMN IF NOT EXISTS land_plot_id UUID REFERENCES manufacturing_land_plots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50) DEFAULT 'owned',
  ADD COLUMN IF NOT EXISTS building_status VARCHAR(50) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS building_completion_year INT,
  ADD COLUMN IF NOT EXISTS building_completion_month INT;

-- 4. Modify Production Lines
ALTER TABLE manufacturing_production_lines
  ADD COLUMN IF NOT EXISTS construction_status VARCHAR(50) DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS construction_completion_year INT,
  ADD COLUMN IF NOT EXISTS construction_completion_month INT;

-- 5. Backfill Factories (make them owned and assign to HQ state)
UPDATE manufacturing_factories f
SET 
  state_id = c.headquarters_state_id,
  lease_cost_per_month = 0
FROM companies c
WHERE f.company_id = c.id;
