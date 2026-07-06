import axios from 'axios';
import { db } from './src/config/database';

const API = 'http://localhost:4001/api/v1';

async function runTest() {
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'password123';
  const name = `TestUser ${Date.now()}`;
  let token = '';

  console.log('--- 1. AUTH ---');
  try {
    await axios.post(`${API}/auth/register`, { email, password, name });
    await db('users').where({ email }).update({ is_verified: true });
    
    const loginRes = await axios.post(`${API}/auth/login`, { email, password });
    token = loginRes.data.accessToken;
    console.log('Registered and logged in successfully. Token length:', token?.length);
  } catch (err: any) {
    console.error('Auth failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const client = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('\n--- 2. CHARACTER & WORLD ---');
  let charId;
  try {
    const charCreateRes = await client.post('/characters', {
      name: 'John Test',
      motherland_country_id: 'drennia',
      home_state_id: 'drennia-ironvale',
      currency_id: 'dollar'
    });
    charId = charCreateRes.data.id;
    console.log('Character created:', charId);
    
    const charRes = await client.get('/characters/me');
    console.log('Character loaded:', charRes.data.id);
  } catch (err: any) {
    console.error('Character operation failed:', err.response?.data || err.message);
  }

  try {
    const worldRes = await client.get('/world/clock');
    console.log('World clock loaded, active region:', worldRes.data.current_year);
  } catch (err: any) {
    console.error('World state load failed:', err.response?.data || err.message);
  }

  console.log('\n--- 3. COMPANY CREATION ---');
  let companyId;
  try {
    const compRes = await client.post('/companies', { 
      name: `TestCo ${Date.now()}`, 
      industry_id: 'manufacturing',
      country_id: 'drennia',
      headquarters_state_id: 'drennia-ironvale',
      subsector_id: 'automotive',
      legal_structure_id: 'private-company',
      currency_id: 'dollar',
      starting_capital: 100000
    });
    companyId = compRes.data.id;
    console.log('Company created:', companyId);
  } catch (err: any) {
    console.error('Company creation failed:', err.response?.data || err.message);
  }

  console.log('\n--- 4. MANUFACTURING ---');
  if (companyId) {
    try {
      const modelRes = await client.post(`/manufacturing/company/${companyId}/models`, {
        name: 'Model T',
        target_segment: 'standard',
        vehicle_class: 'sedan',
        platform_type: 'compact',
        power_unit_type: 'ice',
        drivetrain_type: 'fwd',
        interior_tier: 'basic',
        safety_tier: 'basic',
        sale_price: 15000,
        manufacturing_cost_per_unit: 10000,
        reliability_score: 50,
        performance_score: 50,
        fuel_efficiency_score: 50,
        appeal_score: 50,
        cargo_score: 50
      });
      console.log('Model created:', modelRes.data.id);
      
      const allocRes = await client.post(`/manufacturing/company/${companyId}/allocations`, {
        vehicle_model_id: modelRes.data.id,
        region_market_id: 'ironvale',
        units_allocated: 100,
        marketing_tier: 'none'
      });
      console.log('Allocation created:', allocRes.data.id);

      const stateRes = await client.get(`/manufacturing/company/${companyId}/state`);
      console.log('Manufacturing state loaded, finances:', stateRes.data.finances);
    } catch (err: any) {
      console.error('Manufacturing failed:', err.response?.data || err.message);
    }
  }

  console.log('\n--- 5. SHARE MARKET ---');
  try {
    const pubRes = await client.get('/exchange/listings');
    console.log('Public companies loaded, count:', pubRes.data.length);
  } catch (err: any) {
    console.error('Share market load failed:', err.response?.data || err.message);
  }

  console.log('\n--- 6. POLITICS ---');
  try {
    const polRes = await client.get('/politics/state');
    console.log('Politics state loaded:', polRes.data.activeState?.name);
    
    const apRes = await client.get('/politics/ap');
    console.log('Politics AP loaded:', apRes.data);
  } catch (err: any) {
    console.error('Politics load failed:', err.response?.data || err.message);
  }

  console.log('\nTest completed.');
  process.exit(0);
}

runTest();
