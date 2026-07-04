-- 0015_local_brand_awareness.sql
-- Additive migration for local brand history tracking to guarantee idempotency.

CREATE TABLE IF NOT EXISTS manufacturing_market_brand_arc_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    region_market_id VARCHAR(100) NOT NULL REFERENCES manufacturing_region_markets(id) ON DELETE RESTRICT,
    world_month INT NOT NULL,
    
    awareness_before INT NOT NULL,
    awareness_delta NUMERIC(10,4) NOT NULL,
    awareness_after INT NOT NULL,
    
    trust_before INT NOT NULL,
    trust_delta NUMERIC(10,4) NOT NULL,
    trust_after INT NOT NULL,
    
    market_marketing_spend NUMERIC(19,4) NOT NULL,
    effective_marketing_tier VARCHAR(50) NOT NULL,
    
    total_units_sold INT NOT NULL,
    weighted_reliability NUMERIC(10,4) NOT NULL,
    weighted_defect_rate NUMERIC(10,4) NOT NULL,
    
    primary_awareness_reason VARCHAR(255),
    primary_trust_reason VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_brand_arc_result UNIQUE (company_id, region_market_id, world_month)
);

CREATE INDEX IF NOT EXISTS idx_brand_arc_company ON manufacturing_market_brand_arc_results(company_id);
CREATE INDEX IF NOT EXISTS idx_brand_arc_company_market ON manufacturing_market_brand_arc_results(company_id, region_market_id);
ALTER TABLE manufacturing_market_brand_arc_results ENABLE ROW LEVEL SECURITY;
