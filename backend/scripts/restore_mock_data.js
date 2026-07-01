const { db } = require('../src/config/database');
const crypto = require('crypto');

async function restore() {
  const world = await db('world_instances').first();
  const state = await db('states').first();
  const currency = await db('currencies').first();
  const countryId = state.country_id;

  // Check if we have a user
  let user = await db('users').first();
  if (!user) {
    await db('users').insert({ id: 1, email: 'test@worldr.com', password_hash: 'abc' });
    user = { id: 1 };
  }

  // Restore characters
  let char = await db('characters').first();
  if (!char) {
    const charId = crypto.randomUUID();
    await db('characters').insert({
      id: charId,
      user_id: user.id,
      world_instance_id: world.id,
      motherland_country_id: countryId,
      name: 'Player Politician',
      age: 40,
      influence: 0,
      credibility: 0,
      charisma: 0,
      created_at_world_orbit: 1,
      created_at_world_arc: 1,
      created_at_world_mark: 1
    });
    char = { id: charId };
  }

  // Restore companies
  let comp = await db('companies').first();
  if (!comp) {
    const compId = crypto.randomUUID();
    await db('companies').insert({
      id: compId,
      owner_character_id: char.id,
      world_instance_id: world.id,
      country_id: countryId,
      headquarters_state_id: state.id,
      industry_id: 'manufacturing',
      legal_structure_id: 'corporation',
      currency_id: currency.id,
      name: 'Restored Company',
      status: 'active',
      is_npc: false,
      created_at_world_orbit: 1,
      created_at_world_arc: 1,
      created_at_world_mark: 1
    });
  }

  console.log('Restored DB entities.');
  process.exit(0);
}

restore().catch(console.error);
