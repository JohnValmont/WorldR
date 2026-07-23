ALTER TABLE banking_active_loans
ADD COLUMN IF NOT EXISTS amortization_type VARCHAR(50) DEFAULT 'amortizing',
ADD COLUMN IF NOT EXISTS purpose VARCHAR(255) DEFAULT 'general';

CREATE TABLE IF NOT EXISTS company_credit_ratings (
    company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
    world_year INTEGER,
    world_month INTEGER,
    rating_tier VARCHAR(5),
    risk_score NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, world_year, world_month)
);
