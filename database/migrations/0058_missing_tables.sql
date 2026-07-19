-- 0058_missing_tables.sql

-- 1. Equity Placements
CREATE TABLE IF NOT EXISTS equity_placements (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    seller_character_id UUID NOT NULL REFERENCES characters(id),
    target_character_id UUID REFERENCES characters(id),
    shares NUMERIC NOT NULL,
    min_purchase_shares NUMERIC NOT NULL,
    price_per_share NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Character Net Worth History
CREATE TABLE IF NOT EXISTS character_net_worth_history (
    character_id UUID NOT NULL REFERENCES characters(id),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id),
    world_year INTEGER NOT NULL,
    world_month INTEGER NOT NULL,
    cash_in_hand NUMERIC NOT NULL,
    equity_value NUMERIC NOT NULL,
    total_net_worth NUMERIC NOT NULL,
    PRIMARY KEY (character_id, world_year, world_month)
);

-- 3. Company Contracts (Logistics)
CREATE TABLE IF NOT EXISTS company_contracts (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    issuer_name VARCHAR(255) NOT NULL,
    issuer_type VARCHAR(50) NOT NULL,
    reward NUMERIC NOT NULL,
    penalty NUMERIC NOT NULL,
    required_capacity NUMERIC NOT NULL,
    duration_months INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    assigned_vehicle_id UUID,
    start_month INTEGER NOT NULL,
    start_year INTEGER NOT NULL,
    due_month INTEGER NOT NULL,
    due_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Company Vehicles column update
ALTER TABLE company_vehicles
  ADD COLUMN IF NOT EXISTS assigned_contract_id UUID REFERENCES company_contracts(id);

-- Wait, company_contracts.assigned_vehicle_id needs to reference company_vehicles?
-- It could be a circular dependency, but we can just leave it as UUID since postgres allows it without foreign key constraint, or add foreign key constraint if preferred.
ALTER TABLE company_contracts
  ADD CONSTRAINT fk_assigned_vehicle FOREIGN KEY (assigned_vehicle_id) REFERENCES company_vehicles(id);
