CREATE TABLE IF NOT EXISTS manufacturing_market_brand_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    region_market_id VARCHAR(100) NOT NULL REFERENCES manufacturing_region_markets(id),
    milestone_type VARCHAR(100) NOT NULL,
    reached_world_arc INTEGER NOT NULL,
    company_record_id UUID REFERENCES company_records(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, region_market_id, milestone_type)
);
