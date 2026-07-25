-- Add bidding_company_id to ipo_indications to allow corporate bidding
ALTER TABLE ipo_indications
ADD COLUMN bidding_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
