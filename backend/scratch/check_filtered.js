const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(async () => {
  const companyId = 'd84d37c9-4449-4d1c-a237-33ab7b3e7fba'; // Aldrich Automobiles
  
  const joinedAllocations = await client.query(`
    SELECT a.*, 
           m.name as model_name, m.vehicle_class, m.target_segment, m.development_status, m.sale_price
    FROM manufacturing_market_allocations a
    JOIN manufacturing_vehicle_models m ON a.vehicle_model_id = m.id
    WHERE a.company_id = $1 AND m.development_status IN ('launched', 'discontinued')
  `, [companyId]);

  const byMarket = {};
  for (const a of joinedAllocations.rows) {
    if (!byMarket[a.region_market_id]) byMarket[a.region_market_id] = { all: [], nonZero: [] };
    byMarket[a.region_market_id].all.push(a.model_name);
    if (a.units_allocated > 0) byMarket[a.region_market_id].nonZero.push(a.model_name);
  }

  for (const [mkt, data] of Object.entries(byMarket)) {
    console.log(`Market ${mkt}: All=${data.all.length}, NonZero=${data.nonZero.length}`);
  }

  client.end();
});
