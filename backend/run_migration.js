const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });

client.connect().then(() => {
  const sql = `
CREATE TABLE IF NOT EXISTS company_acquisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'registration',
    registration_ends_month INTEGER NOT NULL,
    registration_ends_year INTEGER NOT NULL,
    bidding_ends_month INTEGER NOT NULL,
    bidding_ends_year INTEGER NOT NULL,
    min_next_bid NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_acquisition_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acquisition_id UUID NOT NULL REFERENCES company_acquisitions(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    bid_amount NUMERIC NOT NULL,
    post_acquisition_status VARCHAR(50) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_acquisition_bid_funding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL REFERENCES company_acquisition_bids(id) ON DELETE CASCADE,
    funding_type VARCHAR(50) NOT NULL,
    funding_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
  `;
  return client.query(sql);
}).then(() => {
  console.log('Migration OK');
  client.end();
}).catch(e => {
  console.error('Migration error:', e.message);
  client.end();
});
