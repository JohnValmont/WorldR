CREATE TABLE IF NOT EXISTS company_debt_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  principal_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  term_months INTEGER NOT NULL,
  months_remaining INTEGER NOT NULL,
  monthly_payment DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
