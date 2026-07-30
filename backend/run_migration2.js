const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });

client.connect().then(() => {
  const sql = `
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS world_instance_id UUID REFERENCES world_instances(id);
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS reserve_price NUMERIC;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS registration_open_year INTEGER;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS registration_open_month INTEGER;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS bidding_start_year INTEGER;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS bidding_start_month INTEGER;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS bidding_end_year INTEGER;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS bidding_end_month INTEGER;
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS winner_character_id UUID REFERENCES characters(id);
ALTER TABLE company_acquisitions ADD COLUMN IF NOT EXISTS winning_bid_amount NUMERIC;

ALTER TABLE company_acquisition_bids ADD COLUMN IF NOT EXISTS game_year INTEGER;
ALTER TABLE company_acquisition_bids ADD COLUMN IF NOT EXISTS game_month INTEGER;
  `;
  return client.query(sql);
}).then(() => {
  console.log('Migration OK');
  client.end();
}).catch(e => {
  console.error('Migration error:', e.message);
  client.end();
});
