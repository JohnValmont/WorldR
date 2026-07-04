-- WORLDr Database Migration: Logistics Operations Online

-- 1. PROCUREMENT VEHICLES (Catalogue)
CREATE TABLE IF NOT EXISTS procurement_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL UNIQUE,
    purchase_cost NUMERIC(19, 4) NOT NULL,
    capacity INT NOT NULL,
    monthly_maintenance NUMERIC(19, 4) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE procurement_vehicles ENABLE ROW LEVEL SECURITY;

-- 2. PROCUREMENT FACILITIES (Catalogue)
CREATE TABLE IF NOT EXISTS procurement_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL UNIQUE,
    lease_cost_per_month NUMERIC(19, 4) NOT NULL,
    capacity INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE procurement_facilities ENABLE ROW LEVEL SECURITY;

-- 3. OPERATION POOLS (Global)
CREATE TABLE IF NOT EXISTS operation_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    required_capacity INT NOT NULL DEFAULT 1,
    base_revenue_per_month NUMERIC(19, 4) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE operation_pools ENABLE ROW LEVEL SECURITY;

-- 4. COMPANY STAFF
CREATE TABLE IF NOT EXISTS company_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, role)
);
CREATE INDEX IF NOT EXISTS idx_company_staff_company_id ON company_staff(company_id);
ALTER TABLE company_staff ENABLE ROW LEVEL SECURITY;

-- 5. COMPANY VEHICLES
CREATE TABLE IF NOT EXISTS company_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    catalog_vehicle_id UUID NOT NULL REFERENCES procurement_vehicles(id) ON DELETE RESTRICT,
    condition NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    assigned_operation_pool_id UUID REFERENCES operation_pools(id) ON DELETE SET NULL,
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_company_id ON company_vehicles(company_id);
ALTER TABLE company_vehicles ENABLE ROW LEVEL SECURITY;

-- 6. COMPANY FACILITIES
CREATE TABLE IF NOT EXISTS company_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    catalog_facility_id UUID NOT NULL REFERENCES procurement_facilities(id) ON DELETE RESTRICT,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    leased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_facilities_company_id ON company_facilities(company_id);
ALTER TABLE company_facilities ENABLE ROW LEVEL SECURITY;

-- 7. COMPANY LEDGER
CREATE TABLE IF NOT EXISTS company_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    game_year INT NOT NULL,
    game_month INT NOT NULL,
    game_day INT NOT NULL,
    entry_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    balance_after NUMERIC(19, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_ledger_company_id ON company_ledger(company_id);
ALTER TABLE company_ledger ENABLE ROW LEVEL SECURITY;
