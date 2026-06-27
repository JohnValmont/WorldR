require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');

async function runManualVerification() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('--- PART 1: MANUAL VERIFICATION (API SIMULATION) ---');
    
    // 1. Setup - Get a company and user
    let res = await client.query(`
      SELECT c.id as company_id, ch.user_id 
      FROM companies c 
      JOIN characters ch ON c.owner_character_id = ch.id 
      WHERE ch.user_id IS NOT NULL 
      LIMIT 1
    `);
    if (res.rows.length === 0) {
      console.log('FAIL: No company/user found in DB.');
      return;
    }
    const companyId = res.rows[0].company_id;
    const userId = res.rows[0].user_id;
    console.log(`PASS: Found User (${userId}) & Company (${companyId})`);

    // Give company cash
    await client.query("UPDATE company_finances SET available_cash = 1000000 WHERE company_id = $1", [companyId]);

    // We need a valid JWT to hit endpoints, but since we're in the backend environment, 
    // it's easier to use the database directly to simulate what the controller does,
    // OR we can generate a JWT using the backend secret.
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: userId, email: 'test@test.com', status: 'verified', verificationLevel: 1 }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
    
    const api = axios.create({
      baseURL: 'http://localhost:4000/api/v1',
      headers: { Authorization: `Bearer ${token}` }
    });

    // Step 1: Bootstrap / Engineering Programmes
    let programmesRes;
    try {
      programmesRes = await api.get(`/manufacturing/bootstrap`);
      const progs = programmesRes.data.engineeringProgrammes || programmesRes.data.data?.engineeringProgrammes;
      const sampleProg = progs['economy-tune'];
      if (sampleProg && sampleProg.budget !== undefined && sampleProg.baseDuration !== undefined && !Number.isNaN(sampleProg.budget)) {
        console.log('PASS: Engineering Programmes show valid Budget and Duration.');
      } else {
        console.log('FAIL: Engineering Programmes missing valid budget/duration.', sampleProg);
      }
    } catch(e) {
      console.log('FAIL: Bootstrap endpoint', e.response?.data || e.message);
    }

    // Step 2: Design a Vehicle
    const modelName = 'Test Car ' + Date.now();
    try {
      await api.post(`/companies/${companyId}/manufacturing/models`, {
        name: modelName,
        vehicleClass: 'Compact Car',
        platform: 'economy',
        powerUnit: 'small-i4',
        drivetrain: 'fwd',
        interiorTier: 'basic',
        safetyTier: 'standard',
        qualityTarget: 'standard',
        targetSegment: 'budget',
        salePrice: 15000,
        engineeringPriorities: { reliability: 20, performance: 15, fuel_economy: 20, comfort: 15, practicality: 15, mfg_simplicity: 15 },
        budgetAllocation: { powertrain: 50000, body: 50000, safety: 20000, interior: 20000, testing: 30000, production_eng: 20000, prototype_validation: 10000 }
      });
      console.log('PASS: Design a Vehicle submitted successfully (No 500/Constraint error).');
    } catch(e) {
      console.log('FAIL: Design a Vehicle', e.response?.data || e.message);
    }

    // Step 3: Check Vehicle Portfolio Persistence (via DB since no generic GET /models route)
    try {
      const modelsRes = await client.query("SELECT * FROM public.manufacturing_vehicle_models WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1", [companyId]);
      const newModel = modelsRes.rows[0];
      if (newModel && newModel.name === modelName) {
        if (newModel.engineering_balance_rating && newModel.unit_mfg_cost != null && !Number.isNaN(newModel.unit_mfg_cost)) {
          console.log(`PASS: Model Persisted with valid stats (Rating: ${newModel.engineering_balance_rating}, Cost: ${newModel.unit_mfg_cost})`);
        } else {
          console.log('FAIL: Model persisted but has NaN/null core stats.', newModel);
        }
      } else {
        console.log('FAIL: Model not found in DB after creation.');
      }
    } catch(e) {
      console.log('FAIL: Fetching models from DB', e.message);
    }

  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
runManualVerification();
