CREATE TABLE IF NOT EXISTS character_debt_facilities (
    id UUID PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    bank_id VARCHAR(50), 
    facility_type VARCHAR(50),
    principal_amount NUMERIC DEFAULT 0,
    drawn_amount NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0, 
    term_months INTEGER DEFAULT 0,
    months_remaining INTEGER DEFAULT 0,
    monthly_payment NUMERIC DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS character_credit_ratings (
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    world_year INTEGER,
    world_month INTEGER,
    rating_tier VARCHAR(5),
    risk_score NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (character_id, world_year, world_month)
);
