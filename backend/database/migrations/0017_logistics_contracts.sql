CREATE TABLE IF NOT EXISTS company_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    issuer_name VARCHAR(255) NOT NULL,
    issuer_type VARCHAR(50) NOT NULL,
    reward NUMERIC(15, 2) NOT NULL,
    penalty NUMERIC(15, 2) NOT NULL,
    required_capacity NUMERIC NOT NULL,
    duration_months INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    assigned_vehicle_id UUID REFERENCES company_vehicles(id) ON DELETE SET NULL,
    start_month INT,
    start_year INT,
    due_month INT,
    due_year INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE company_vehicles ADD COLUMN IF NOT EXISTS assigned_contract_id UUID REFERENCES company_contracts(id) ON DELETE SET NULL;