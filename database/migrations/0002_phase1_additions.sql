-- WORLDr Database Migration: Phase 1 Additions (Templates, Prices, Audit Logs)
-- Target Database: PostgreSQL 13+

-- ============================================================================
-- 1. NATION TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS nation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    treasury NUMERIC(20, 2) NOT NULL DEFAULT 1000000000.00,
    debt NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    gdp NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    inflation_food NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    inflation_fuel NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    inflation_housing NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    inflation_cpi NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    approval NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    stability NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nation_templates IS 'Holds pre-configured nation settings to dynamically instantiate new lobbies.';

-- ============================================================================
-- 2. PRICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID NOT NULL REFERENCES nations(id) ON DELETE CASCADE,
    sector_name VARCHAR(50) NOT NULL,
    price_index NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    base_price NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    inflation_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT check_price_sector CHECK (sector_name IN ('Agriculture', 'Industry', 'Services', 'Energy', 'Construction')),
    UNIQUE (nation_id, sector_name)
);

CREATE INDEX IF NOT EXISTS idx_prices_nation_id ON prices(nation_id);

COMMENT ON TABLE prices IS 'Tracks sector-specific prices and local inflation rates.';

-- ============================================================================
-- 3. AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nation_id UUID REFERENCES nations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_nation_id ON audit_logs(nation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

COMMENT ON TABLE audit_logs IS 'System audit trail logging player updates and ticks execution histories.';
