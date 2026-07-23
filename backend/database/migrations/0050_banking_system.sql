CREATE TABLE IF NOT EXISTS bank_macro_rates (
    id SERIAL PRIMARY KEY,
    world_year INTEGER,
    world_month INTEGER,
    country_id VARCHAR(50) DEFAULT 'drennia',
    base_rate NUMERIC DEFAULT 0.05,
    credit_liquidity_multiplier NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(world_year, world_month, country_id)
);

CREATE TABLE IF NOT EXISTS company_debt_facilities (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    bank_id VARCHAR(50), 
    facility_type VARCHAR(50), -- 'rcf', 'tla', 'growth', 'distressed'
    principal_amount NUMERIC DEFAULT 0,
    drawn_amount NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0, 
    term_months INTEGER DEFAULT 0,
    months_remaining INTEGER DEFAULT 0,
    monthly_payment NUMERIC DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'breach', 'default', 'cleared'
    
    cov_min_cash NUMERIC DEFAULT 0,
    cov_dividend_block BOOLEAN DEFAULT false,
    cov_interest_coverage NUMERIC DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_credit_ratings (
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    world_year INTEGER,
    world_month INTEGER,
    rating_tier VARCHAR(5),
    risk_score NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, world_year, world_month)
);

-- Insert initial base rate if the table is empty
INSERT INTO bank_macro_rates (world_year, world_month, country_id, base_rate, credit_liquidity_multiplier)
VALUES (1, 1, 'drennia', 0.05, 1.0)
ON CONFLICT DO NOTHING;
