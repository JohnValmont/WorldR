CREATE TABLE company_acquisition_bid_funding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_id UUID NOT NULL REFERENCES company_acquisition_bids(id) ON DELETE CASCADE,
    funding_type VARCHAR(50) NOT NULL,
    funding_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE company_acquisition_bids ADD COLUMN post_acquisition_status VARCHAR(50) DEFAULT 'public';
