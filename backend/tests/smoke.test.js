require('dotenv').config();
const axios = require('axios');
const { Client } = require('pg');
const assert = require('assert');
const test = require('node:test');

test('Core Loop Smoke Test', async (t) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let api;
  let companyId, userId;
  const modelName = 'SmokeTest Model ' + Date.now();
  let modelId;
  let factoryId;

  try {
    // === SETUP ===
    await t.test('Setup: Create or find test user and company', async () => {
      let res = await client.query(`
        SELECT c.id as company_id, ch.user_id 
        FROM companies c 
        JOIN characters ch ON c.owner_character_id = ch.id 
        WHERE ch.user_id IS NOT NULL 
        LIMIT 1
      `);
      
      assert.ok(res.rows.length > 0, 'No company/user found in DB to use for smoke test.');
      companyId = res.rows[0].company_id;
      userId = res.rows[0].user_id;

      // Give company plenty of cash
      await client.query("UPDATE company_finances SET available_cash = 50000000 WHERE company_id = $1", [companyId]);

      // Make user admin so process-month works
      await client.query("UPDATE users SET role = 'admin' WHERE id = $1", [userId]);

      // JWT auth
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ 
        id: userId, 
        email: 'test@worldr.game', 
        status: 'verified', 
        verificationLevel: 1,
        role: 'admin' // Added role admin
      }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
      
      api = axios.create({
        baseURL: 'http://localhost:4000/api/v1',
        headers: { Authorization: `Bearer ${token}` }
      });
    });

    // === ACT 1: DESIGN VEHICLE ===
    await t.test('Act 1: Design Vehicle & Assert Stats', async () => {
      // 1. Submit Design
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
      } catch (err) {
        assert.fail(`Design API failed: ${err.response?.data?.error || err.message}`);
      }

      // 2. Assert Persistence
      const modelsRes = await client.query("SELECT * FROM public.manufacturing_vehicle_models WHERE company_id = $1 AND name = $2", [companyId, modelName]);
      assert.strictEqual(modelsRes.rows.length, 1, 'Model should exist in DB');
      const newModel = modelsRes.rows[0];
      modelId = newModel.id;

      assert.ok(newModel.manufacturing_cost_per_unit != null, 'manufacturing_cost_per_unit should not be null');
      assert.ok(!Number.isNaN(Number(newModel.manufacturing_cost_per_unit)), 'manufacturing_cost_per_unit should be a valid number');
      assert.strictEqual(newModel.development_status, 'in_development', 'Status should be in_development');
    });

    // === ACT 2: LAUNCH VEHICLE ===
    await t.test('Act 2: Manually Launch Vehicle', async () => {
      await client.query("UPDATE public.manufacturing_vehicle_models SET development_status = 'launched' WHERE id = $1", [modelId]);
      
      const checkRes = await client.query("SELECT development_status FROM public.manufacturing_vehicle_models WHERE id = $1", [modelId]);
      assert.strictEqual(checkRes.rows[0].development_status, 'launched');
    });

    // === ACT 3: FACTORY & PRODUCTION ===
    await t.test('Act 3: Lease Factory & Set Production Plan', async () => {
      // Find a factory type
      const typeRes = await client.query("SELECT id FROM manufacturing_factory_types WHERE name = 'Compact Factory' OR base_capacity_per_arc = 100 LIMIT 1");
      let typeId = typeRes.rows.length > 0 ? typeRes.rows[0].id : null;
      if (!typeId) {
        // Just grab any factory type if Compact isn't there
        const anyType = await client.query("SELECT id FROM manufacturing_factory_types LIMIT 1");
        typeId = anyType.rows[0].id;
      }
      
      // Lease factory
      try {
        await api.post(`/companies/${companyId}/manufacturing/factories/lease`, {
          factoryTypeId: typeId
        });
      } catch (e) {
        // Might fail if stateId is invalid, let's fix it by pulling a state ID from DB
        const stateRes = await client.query("SELECT id FROM states LIMIT 1");
        // Try without stateId, we saw the controller just needs factoryTypeId
        try {
          await api.post(`/companies/${companyId}/manufacturing/factories/lease`, {
            factoryTypeId: typeId
          });
        } catch(e2) {
          if (e2.response?.data?.code !== 'DUPLICATE') {
            assert.fail(`Lease Factory API failed: ${JSON.stringify(e2.response?.data) || e2.message}`);
          }
        }
      }

      // Get leased factory ID
      const factoryRes = await client.query("SELECT id FROM manufacturing_factories WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1", [companyId]);
      factoryId = factoryRes.rows[0].id;

      // Assign model to line 
      // Need a production line ID. It should be created with the factory.
      const lineRes = await client.query("SELECT id FROM manufacturing_production_lines WHERE factory_id = $1 LIMIT 1", [factoryId]);
      const lineId = lineRes.rows[0].id;

      try {
        await api.post(`/companies/${companyId}/manufacturing/production/save-plan`, {
          lineId: lineId,
          modelId: modelId,
          targetUnitsPerArc: 10,
          qualitySetting: 'Standard'
        });
      } catch (e) {
        assert.fail(`Save Production Plan API failed: ${JSON.stringify(e.response?.data) || e.message}`);
      }
    });

    // === ACT 4: PROCESS ARC ===
    await t.test('Act 4: Process Month', async () => {
      // Give company enough components to manufacture 10 vehicles
      const components = ['comp_engine', 'comp_transmission', 'comp_tyres', 'comp_steel', 'comp_glass', 'comp_electronics'];
      for (const comp of components) {
        await client.query(`
          INSERT INTO manufacturing_component_inventory (world_instance_id, company_id, component_id, units_in_stock)
          VALUES ('pre-alpha-world-1', $1, $2, 100)
          ON CONFLICT (company_id, component_id) DO UPDATE SET units_in_stock = 100
        `, [companyId, comp]);
      }

      // Advance world clock so we can process a new month
      await client.query("UPDATE world_clock SET current_month = current_month + 1");

      // Simulate the admin month processing tick
      try {
        await api.post(`/admin/manufacturing/process-company/${companyId}`);
      } catch(e) {
        assert.fail(`Process Month API failed: ${e.response?.data?.error || e.message}`);
      }
      
      // Verify inventory increased
      const invRes = await client.query("SELECT units_in_stock FROM manufacturing_inventory WHERE company_id = $1 AND vehicle_model_id = $2", [companyId, modelId]);
      assert.ok(invRes.rows.length > 0, 'Inventory row should exist');
      assert.ok(Number(invRes.rows[0].units_in_stock) > 0, 'Inventory quantity should be greater than 0');
    });

    // === NEGATIVE PATHS ===
    await t.test('Negative Paths: Invalid design payload returns 400', async () => {
      try {
        await api.post(`/companies/${companyId}/manufacturing/models`, {
          name: '', // Empty name should fail client side, but we hit API directly
          vehicleClass: 'Compact Car'
          // Missing a bunch of fields
        });
        assert.fail('Should have thrown 400 Bad Request');
      } catch (e) {
        assert.strictEqual(e.response?.status, 400, 'Status should be 400');
        assert.ok(e.response?.data?.error, 'Should return a readable error string');
      }
    });

  } finally {
    await client.end();
  }
});
