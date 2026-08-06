const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db'
  });
  
  try {
    await client.connect();
    
    // Check clock
    const clockRes = await client.query('SELECT * FROM world_clock LIMIT 1');
    console.log('--- CLOCK ---');
    console.log(clockRes.rows[0]);

    // Test running processCountryMonth by hitting the endpoint using fetch? 
    // No, I can just query the companies to see if any have weird data.
    
    // Check if there is an error being thrown in the backend logs?
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
