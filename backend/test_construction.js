const Knex = require('knex');
const knex = Knex({ client: 'pg', connection: 'postgresql://postgres:postgres@localhost:5432/worldr_db' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'secret';

async function main() {
  try {
    // 1. Get a test company and its owner
    const company = await knex('companies').where({ status: 'active', is_npc: false }).first();
    if (!company) throw new Error('No active player company found');
    const character = await knex('characters').where({ id: company.owner_character_id }).first();
    const user = await knex('users').where({ id: character.user_id }).first();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    
    const headers = { Authorization: `Bearer ${token}` };
    const baseURL = `http://localhost:4000/api/v1`;

    console.log(`Using Company: ${company.name} (${company.id})`);

    // Add some cash for testing
    await knex('company_finances').where({ company_id: company.id }).update({ available_cash: 50000000 });

    // 2. Buy a License in a different state (e.g., drennia-ironvale)
    console.log('\n--- Purchasing License ---');
    try {
      const res1 = await axios.post(`${baseURL}/companies/${company.id}/manufacturing/licenses`, {
        targetStateId: 'drennia-ironvale'
      }, { headers });
      console.log('License Success:', res1.data.data.message);
    } catch (err) {
      console.log('License skipped/error:', err.response ? err.response.data : err);
    }

    // 3. Buy Land
    console.log('\n--- Purchasing Land ---');
    const res2 = await axios.post(`${baseURL}/companies/${company.id}/manufacturing/land`, {
      stateId: 'drennia-ironvale',
      acres: 5,
      name: 'Ironvale Test Plot'
    }, { headers });
    console.log('Land Success:', res2.data.data.message);
    const plotId = res2.data.data.plot.id;

    // 4. Construct Factory
    console.log('\n--- Constructing Factory ---');
    const res3 = await axios.post(`${baseURL}/companies/${company.id}/manufacturing/factories/construct`, {
      landPlotId: plotId,
      factoryTypeId: 'small-workshop',
      name: 'Test Workshop'
    }, { headers });
    console.log('Factory Success:', res3.data.data.message);
    const factoryId = res3.data.data.factory.id;

    // Verify factory is under_construction
    const f1 = await knex('manufacturing_factories').where({ id: factoryId }).first();
    console.log(`Factory Status: ${f1.building_status} (completes ${f1.building_completion_year}-${f1.building_completion_month})`);

    // 5. Advance World Clock manually (simulate 5 months)
    console.log('\n--- Fast Forwarding Time (5 months) ---');
    const clock = await knex('world_clock').where({ world_instance_id: company.world_instance_id }).first();
    let newMonth = clock.current_month + 5;
    let newYear = clock.current_year + Math.floor(newMonth / 12);
    newMonth = newMonth % 12;
    if (newMonth === 0) { newMonth = 12; newYear--; }
    
    await knex('world_clock').where({ world_instance_id: company.world_instance_id }).update({
      current_year: newYear,
      current_month: newMonth
    });
    
    // Call the tick process manually to trigger construction check
    const mfg = require('./src/api/controllers/manufacturing.controller.ts'); // Needs ts-node, we'll just run raw knex query to simulate the tick logic for the test
    
    const absCurrentMonth = newYear * 12 + newMonth;
    await knex('manufacturing_factories')
      .where('building_status', 'under_construction')
      .whereRaw('(building_completion_year * 12 + building_completion_month) <= ?', [absCurrentMonth])
      .update({ building_status: 'completed' });

    const f2 = await knex('manufacturing_factories').where({ id: factoryId }).first();
    console.log(`Factory Status after 5 months: ${f2.building_status}`);

    // 6. Construct Production Line
    if (f2.building_status === 'completed') {
      console.log('\n--- Constructing Production Line ---');
      const res4 = await axios.post(`${baseURL}/companies/${company.id}/manufacturing/factories/${factoryId}/production-lines/construct`, {}, { headers });
      console.log('Production Line Success:', res4.data.data.message);
      const lineId = res4.data.data.line.id;
      
      const l1 = await knex('manufacturing_production_lines').where({ id: lineId }).first();
      console.log(`Line Status: ${l1.construction_status} (completes ${l1.construction_completion_year}-${l1.construction_completion_month})`);
    }

  } catch (err) {
    console.error('Test Failed:', err.response ? err.response.data : err);
  } finally {
    knex.destroy();
  }
}

main();
