-- WORLDr Database Migration: Manufacturing v0.1 Foundation
-- Universal tables. No Drennia-only schemas.

-- 1. MANUFACTURING SUBSECTORS
CREATE TABLE IF NOT EXISTS manufacturing_subsectors (
    id VARCHAR(100) PRIMARY KEY,
    industry_id VARCHAR(50) NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_playable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE manufacturing_subsectors ENABLE ROW LEVEL SECURITY;

-- 2. MANUFACTURING FACTORY TYPES (Catalogue)
CREATE TABLE IF NOT EXISTS manufacturing_factory_types (
    id VARCHAR(100) PRIMARY KEY,
    subsector_id VARCHAR(100) NOT NULL REFERENCES manufacturing_subsectors(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    base_capacity_per_arc INT NOT NULL DEFAULT 100,
    max_production_lines INT NOT NULL DEFAULT 1,
    base_lease_cost_per_arc NUMERIC(19, 4) NOT NULL DEFAULT 25000,
    base_maintenance_per_arc NUMERIC(19, 4) NOT NULL DEFAULT 8000,
    worker_requirement INT NOT NULL DEFAULT 30,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE manufacturing_factory_types ENABLE ROW LEVEL SECURITY;

-- 3. MANUFACTURING FACTORIES (Player-owned/leased)
CREATE TABLE IF NOT EXISTS manufacturing_factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    factory_type_id VARCHAR(100) NOT NULL REFERENCES manufacturing_factory_types(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    lease_cost_per_arc NUMERIC(19, 4) NOT NULL,
    maintenance_cost_per_arc NUMERIC(19, 4) NOT NULL,
    capacity_per_arc INT NOT NULL,
    machine_level INT NOT NULL DEFAULT 1,
    condition NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at_world_orbit INT NOT NULL,
    created_at_world_arc INT NOT NULL,
    created_at_world_mark INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_factories_company_id ON manufacturing_factories(company_id);
CREATE INDEX IF NOT EXISTS idx_mfg_factories_world_instance ON manufacturing_factories(world_instance_id);
ALTER TABLE manufacturing_factories ENABLE ROW LEVEL SECURITY;

-- 4. MANUFACTURING PRODUCTION LINES
CREATE TABLE IF NOT EXISTS manufacturing_production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    factory_id UUID NOT NULL REFERENCES manufacturing_factories(id) ON DELETE CASCADE,
    line_number INT NOT NULL DEFAULT 1,
    assigned_vehicle_model_id UUID,
    quality_setting VARCHAR(50) NOT NULL DEFAULT 'Standard',
    target_units_per_arc INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_prod_lines_factory_id ON manufacturing_production_lines(factory_id);
CREATE INDEX IF NOT EXISTS idx_mfg_prod_lines_company_id ON manufacturing_production_lines(company_id);
ALTER TABLE manufacturing_production_lines ENABLE ROW LEVEL SECURITY;

-- 5. MANUFACTURING VEHICLE MODELS
CREATE TABLE IF NOT EXISTS manufacturing_vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    vehicle_class VARCHAR(100) NOT NULL,
    platform_type VARCHAR(100) NOT NULL,
    power_unit_type VARCHAR(100) NOT NULL,
    drivetrain_type VARCHAR(100) NOT NULL,
    interior_tier VARCHAR(100) NOT NULL,
    safety_tier VARCHAR(100) NOT NULL,
    production_quality VARCHAR(100) NOT NULL DEFAULT 'Standard',
    manufacturing_cost_per_unit NUMERIC(19, 4) NOT NULL DEFAULT 0,
    reliability_score INT NOT NULL DEFAULT 50,
    performance_score INT NOT NULL DEFAULT 50,
    fuel_efficiency_score INT NOT NULL DEFAULT 50,
    appeal_score INT NOT NULL DEFAULT 50,
    cargo_score INT NOT NULL DEFAULT 30,
    target_segment VARCHAR(100) NOT NULL DEFAULT 'Economy',
    sale_price NUMERIC(19, 4) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at_world_orbit INT NOT NULL,
    created_at_world_arc INT NOT NULL,
    created_at_world_mark INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_vehicle_models_company_id ON manufacturing_vehicle_models(company_id);
ALTER TABLE manufacturing_vehicle_models ENABLE ROW LEVEL SECURITY;

-- Fix forward reference: now that manufacturing_vehicle_models exists, add FK to production_lines
ALTER TABLE manufacturing_production_lines
    ADD CONSTRAINT fk_prod_line_model
    FOREIGN KEY (assigned_vehicle_model_id) REFERENCES manufacturing_vehicle_models(id) ON DELETE SET NULL
    NOT VALID;

-- 6. MANUFACTURING REGION MARKETS (Universal)
CREATE TABLE IF NOT EXISTS manufacturing_region_markets (
    id VARCHAR(100) PRIMARY KEY,
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    population INT NOT NULL DEFAULT 500000,
    average_income NUMERIC(19, 4) NOT NULL DEFAULT 35000,
    economic_multiplier NUMERIC(5, 3) NOT NULL DEFAULT 1.000,
    preference_compact NUMERIC(5, 3) NOT NULL DEFAULT 0.400,
    preference_sedan NUMERIC(5, 3) NOT NULL DEFAULT 0.350,
    preference_utility_van NUMERIC(5, 3) NOT NULL DEFAULT 0.250,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_markets_country_id ON manufacturing_region_markets(country_id);
CREATE INDEX IF NOT EXISTS idx_mfg_markets_state_id ON manufacturing_region_markets(state_id);
ALTER TABLE manufacturing_region_markets ENABLE ROW LEVEL SECURITY;

-- 7. MANUFACTURING INVENTORY
CREATE TABLE IF NOT EXISTS manufacturing_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_model_id UUID NOT NULL REFERENCES manufacturing_vehicle_models(id) ON DELETE CASCADE,
    units_in_stock INT NOT NULL DEFAULT 0,
    inventory_value NUMERIC(19, 4) NOT NULL DEFAULT 0,
    storage_cost_per_arc NUMERIC(19, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, vehicle_model_id)
);
CREATE INDEX IF NOT EXISTS idx_mfg_inventory_company_id ON manufacturing_inventory(company_id);
ALTER TABLE manufacturing_inventory ENABLE ROW LEVEL SECURITY;

-- 8. MANUFACTURING ARC REPORTS
CREATE TABLE IF NOT EXISTS manufacturing_arc_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    world_orbit INT NOT NULL,
    world_arc INT NOT NULL,
    world_mark INT NOT NULL,
    units_produced INT NOT NULL DEFAULT 0,
    units_sold INT NOT NULL DEFAULT 0,
    units_unsold INT NOT NULL DEFAULT 0,
    gross_revenue NUMERIC(19, 4) NOT NULL DEFAULT 0,
    production_costs NUMERIC(19, 4) NOT NULL DEFAULT 0,
    staff_wages NUMERIC(19, 4) NOT NULL DEFAULT 0,
    factory_lease_costs NUMERIC(19, 4) NOT NULL DEFAULT 0,
    factory_maintenance_costs NUMERIC(19, 4) NOT NULL DEFAULT 0,
    inventory_storage_costs NUMERIC(19, 4) NOT NULL DEFAULT 0,
    net_profit NUMERIC(19, 4) NOT NULL DEFAULT 0,
    ending_cash NUMERIC(19, 4) NOT NULL DEFAULT 0,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_mfg_arc_report UNIQUE (company_id, world_orbit, world_arc)
);
CREATE INDEX IF NOT EXISTS idx_mfg_arc_reports_company_id ON manufacturing_arc_reports(company_id);
ALTER TABLE manufacturing_arc_reports ENABLE ROW LEVEL SECURITY;

-- 9. MANUFACTURING SALES RESULTS
CREATE TABLE IF NOT EXISTS manufacturing_sales_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_model_id UUID NOT NULL REFERENCES manufacturing_vehicle_models(id) ON DELETE CASCADE,
    region_market_id VARCHAR(100) NOT NULL REFERENCES manufacturing_region_markets(id) ON DELETE RESTRICT,
    world_orbit INT NOT NULL,
    world_arc INT NOT NULL,
    units_sold INT NOT NULL DEFAULT 0,
    sale_price NUMERIC(19, 4) NOT NULL DEFAULT 0,
    revenue NUMERIC(19, 4) NOT NULL DEFAULT 0,
    market_share_estimate NUMERIC(5, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfg_sales_company_id ON manufacturing_sales_results(company_id);
ALTER TABLE manufacturing_sales_results ENABLE ROW LEVEL SECURITY;
