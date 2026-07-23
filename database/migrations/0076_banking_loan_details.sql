ALTER TABLE banking_active_loans
ADD COLUMN IF NOT EXISTS amortization_type VARCHAR(50) DEFAULT 'amortizing',
ADD COLUMN IF NOT EXISTS purpose VARCHAR(255) DEFAULT 'general';
