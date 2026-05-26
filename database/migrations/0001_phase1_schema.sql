-- WORLDr Database Migration: Phase 1 Schema
-- Target Database: PostgreSQL 13+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. NATIONS
-- ============================================================================
CREATE TABLE nations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    treasury NUMERIC(20, 2) NOT NULL DEFAULT 1000000000.00,
    debt NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    gdp NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    inflation_food NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    inflation_fuel NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    inflation_housing NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    inflation_cpi NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    approval NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    stability NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    current_tick INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_approval_range CHECK (approval >= 0.0 AND approval <= 1.0),
    CONSTRAINT check_stability_range CHECK (stability >= 0.0 AND stability <= 1.0),
    CONSTRAINT check_current_tick CHECK (current_tick >= 0)
);

COMMENT ON TABLE nations IS 'Stores the core live state of simulated nation states.';
COMMENT ON COLUMN nations.treasury IS 'National reserve cash balance.';
COMMENT ON COLUMN nations.debt IS 'Accumulated national debt.';
COMMENT ON COLUMN nations.approval IS 'Aggregated approval rating of the government (0.0 to 1.0).';
COMMENT ON COLUMN nations.stability IS 'General national stability index (0.0 to 1.0).';
COMMENT ON COLUMN nations.current_tick IS 'Month index since the start of the simulation.';

-- ============================================================================
-- 2. USERS
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    nation_id UUID REFERENCES nations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_user_role CHECK (role IN ('user', 'admin', 'moderator'))
);

CREATE INDEX idx_users_nation_id ON users(nation_id);

COMMENT ON TABLE users IS 'User authentication and workspace configuration.';
COMMENT ON COLUMN users.role IS 'Security classification and permission privileges (user, admin, moderator).';
COMMENT ON COLUMN users.nation_id IS 'Associated nation currently governed by the user.';

-- ============================================================================
-- 3. ECONOMIC SECTORS
-- ============================================================================
CREATE TABLE economic_sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    output NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    workers NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    productivity NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    wages NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    growth NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_sector_name CHECK (name IN ('Agriculture', 'Industry', 'Services', 'Energy', 'Construction')),
    UNIQUE (nation_id, name)
);

CREATE INDEX idx_economic_sectors_nation_id ON economic_sectors(nation_id);

COMMENT ON TABLE economic_sectors IS 'Tracks output, wages, and employment metrics for national economic sectors.';
COMMENT ON COLUMN economic_sectors.name IS 'Restricted to Phase 1 sectors: Agriculture, Industry, Services, Energy, Construction.';

-- ============================================================================
-- 4. POPULATION GROUPS
-- ============================================================================
CREATE TABLE population_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    size NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    income NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    approval NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    ideology VARCHAR(100),
    inflation_sensitivity NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    unemployment_sensitivity NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_population_group_name CHECK (name IN ('Poor', 'Working', 'Middle', 'Wealthy', 'Elite')),
    CONSTRAINT check_pop_group_approval CHECK (approval >= 0.0 AND approval <= 1.0),
    UNIQUE (nation_id, name)
);

CREATE INDEX idx_population_groups_nation_id ON population_groups(nation_id);

COMMENT ON TABLE population_groups IS 'Maintains live state, size, income and approval rating per socio-economic population class.';

-- ============================================================================
-- 5. TAXES
-- ============================================================================
CREATE TABLE taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1500,
    revenue NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_tax_name CHECK (name IN ('Income Tax', 'Corporate Tax', 'Sales Tax', 'Property Tax', 'Tariffs')),
    CONSTRAINT check_tax_rate CHECK (rate >= 0.0 AND rate <= 1.0),
    UNIQUE (nation_id, name)
);

CREATE INDEX idx_taxes_nation_id ON taxes(nation_id);

COMMENT ON TABLE taxes IS 'Simulates taxation structures and revenue generation settings for the budget system.';

