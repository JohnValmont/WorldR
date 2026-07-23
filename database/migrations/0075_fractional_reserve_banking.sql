CREATE TABLE IF NOT EXISTS banking_institutions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_treasury_injection BIGINT NOT NULL DEFAULT 0,
    total_deposits BIGINT NOT NULL DEFAULT 0,
    reserve_requirement_ratio NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,
    base_lending_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0500,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed State Bank of Drennia with 500 Billion
INSERT INTO banking_institutions (id, name, base_treasury_injection, total_deposits, reserve_requirement_ratio, base_lending_rate)
VALUES ('drennia-national', 'State Bank of Drennia', 500000000000, 0, 0.1000, 0.0500)
ON CONFLICT (id) DO NOTHING;

-- Drop existing bank_macro_rates if it exists and was just a placeholder
DROP TABLE IF EXISTS bank_macro_rates;

CREATE TABLE IF NOT EXISTS banking_active_loans (
    id SERIAL PRIMARY KEY,
    bank_id VARCHAR(50) REFERENCES banking_institutions(id),
    borrower_type VARCHAR(50) NOT NULL,
    borrower_id VARCHAR(50) NOT NULL,
    facility_type VARCHAR(50) NOT NULL,
    principal_amount BIGINT NOT NULL,
    remaining_principal BIGINT NOT NULL,
    interest_rate NUMERIC(5, 4) NOT NULL,
    monthly_payment BIGINT NOT NULL,
    next_payment_arc INT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
