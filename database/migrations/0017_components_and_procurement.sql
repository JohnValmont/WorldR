-- WORLDr Database Migration: Phase 4 Components & Procurement

-- 1. MANUFACTURING COMPONENT CATALOGUE
-- This is a universal list of raw materials/components that companies must buy.
CREATE TABLE IF NOT EXISTS manufacturing_component_catalogue (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    base_cost NUMERIC(19, 4) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE manufacturing_component_catalogue ENABLE ROW LEVEL SECURITY;

-- Insert the base generic components required for an automobile
INSERT INTO manufacturing_component_catalogue (id, name, category, base_cost) VALUES
('comp_engine', 'Engine Assembly', 'powertrain', 35.00),
('comp_transmission', 'Transmission', 'powertrain', 18.00),
('comp_tyres', 'Tyres (Set of 4)', 'chassis', 4.00),
('comp_steel', 'Steel Chassis & Body', 'materials', 20.00),
('comp_glass', 'Automotive Glass', 'materials', 5.00),
('comp_electronics', 'Electronic Control Units', 'electronics', 12.00)
ON CONFLICT (id) DO NOTHING;

-- 2. MANUFACTURING COMPONENT INVENTORY
-- Tracks how many of each component a company currently owns globally.
CREATE TABLE IF NOT EXISTS manufacturing_component_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    component_id VARCHAR(100) NOT NULL REFERENCES manufacturing_component_catalogue(id) ON DELETE RESTRICT,
    units_in_stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_company_component UNIQUE (company_id, component_id)
);
CREATE INDEX IF NOT EXISTS idx_mfg_comp_inv_company ON manufacturing_component_inventory(company_id);
ALTER TABLE manufacturing_component_inventory ENABLE ROW LEVEL SECURITY;

-- 3. MANUFACTURING PROCUREMENT HISTORY
-- Tracks orders placed by the company for components
CREATE TABLE IF NOT EXISTS manufacturing_procurement_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    component_id VARCHAR(100) NOT NULL REFERENCES manufacturing_component_catalogue(id) ON DELETE RESTRICT,
    units_ordered INT NOT NULL,
    unit_cost NUMERIC(19, 4) NOT NULL,
    total_cost NUMERIC(19, 4) NOT NULL,
    world_year INT NOT NULL,
    world_month INT NOT NULL,
    world_day INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_proc_hist_company ON manufacturing_procurement_history(company_id);
ALTER TABLE manufacturing_procurement_history ENABLE ROW LEVEL SECURITY;