-- ============================================================================
-- 6. BUDGET ITEMS
-- ============================================================================
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    allocation NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_budget_item_name CHECK (name IN ('Education', 'Healthcare', 'Infrastructure', 'Welfare', 'Administration')),
    UNIQUE (nation_id, name)
);

CREATE INDEX idx_budget_items_nation_id ON budget_items(nation_id);

COMMENT ON TABLE budget_items IS 'Defines spending categorizations and financial distributions for simulated nations.';

-- ============================================================================
-- 7. LAWS
-- ============================================================================
CREATE TABLE laws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'passed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_law_status CHECK (status IN ('passed', 'proposed', 'repealed'))
);

CREATE INDEX idx_laws_nation_id ON laws(nation_id);

COMMENT ON TABLE laws IS 'Governs policies that apply modifiers to parameters and sub-systems within a nation.';

-- ============================================================================
-- 8. LAW EFFECTS
-- ============================================================================
CREATE TABLE law_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_name VARCHAR(100) NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    modifier_type VARCHAR(20) NOT NULL,
    modifier_value NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_effect_target CHECK (target_type IN ('sector', 'population_group', 'tax', 'budget_item', 'nation')),
    CONSTRAINT check_modifier_type CHECK (modifier_type IN ('multiplier', 'additive'))
);

CREATE INDEX idx_law_effects_law_id ON law_effects(law_id);

COMMENT ON TABLE law_effects IS 'Detailed numeric modifications mapping to target sub-systems generated by active laws.';

-- ============================================================================
-- 9. PARAMETERS
-- ============================================================================
CREATE TABLE parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    value NUMERIC(20, 6) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE (category, name)
);

CREATE INDEX idx_parameters_category ON parameters(category);

COMMENT ON TABLE parameters IS 'Global simulation balancing variables and base rates.';

-- ============================================================================
-- 10. HISTORICAL SNAPSHOTS
-- ============================================================================
CREATE TABLE historical_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    tick INTEGER NOT NULL,
    gdp NUMERIC(20, 2) NOT NULL,
    inflation_food NUMERIC(5, 4) NOT NULL,
    inflation_fuel NUMERIC(5, 4) NOT NULL,
    inflation_housing NUMERIC(5, 4) NOT NULL,
    inflation_cpi NUMERIC(5, 4) NOT NULL,
    unemployment_rate NUMERIC(5, 4) NOT NULL,
    approval NUMERIC(5, 4) NOT NULL,
    stability NUMERIC(5, 4) NOT NULL,
    treasury NUMERIC(20, 2) NOT NULL,
    debt NUMERIC(20, 2) NOT NULL,
    revenue NUMERIC(20, 2) NOT NULL,
    spending NUMERIC(20, 2) NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_snapshot_tick CHECK (tick >= 0),
    UNIQUE (nation_id, tick)
);

CREATE INDEX idx_historical_snapshots_nation_tick ON historical_snapshots(nation_id, tick);

COMMENT ON TABLE historical_snapshots IS 'Stores monthly snapshot records of simulated nations for charting and performance tracking.';
COMMENT ON COLUMN historical_snapshots.snapshot_data IS 'A JSONB payload containing detailed nested sector, population group, and active law stats.';

-- ============================================================================
-- 11. NATION PARAMETER OVERRIDES
-- ============================================================================
CREATE TABLE nation_parameter_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    value NUMERIC(20, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE (nation_id, category, name)
);

CREATE INDEX idx_nation_parameter_overrides_lookup ON nation_parameter_overrides(nation_id, category, name);

COMMENT ON TABLE nation_parameter_overrides IS 'Provides custom balancing variables on a per-nation basis, overriding global defaults.';

-- ============================================================================
-- 12. REFRESH TOKENS
-- ============================================================================
CREATE TABLE refresh_tokens (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

COMMENT ON TABLE refresh_tokens IS 'Stores cryptographically hashed long-lived refresh tokens for secure session rotation.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the generated refresh token string.';
