-- WORLDr Database Migration: Universal Online World Foundation

-- Enable Row Level Security broadly but don't add public policies yet.
-- This ensures secure default posture.

-- 1. WORLD INSTANCES
CREATE TABLE IF NOT EXISTS world_instances (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE world_instances ENABLE ROW LEVEL SECURITY;

-- 2. WORLD CLOCK
CREATE TABLE IF NOT EXISTS world_clock (
    world_instance_id VARCHAR(50) PRIMARY KEY REFERENCES world_instances(id) ON DELETE RESTRICT,
    current_orbit INT NOT NULL,
    current_arc INT NOT NULL,
    current_mark INT NOT NULL,
    real_seconds_per_arc INT NOT NULL,
    arc_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_arc_close_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE world_clock ENABLE ROW LEVEL SECURITY;

-- 3. CURRENCIES
CREATE TABLE IF NOT EXISTS currencies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    locale VARCHAR(20) NOT NULL,
    decimal_places INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

-- 4. COUNTRIES
CREATE TABLE IF NOT EXISTS countries (
    id VARCHAR(50) PRIMARY KEY,
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    currency_id VARCHAR(50) NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_countries_world_instance_id ON countries(world_instance_id);
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- 5. STATES
CREATE TABLE IF NOT EXISTS states (
    id VARCHAR(50) PRIMARY KEY,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_states_country_id ON states(country_id);
ALTER TABLE states ENABLE ROW LEVEL SECURITY;

-- 6. INDUSTRIES
CREATE TABLE IF NOT EXISTS industries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sector_id VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_playable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

-- 7. LEGAL STRUCTURES
CREATE TABLE IF NOT EXISTS legal_structures (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE legal_structures ENABLE ROW LEVEL SECURITY;

-- 8. CHARACTERS
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    motherland_country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    home_state_id VARCHAR(50) REFERENCES states(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    credibility INT NOT NULL DEFAULT 0,
    charisma INT NOT NULL DEFAULT 0,
    influence INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at_world_orbit INT NOT NULL,
    created_at_world_arc INT NOT NULL,
    created_at_world_mark INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_character_per_user_world UNIQUE (world_instance_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_world_instance_id ON characters(world_instance_id);
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- 9. CHARACTER FINANCES
CREATE TABLE IF NOT EXISTS character_finances (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE RESTRICT,
    currency_id VARCHAR(50) NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    cash_in_hand NUMERIC(19, 4) NOT NULL DEFAULT 0,
    net_worth NUMERIC(19, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE character_finances ENABLE ROW LEVEL SECURITY;

-- 10. COMPANIES
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
    owner_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE RESTRICT,
    country_id VARCHAR(50) NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    headquarters_state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    industry_id VARCHAR(50) NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    legal_structure_id VARCHAR(50) NOT NULL REFERENCES legal_structures(id) ON DELETE RESTRICT,
    currency_id VARCHAR(50) NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    reputation INT NOT NULL DEFAULT 0,
    reliability INT NOT NULL DEFAULT 0,
    created_at_world_orbit INT NOT NULL,
    created_at_world_arc INT NOT NULL,
    created_at_world_mark INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_company_name_per_world_country ON companies(world_instance_id, country_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_companies_owner_character_id ON companies(owner_character_id);
CREATE INDEX IF NOT EXISTS idx_companies_world_instance_id ON companies(world_instance_id);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 11. COMPANY FINANCES
CREATE TABLE IF NOT EXISTS company_finances (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE RESTRICT,
    currency_id VARCHAR(50) NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    available_cash NUMERIC(19, 4) NOT NULL DEFAULT 0,
    debt NUMERIC(19, 4) NOT NULL DEFAULT 0,
    company_value NUMERIC(19, 4) NOT NULL DEFAULT 0,
    last_arc_profit NUMERIC(19, 4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE company_finances ENABLE ROW LEVEL SECURITY;
